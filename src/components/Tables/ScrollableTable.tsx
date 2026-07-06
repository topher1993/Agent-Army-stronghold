
import type { ReactNode } from 'react';
export function ScrollableTable({ columns, rows, caption, getRowId, maxHeight = '320px', emptyState, footer }: { columns: Array<{ key: string; header: string; width?: string; align?: 'left' | 'right' | 'center'; render?: (row: Record<string, unknown>) => ReactNode }>; rows: Array<Record<string, unknown>>; caption?: string; getRowId?: (row: Record<string, unknown>) => string; maxHeight?: string; emptyState?: ReactNode; footer?: ReactNode }) {
  if (!rows.length && emptyState) return <>{emptyState}</>;
  return <div className="scrollableTableWrap" style={{ maxHeight }}><table className="scrollableTable">{caption ? <caption>{caption}</caption> : null}<thead><tr>{columns.map(c => <th key={c.key} style={{ width: c.width, textAlign: c.align }}>{c.header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={getRowId?.(row) || String(i)}>{columns.map(c => <td key={c.key} style={{ textAlign: c.align }}>{c.render ? c.render(row) : String(row[c.key] ?? '')}</td>)}</tr>)}</tbody>{footer ? <tfoot><tr><td colSpan={columns.length}>{footer}</td></tr></tfoot> : null}</table></div>;
}
