import { createRequire } from "module";
const require = createRequire(import.meta.url);
const finvizModule = require("@stonksjs/finviz");
const finviz = finvizModule.default;

// Patch the internal axios instance created by @stonksjs/finviz directly.
// axios.defaults on the parent does not propagate to instances created via axios.create().
finviz.api.defaults.headers.common["User-Agent"] =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function getFundamentals(ticker) {
  return await finviz.getQuote(ticker) ;
}
