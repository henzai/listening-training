// Suppress known @cloudflare/vitest-pool-workers unhandled rejection
// when the worker exports a Hono app instead of a WorkerEntrypoint subclass.
addEventListener("unhandledrejection", (event) => {
  if (event.reason instanceof TypeError && event.reason.message.includes("WorkerEntrypoint")) {
    event.preventDefault();
  }
});
