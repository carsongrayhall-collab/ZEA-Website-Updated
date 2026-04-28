function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = {
    x: x + radius * Math.cos(startAngle),
    y: y + radius * Math.sin(startAngle)
  };
  const end = {
    x: x + radius * Math.cos(endAngle),
    y: y + radius * Math.sin(endAngle)
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function PortfolioDonut({
  labels,
  weights
}: {
  labels: string[];
  weights: number[];
}) {
  const colors = ["#6e1f1b", "#8f655f", "#b18a84", "#7f312d"];
  const total = weights.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
  let angle = -Math.PI / 2;

  return (
    <div className="space-y-8">
      <svg viewBox="0 0 220 220" className="mx-auto w-full max-w-[260px]" aria-label="Portfolio allocation donut chart">
        <circle cx="110" cy="110" r="74" fill="none" stroke="rgba(110,31,27,0.15)" strokeWidth="30" />
        {weights.map((weight, index) => {
          const portion = Math.abs(weight) / total;
          const start = angle;
          const end = angle + portion * Math.PI * 2;
          angle = end;

          return (
            <path
              key={`${labels[index]}-${weight}`}
              d={describeArc(110, 110, 74, start, end)}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="30"
              strokeLinecap="butt"
            />
          );
        })}
      </svg>

      <div className="space-y-4">
        {labels.map((label, index) => (
          <div key={label} className="flex items-center justify-between gap-3 text-base text-text">
            <span className="flex items-center gap-3">
              <span
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              {label}
            </span>
            <span>{(weights[index]! * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
