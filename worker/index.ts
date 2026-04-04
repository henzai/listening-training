import { Hono } from "hono";
import type { Env } from "./types";
import { generateRoutes } from "./routes/generate";
import { scriptRoutes } from "./routes/scripts";
import { audioRoutes } from "./routes/audio";

const app = new Hono<{ Bindings: Env }>();

// Enable foreign keys for D1
app.use("/api/*", async (c, next) => {
  await c.env.DB.exec("PRAGMA foreign_keys = ON");
  await next();
});

app.get("/api/v1/health", (c) => c.json({ ok: true }));

app.route("/api/v1", generateRoutes);
app.route("/api/v1", scriptRoutes);
app.route("/api/v1", audioRoutes);

export default app;
