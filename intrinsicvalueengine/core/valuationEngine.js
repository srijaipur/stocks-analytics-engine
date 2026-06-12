import { runDCF } from "./dcfModel.js";
import { runEPV } from "./epvModel.js";
import { runRelative } from "./relativeModel.js";
import { runSentinel } from "./sentinelAnalysis.js";
import { runConfidence } from "./confidenceEngine.js";

export function calculateIntrinsicValue(data) {

  const dcf = runDCF(data);
  const epv = runEPV(data);
  const relative = runRelative(data);

  const values = [dcf.value, epv.value, relative.value];

  const intrinsic = {
    low: Math.min(...values),
    high: Math.max(...values),
    avg: weighted(values)
  };

  const mos = (intrinsic.avg - data.price) / intrinsic.avg;

  return {
    intrinsic,
    mos,
    price: data.price,
    recommendation: getRec(mos),
    models: { dcf, epv, relative },
    sentinel: runSentinel(data),
    confidence: runConfidence(data, values),
    flags: runSentinel(data).flags
  };
}

function weighted(vals) {
  return vals[0]*0.5 + vals[1]*0.3 + vals[2]*0.2;
}

function getRec(mos) {
  if (mos > 0.3) return "STRONG BUY";
  if (mos > 0.15) return "BUY";
  if (mos > 0) return "HOLD";
  return "AVOID";
}