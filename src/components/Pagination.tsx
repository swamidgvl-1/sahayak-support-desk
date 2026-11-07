import Link from 'next/link';

export function Pagination({ page, pageSize, total, params, basePath }: {
  page: number; pageSize: number; total: number; params: Record<string, string | undefined>; basePath: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} ticket{total === 1 ? '' : 's'}</p>;
  const href = (p: number) => {
    const n = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== 'page' && n.set(k, v));
    n.set('page', String(p));
    return `${basePath}?${n.toString()}`;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted">{total} tickets · page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link className="btn btn-sm" href={href(page - 1)}>Previous</Link> : <span className="btn btn-sm pointer-events-none opacity-50">Previous</span>}
        {page < pages ? <Link className="btn btn-sm" href={href(page + 1)}>Next</Link> : <span className="btn btn-sm pointer-events-none opacity-50">Next</span>}
      </div>
    </nav>
  );
}
