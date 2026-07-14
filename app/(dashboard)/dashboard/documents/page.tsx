'use client';

import { Download, Eye, FileText } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DocStatusPill } from '@/components/status-pill';
import { apiDownload, apiFetch } from '@/lib/api';

interface ProjectRef {
  id: string;
  name: string;
  status: string;
}
interface MyDoc {
  id: string;
  docType: 'prd' | 'trd';
  isApproved: boolean;
  version: number;
  updatedAt: string;
  projectId: ProjectRef | string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<MyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ documents: MyDoc[] }>('/documents');
      setDocs(data.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(projectId: string, docType: 'prd' | 'trd') {
    try {
      await apiDownload(`/documents/${projectId}/${docType}/download`, `${docType}.md`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }

  return (
    <main className="px-6 py-12 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Documents</h1>
      <p className="mt-1 text-slate-600">Every PRD and TRD across your projects.</p>

      {error && (
        <div className="card mt-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="card mt-8 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton h-6 w-14 rounded-md" />
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-4 w-8" />
                <div className="skeleton h-7 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="grid place-items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">No documents yet — generate some from a project.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => {
                const project = typeof d.projectId === 'object' ? d.projectId : null;
                const pid = project?.id ?? (typeof d.projectId === 'string' ? d.projectId : '');
                return (
                  <tr key={d.id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {project ? (
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="hover:text-indigo-700"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">
                        <FileText className="h-3.5 w-3.5 text-indigo-600" />
                        {d.docType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <DocStatusPill approved={d.isApproved} />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-slate-500">v{d.version}</td>
                    <td className="px-5 py-3">
                      {/* Actions stay quiet until the row is hovered (and remain
                          reachable by keyboard via focus-within). */}
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <Link
                          href={`/documents/${pid}`}
                          title="View"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                        >
                          <Eye className="h-4 w-4" /> View
                        </Link>
                        <button
                          onClick={() => download(pid, d.docType)}
                          title="Download"
                          aria-label={`Download ${d.docType.toUpperCase()}`}
                          className="inline-flex items-center rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
