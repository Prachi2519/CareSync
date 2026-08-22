const baseUrl = (process.env.APP_URL || "http://caresync:3000").replace(/\/$/, "");
const interval = Math.max(30_000, Number(process.env.CRON_INTERVAL_MS || 300_000));
const endpoint = `${baseUrl}/api/cron/process`;

async function processJobs() {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: process.env.CRON_SECRET
        ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
        : {},
    });
    const result = await response.text();
    if (!response.ok) throw new Error(`Worker request failed (${response.status}): ${result.slice(0, 240)}`);
    console.info(`[notification-worker] ${new Date().toISOString()} ${result}`);
  } catch (error) {
    console.error(`[notification-worker] ${new Date().toISOString()} ${error instanceof Error ? error.message : "Unknown worker error"}`);
  } finally {
    setTimeout(processJobs, interval);
  }
}

console.info(`[notification-worker] Starting with a ${Math.round(interval / 1000)} second interval`);
setTimeout(processJobs, 8_000);
