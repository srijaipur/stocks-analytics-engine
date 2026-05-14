export function percentileRank(value, values) {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted.filter((v) => v <= value).length / sorted.length) * 100;
}
