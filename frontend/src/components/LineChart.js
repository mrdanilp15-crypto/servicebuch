'use client';

// Leichtgewichtiges SVG-Liniendiagramm ohne externe Abhängigkeit -
// ausreichend für Kilometerstand-Verlauf und Kosten pro Jahr.
export default function LineChart({ points, height = 140, formatY, color = '#2563eb' }) {
  if (!points || points.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">Keine Daten vorhanden.</p>;
  }
  if (points.length === 1) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        {formatY ? formatY(points[0].y) : points[0].y} (nur ein Datenpunkt)
      </p>
    );
  }

  const width = 320;
  const padding = 24;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys) * 1.05 || 1;

  const scaleX = (x) => padding + ((x - minX) / (maxX - minX || 1)) * (width - 2 * padding);
  const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY || 1)) * (height - 2 * padding);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={scaleX(p.x)} cy={scaleY(p.y)} r="3" fill={color} />
      ))}
      <text x={padding} y={height - 6} fontSize="9" fill="#9ca3af">
        {points[0].label}
      </text>
      <text x={width - padding} y={height - 6} fontSize="9" fill="#9ca3af" textAnchor="end">
        {points[points.length - 1].label}
      </text>
    </svg>
  );
}
