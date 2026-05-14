export function weightedScore(level, trend, w = 0.6) {
  return w * level + (1 - w) * trend;
}
