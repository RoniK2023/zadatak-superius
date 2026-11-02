import { cx } from '../../lib/format.js';

/**
 * Responsive data view: a table on desktop (md+), stacked cards on mobile.
 *
 * columns: [{ key, header, render?(row), className?, align?: 'right', mobile?: 'title' | 'meta' | 'hide' }]
 *  - mobile 'title' → bold first line of the card, 'meta' → shown as label: value, 'hide' → desktop only.
 */
export function DataList({ columns, rows, rowKey = (r) => r.id, onRowClick, rowClassName, mobileAside }) {
  const value = (col, row) => (col.render ? col.render(row) : row[col.key]);
  const titleCols = columns.filter((c) => c.mobile === 'title');
  const metaCols = columns.filter((c) => !c.mobile || c.mobile === 'meta');

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-ink-muted">
              {columns.map((col) => (
                <th key={col.key} scope="col" className={cx('px-5 py-3 font-medium', col.align === 'right' && 'text-right', col.headerClassName)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(onRowClick && 'cursor-pointer hover:bg-canvas', rowClassName?.(row))}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cx('px-5 py-3 align-middle', col.align === 'right' && 'text-right tabular', col.className)}>
                    {value(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden">
        {rows.map((row) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 font-medium text-ink">{titleCols.map((c) => <div key={c.key}>{value(c, row)}</div>)}</div>
                {mobileAside && <div className="shrink-0 text-right">{mobileAside(row)}</div>}
              </div>
              {metaCols.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {metaCols.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-xs text-ink-muted">{c.header}</dt>
                      <dd className="truncate text-ink">{value(c, row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );
          return (
            <li key={rowKey(row)} className={rowClassName?.(row)}>
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)} className="block w-full px-4 py-4 text-left hover:bg-canvas">
                  {content}
                </button>
              ) : (
                <div className="px-4 py-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
