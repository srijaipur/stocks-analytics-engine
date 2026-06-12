export function runEPV(data) {
  return {
    value: (data.netIncome / data.wacc) / data.shares
  };
}