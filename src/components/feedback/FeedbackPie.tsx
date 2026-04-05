const FeedbackPie = ({ positive, negative }: { positive: number; negative: number; neutral?: number }) => {
  const total = positive + negative;

  if (total === 0) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#C9CED4" />
      </svg>
    );
  }

  if (total === positive) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#4A846C" />
      </svg>
    );
  }

  if (total === negative) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#c44444" />
      </svg>
    );
  }

  const cx = 14, cy = 14, r = 14;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const point = (angle: number) => ({
    x: cx + r * Math.sin(toRad(angle)),
    y: cy - r * Math.cos(toRad(angle)),
  });

  const negAngle = (negative / total) * 360;
  const posAngle = (positive / total) * 360;

  const slices = [
    { color: "#c44444", start: 0, sweep: negAngle },
    { color: "#4A846C", start: negAngle, sweep: posAngle },
  ].filter(s => s.sweep > 0);

  const arc = (start: number, sweep: number) => {
    const s = point(start);
    const e = point(start + sweep);
    const large = sweep > 180 ? 1 : 0;
    return `M${cx} ${cy} L${s.x} ${s.y} A${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      {slices.map((s, i) => (
        <path key={i} d={arc(s.start, s.sweep)} fill={s.color} />
      ))}
    </svg>
  );
};

export default FeedbackPie;
