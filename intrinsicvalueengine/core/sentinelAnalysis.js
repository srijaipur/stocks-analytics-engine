export function runSentinel(data) {

  let flags = [];

  if (data.fcf < data.netIncome)
    flags.push("FCF lower than earnings");

  if (data.debt > data.cash * 2)
    flags.push("High leverage risk");

  return {
    earningsQuality: (data.fcf / data.netIncome > 0.8) ? 9 : 6,
    flags
  };
}