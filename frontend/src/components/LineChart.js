'use client';

// Leichtgewichtiges SVG-Liniendiagramm ohne externe Abhängigkeit -
// ausreichend für Kilometerstand-Verlauf und Kosten pro Jahr.
//  - zeroBased: Y-Achse beginnt bei 0 (Kosten). Für Kilometerstände false:
//    dort liegen alle Werte bei z.B. 199.000-200.000 km, mit Nulllinie wäre
//    die Kurve eine unsichtbare Linie am oberen Rand.
//  - Liegen alle Punkte am selben Tag (z.B. Startwert + Korrektur), werden sie
//    gleichmäßig nebeneinander verteilt statt exakt übereinander.
export default function LineChart({ points, height = 150, formatY, color = '#2563eb', zeroBased = true }) {
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
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 22;
  const fmt = (y) => (formatY ? formatY(y) : String(y));

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const sameX = maxX === minX;

  const ys = points.map((p) => p.y);
  let minY = zeroBased ? Math.min(...ys, 0) : Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxY === minY) {
    minY -= 1;
    maxY += 1;
  } else if (!zeroBased) {
    const span = maxY - minY;
    minY -= span * 0.1;
    maxY += span * 0.1;
  } else {
    maxY *= 1.05;
  }

  const scaleX = (x, i) =>
    padL + (sameX ? i / (points.length - 1) : (x - minX) / (maxX - minX)) * (width - padL - padR);
  const scaleY = (y) => height - padB - ((y - minY) / (maxY - minY)) * (height - padT - padB);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x, i)} ${scaleY(p.y)}`).join(' ');
  const hi = Math.max(...ys);
  const lo = Math.min(...ys);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Verlauf">
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#e5e7eb" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={scaleX(p.x, i)} cy={scaleY(p.y)} r="3" fill={color} />
      ))}
      <text x={padL} y={11} fontSize="9" fill="#6b7280">
        {`max ${fmt(hi)}`}
      </text>
      {lo !== hi && (
        <text x={width - padR} y={11} fontSize="9" fill="#6b7280" textAnchor="end">
          {`min ${fmt(lo)}`}
        </text>
      )}
      <text x={padL} y={height - 6} fontSize="9" fill="#9ca3af">
        {points[0].label}
      </text>
      <text x={width - padR} y={height - 6} fontSize="9" fill="#9ca3af" textAnchor="end">
        {points[points.length - 1].label}
      </text>
    </svg>
  );
}
