import { Hono } from "hono";

const app = new Hono();

app.get("/api/v1/health", (c) => c.json({ ok: true }));

export default app;
