const FeedbackPie = ({ positive, negative }: { positive: number; negative: number }) => {
  const total = positive + negative;
  if (total === 0) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#C9CED4" />
      </svg>
    );
  }

  if (negative === 0) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#5E9E82" />
      </svg>
    );
  }

  if (positive === 0) {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="14" fill="#A63333" />
      </svg>
    );
  }

  const positiveAngle = (positive / total) * 360;
  const rad = (positiveAngle * Math.PI) / 180;
  const x = 14 + 14 * Math.sin(rad);
  const y = 14 - 14 * Math.cos(rad);
  const largeArc = positiveAngle > 180 ? 1 : 0;

  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="14" fill="#A63333" />
      <path
        d={`M14 14 L14 0 A14 14 0 ${largeArc} 1 ${x} ${y} Z`}
        fill="#5E9E82"
      />
    </svg>
  );
};

export default FeedbackPie;
