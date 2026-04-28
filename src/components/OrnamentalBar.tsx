export function OrnamentalBar({
  index = 0,
  total = 1,
  className = ""
}: {
  index?: number;
  total?: number;
  className?: string;
}) {
  const width = total > 0 ? `${100 / total}%` : "100%";
  const left = total > 1 ? `${(index / (total - 1)) * (100 - 100 / total)}%` : "0%";

  return (
    <div className={`ornamental-track ${className}`}>
      <span className="ornamental-pill" style={{ width, left }} />
    </div>
  );
}
