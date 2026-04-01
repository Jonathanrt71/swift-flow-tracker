const FeedbackPie = ({ positive, negative, neutral = 0 }: { positive: number; negative: number; neutral?: number }) => {
  const total = positive + negative + neutral;

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
        <circle cx="14" cy="14" r="14" fill="#52657A" />
      </svg>
    );
  }

  if (total === negative) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#D4A017" />
      </svg>
    );
  }

  if (total === neutral) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#4A846C" />
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
  const neuAngle = (neutral / total) * 360;
  const posAngle = (positive / total) * 360;

  const slices = [
    { color: "#D4A017", start: 0, sweep: negAngle },
    { color: "#4A846C", start: negAngle, sweep: neuAngle },
    { color: "#52657A", start: negAngle + neuAngle, sweep: posAngle },
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
