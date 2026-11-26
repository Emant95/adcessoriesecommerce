import { useState } from 'react';
import { useFetch } from '../../lib/useFetch.js';
import { dateTime } from '../../lib/format.js';
import Pagination from '../../components/Pagination.jsx';
import { Skeleton, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(`/api/admin/audit?page=${page}`);
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what, and when" />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-64" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-taupe"><tr><th className="p-4">When</th><th className="p-4">Who</th><th className="p-4">Action</th><th className="p-4">Item</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap p-4 text-taupe">{dateTime(a.createdAt)}</td>
                  <td className="p-4">{a.actor?.name || 'System'}</td>
                  <td className="p-4">{a.action.replace(/_/g, ' ')}</td>
                  <td className="p-4 text-taupe">{a.entity}{a.entityId ? ` #${a.entityId}` : ''}{a.details?.name ? ` · ${a.details.name}` : a.details?.sku ? ` · ${a.details.sku}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
