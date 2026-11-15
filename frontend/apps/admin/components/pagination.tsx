"use client";

export function Pagination({ page, size, total, onChange }: { page: number; size: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="ui-button secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages} · {total} total</span>
      <button type="button" className="ui-button secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
