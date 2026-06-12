export function runDCF(data) {

  let fcf = data.fcf;
  let g = Math.min(data.growth, 0.2);
  let wacc = Math.max(data.wacc, 0.08);

  let sum = 0;

  for (let i = 1; i <= 5; i++) {
    fcf *= 1 + g;
    sum += fcf / Math.pow(1 + wacc, i);
  }

  const tv = (fcf * 1.03) / (wacc - 0.03);

  return {
    value: (sum + tv / Math.pow(1 + wacc, 5)) / data.shares
  };
}