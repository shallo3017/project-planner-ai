import bcrypt from 'bcryptjs';
import { AiDocumentModel } from '../models/AiDocument';
import { ProjectModel } from '../models/Project';
import { UserModel } from '../models/User';

const BCRYPT_ROUNDS = 12;

// ── Demo accounts ────────────────────────────────────────────────────────────
// Exactly ONE admin. Passwords are only applied on first insert ($setOnInsert),
// so re-runs never clobber a password you've since changed.
interface SeedUser {
  fullName: string;
  email: string;
  password: string;
  role: 'client' | 'admin' | 'tech';
}

const DEMO_PASSWORD = 'Demo12345';

const SEED_USERS: SeedUser[] = [
  { fullName: 'Platform Admin', email: 'admin@example.com', password: 'Admin@2026', role: 'admin' },
  { fullName: 'Demo Client', email: 'client@example.com', password: DEMO_PASSWORD, role: 'client' },
  { fullName: 'Priya Sharma', email: 'priya@example.com', password: DEMO_PASSWORD, role: 'client' },
  { fullName: 'Tech Reviewer', email: 'tech@example.com', password: DEMO_PASSWORD, role: 'tech' },
];

// ── Demo projects (owned by the client accounts above) ───────────────────────
interface SeedProject {
  ownerEmail: string;
  name: string;
  industry: string;
  description: string;
  budgetRange: string;
  targetCountries: string[];
  status: 'draft' | 'in_review' | 'approved' | 'locked' | 'archived';
}

const SEED_PROJECTS: SeedProject[] = [
  {
    ownerEmail: 'client@example.com',
    name: 'Fintech Onboarding App',
    industry: 'Fintech',
    description: 'KYC-compliant onboarding with tiered identity verification.',
    budgetRange: '$10k–$50k',
    targetCountries: ['IN', 'AE'],
    status: 'in_review',
  },
  {
    ownerEmail: 'client@example.com',
    name: 'Telehealth Booking Platform',
    industry: 'Healthcare',
    description: 'Appointment scheduling with video consults and e-prescriptions.',
    budgetRange: '$50k–$100k',
    targetCountries: ['IN', 'US'],
    status: 'draft',
  },
  {
    ownerEmail: 'priya@example.com',
    name: 'D2C Fashion Storefront',
    industry: 'Retail',
    description: 'Headless commerce store with AI-driven product recommendations.',
    budgetRange: '$10k–$50k',
    targetCountries: ['IN'],
    status: 'approved',
  },
  {
    ownerEmail: 'priya@example.com',
    name: 'Logistics Fleet Tracker',
    industry: 'Logistics',
    description: 'Real-time fleet tracking dashboard with route optimization.',
    budgetRange: '$100k+',
    targetCountries: ['IN', 'SG'],
    status: 'draft',
  },
];

// Projects that get demo PRD + TRD documents (approved, so the tech reviewer
// can download them). Keyed by project name.
const DOCUMENTED_PROJECTS = ['Fintech Onboarding App', 'D2C Fashion Storefront'];

function prdMarkdown(name: string, industry: string, description: string): string {
  return `# Product Requirements Document — ${name}

**Industry:** ${industry}
**Status:** Approved

## 1. Overview
${description}

## 2. Goals
- Deliver a focused MVP that validates the core value proposition.
- Ship an intuitive, accessible experience across web and mobile web.

## 3. Target Users
- Primary: end customers in the ${industry.toLowerCase()} space.
- Secondary: internal operators managing day-to-day workflows.

## 4. Key Features
1. Account creation and secure authentication.
2. Core workflow for the primary user journey.
3. Notifications and status tracking.
4. Admin dashboard for oversight.

## 5. Success Metrics
- Activation rate > 40% within first session.
- < 2% error rate on the critical path.

_Generated demo document — replace once AI generation is live._
`;
}

function trdMarkdown(name: string): string {
  return `# Technical Requirements Document — ${name}

**Status:** Approved

## 1. Architecture
Monorepo: Next.js frontend + Node.js/Express API, MongoDB via Mongoose.

## 2. Tech Stack
- Frontend: Next.js 14, React 18, Tailwind CSS.
- Backend: Node.js 20, Express 4, TypeScript 5.
- Data: MongoDB 7.x (Atlas), Mongoose 8.
- Auth: JWT access token + HTTP-only refresh cookie.

## 3. Data Model
Collections: users, projects, ai_documents (PRD/TRD).

## 4. APIs
REST under \`/api\` — auth, projects, documents, admin.

## 5. Security
- bcrypt (12 rounds) password hashing.
- Role-based access control: client / admin / tech.
- Helmet headers, CORS restricted to the frontend origin.

_Generated demo document — replace once AI generation is live._
`;
}

/**
 * Idempotently seeds demo users + projects + PRD/TRD documents. Safe to run on
 * every dev startup: users upserted by email, projects by (ownerId, name),
 * documents by (projectId, docType) — so nothing duplicates. Dev only.
 */
export async function seedDemoData(): Promise<void> {
  const idByEmail = new Map<string, string>();

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const user = await UserModel.findOneAndUpdate(
      { email: u.email },
      {
        $set: { fullName: u.fullName, role: u.role, isActive: true },
        $setOnInsert: { passwordHash },
      },
      { upsert: true, new: true },
    );
    idByEmail.set(u.email, user.id);
  }

  const idByProjectName = new Map<string, string>();
  for (const p of SEED_PROJECTS) {
    const ownerId = idByEmail.get(p.ownerEmail);
    if (!ownerId) continue;
    const project = await ProjectModel.findOneAndUpdate(
      { ownerId, name: p.name },
      {
        $set: {
          industry: p.industry,
          description: p.description,
          budgetRange: p.budgetRange,
          targetCountries: p.targetCountries,
          status: p.status,
        },
      },
      { upsert: true, new: true },
    );
    idByProjectName.set(p.name, project.id);
  }

  // Seed approved PRD + TRD for the documented projects so the tech reviewer
  // (read-only, approved-only) has something to download.
  for (const p of SEED_PROJECTS) {
    if (!DOCUMENTED_PROJECTS.includes(p.name)) continue;
    const projectId = idByProjectName.get(p.name);
    if (!projectId) continue;

    const docs: { docType: 'prd' | 'trd'; content: string }[] = [
      { docType: 'prd', content: prdMarkdown(p.name, p.industry, p.description) },
      { docType: 'trd', content: trdMarkdown(p.name) },
    ];
    for (const d of docs) {
      await AiDocumentModel.findOneAndUpdate(
        { projectId, docType: d.docType },
        {
          $set: {
            content: d.content,
            isApproved: true,
            generatedBy: 'seed/demo',
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  const [users, projects, admins, documents] = await Promise.all([
    UserModel.countDocuments(),
    ProjectModel.countDocuments(),
    UserModel.countDocuments({ role: 'admin' }),
    AiDocumentModel.countDocuments(),
  ]);
  console.log(
    `🌱 Demo data seeded — users: ${users}, projects: ${projects}, admins: ${admins}, docs: ${documents}`,
  );
  console.log(
    '   Logins: admin@example.com/Admin@2026 · client@example.com/Demo12345 · tech@example.com/Demo12345',
  );
}
