/**
 * Document-quality eval.
 *
 *   npm run eval                  # use the AI_REFINE setting from .env.local
 *   npm run eval -- --refine      # force the critic → revise pass ON
 *   npm run eval -- --no-refine   # force it OFF (the baseline)
 *   npm run eval -- --docs prd,trd --limit 4
 *
 * Generates each fixture brief, scores it with an independent judge, and prints
 * per-dimension averages. Run it before and after any prompt/model change: if the
 * number doesn't move, the change didn't do anything.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DocType } from '@/server/models/AiDocument';
import { generateDoc } from '@/server/services/ai.service';
import { BRIEFS } from './briefs';
import { DIMENSIONS, judge, type Score } from './judge';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const refine = flag('refine') ? true : flag('no-refine') ? false : undefined;
const docTypes = (value('docs')?.split(',') ?? ['prd', 'trd']) as DocType[];
const limit = Number(value('limit') ?? BRIEFS.length);
const CONCURRENCY = 3; // keep well under Groq's rate limit

interface Row {
  brief: string;
  docType: DocType;
  score: Score;
  tokens: number;
  ms: number;
}

async function evaluateOne(brief: (typeof BRIEFS)[number], docType: DocType): Promise<Row> {
  const started = Date.now();
  const doc = await generateDoc(docType, brief, { refine });
  const score = await judge(docType, doc.content, brief);
  return {
    brief: brief.name,
    docType,
    score,
    tokens: doc.tokensUsed,
    ms: Date.now() - started,
  };
}

/** Run tasks with a small concurrency cap so we don't trip rate limits. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

async function main() {
  const briefs = BRIEFS.slice(0, limit);
  const tasks = briefs.flatMap((b) => docTypes.map((d) => ({ brief: b, docType: d })));

  const mode = refine === undefined ? 'env default' : refine ? 'critic ON' : 'critic OFF (baseline)';
  console.log(
    `\nEvaluating ${briefs.length} briefs × ${docTypes.join(', ')} = ${tasks.length} documents  [${mode}]\n`,
  );

  const started = Date.now();
  let done = 0;
  const rows = await pool(tasks, CONCURRENCY, async (t) => {
    const row = await evaluateOne(t.brief, t.docType).catch((err) => {
      console.error(`  ✗ ${t.brief} / ${t.docType}: ${err.message}`);
      return null;
    });
    done++;
    if (row) {
      console.log(
        `  ${String(done).padStart(2)}/${tasks.length}  ${row.brief.padEnd(16)} ${row.docType.toUpperCase().padEnd(4)}  ${row.score.overall.toFixed(2)}/5  (${(row.ms / 1000).toFixed(1)}s)`,
      );
    }
    return row;
  });

  const ok = rows.filter((r): r is Row => r !== null);
  if (ok.length === 0) {
    console.error('\nNo documents were scored.');
    process.exit(1);
  }

  const avg = (pick: (r: Row) => number) => ok.reduce((s, r) => s + pick(r), 0) / ok.length;

  console.log('\n── Averages ─────────────────────────────');
  for (const d of DIMENSIONS) {
    const v = avg((r) => r.score[d]);
    const bar = '█'.repeat(Math.round(v * 4)).padEnd(20, '·');
    console.log(`  ${d.padEnd(14)} ${bar} ${v.toFixed(2)}/5`);
  }
  console.log('  ' + '─'.repeat(38));
  console.log(`  OVERALL        ${avg((r) => r.score.overall).toFixed(2)}/5`);
  console.log(
    `\n  tokens/doc ${Math.round(avg((r) => r.tokens))}   ·   ${(avg((r) => r.ms) / 1000).toFixed(1)}s/doc   ·   total ${((Date.now() - started) / 1000).toFixed(0)}s`,
  );

  // Weakest documents are where the next prompt fix should aim.
  const worst = [...ok].sort((a, b) => a.score.overall - b.score.overall).slice(0, 3);
  console.log('\n── Weakest ──────────────────────────────');
  for (const r of worst) {
    console.log(`  ${r.score.overall.toFixed(2)}  ${r.brief} / ${r.docType.toUpperCase()}`);
    if (r.score.notes) console.log(`        ↳ ${r.score.notes}`);
  }

  const dir = join(process.cwd(), 'evals', 'reports');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${refine === false ? 'baseline' : 'refine'}.json`);
  writeFileSync(file, JSON.stringify({ mode, docTypes, rows: ok }, null, 2));
  console.log(`\nReport → ${file}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
