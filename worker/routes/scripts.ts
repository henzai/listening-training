import { Hono } from "hono";
import type { Env, Script, Sentence } from "../types";

export const scriptRoutes = new Hono<{ Bindings: Env }>();

scriptRoutes.get("/scripts", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM scripts ORDER BY created_at DESC",
  ).all<Script>();

  return c.json({ scripts: results });
});

scriptRoutes.get("/scripts/:scriptId", async (c) => {
  const scriptId = c.req.param("scriptId");

  const script = await c.env.DB.prepare("SELECT * FROM scripts WHERE id = ?")
    .bind(scriptId)
    .first<Script>();

  if (!script) {
    return c.json({ error: "Script not found" }, 404);
  }

  const { results: sentences } = await c.env.DB.prepare(
    "SELECT * FROM sentences WHERE script_id = ? ORDER BY index_in_script",
  )
    .bind(scriptId)
    .all<Sentence>();

  return c.json({ script, sentences });
});

scriptRoutes.delete("/scripts/:scriptId", async (c) => {
  const scriptId = c.req.param("scriptId");

  // Delete audio files from R2
  const { results: sentences } = await c.env.DB.prepare(
    "SELECT audio_r2_key FROM sentences WHERE script_id = ?",
  )
    .bind(scriptId)
    .all<{ audio_r2_key: string | null }>();

  const deletePromises = sentences
    .filter((s) => s.audio_r2_key)
    .map((s) => c.env.AUDIO_BUCKET.delete(s.audio_r2_key!));

  await Promise.all(deletePromises);

  // Delete from DB (cascades to sentences)
  await c.env.DB.prepare("DELETE FROM scripts WHERE id = ?").bind(scriptId).run();

  return c.json({ ok: true });
});

scriptRoutes.patch("/scripts/:scriptId/progress", async (c) => {
  const scriptId = c.req.param("scriptId");

  await c.env.DB.prepare("UPDATE scripts SET last_practiced_at = datetime('now') WHERE id = ?")
    .bind(scriptId)
    .run();

  return c.json({ ok: true });
});
