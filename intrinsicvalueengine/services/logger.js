export const logger = {
  logs: [],

  info(msg) { this.logs.push(`[INFO] ${msg}`); },
  warn(msg) { this.logs.push(`[WARN] ${msg}`); },
  error(msg) { this.logs.push(`[ERROR] ${msg}`); },

  clear() { this.logs = []; }
};

export function renderLogs() {
  document.getElementById("logs").innerHTML =
    logger.logs.map(l => `<div>${l}</div>`).join("");
}