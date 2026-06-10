import { getStatusTone } from '../lib/utils';

export function Panel({ className = '', children }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="section-heading__action">{action}</div> : null}
    </div>
  );
}

export function MetricCard({ label, value, detail, accent = 'gold' }) {
  return (
    <div className={`metric-card metric-card--${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

export function StatusBadge({ children, tone }) {
  const resolvedTone = tone ?? getStatusTone(String(children));

  return <span className={`status-badge status-badge--${resolvedTone}`}>{children}</span>;
}

export function DataTable({ columns, rows, emptyText = 'No records yet.' }) {
  if (!rows.length) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressBars({ items, formatter }) {
  const highest = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="progress-bars">
      {items.map((item) => (
        <div key={item.label} className="progress-bars__item">
          <div className="progress-bars__meta">
            <span>{item.label}</span>
            <strong>{formatter ? formatter(item.value) : item.value}</strong>
          </div>
          <div className="progress-bars__track">
            <span style={{ width: `${(item.value / highest) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
