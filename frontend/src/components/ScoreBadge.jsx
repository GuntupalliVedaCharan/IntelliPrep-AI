export default function ScoreBadge({ score }) {
  if (score == null) return null;

  const num = parseFloat(score);
  let color = 'bg-red-100 text-red-700';
  if (num >= 80) color = 'bg-green-100 text-green-700';
  else if (num >= 60) color = 'bg-yellow-100 text-yellow-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${color}`}>
      {num.toFixed(0)}%
    </span>
  );
}
