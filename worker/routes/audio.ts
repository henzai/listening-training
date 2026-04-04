import { Hono } from "hono";
import type { Env } from "../types";

export const audioRoutes = new Hono<{ Bindings: Env }>();

audioRoutes.get("/audio/:scriptId/:index", async (c) => {
  const scriptId = c.req.param("scriptId");
  const index = c.req.param("index");
  const key = `audio/${scriptId}/${index}.mp3`;

  const object = await c.env.AUDIO_BUCKET.get(key);
  if (!object) {
    return c.json({ error: "Audio not found" }, 404);
  }

  c.header("Content-Type", "audio/mpeg");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(object.body as ReadableStream);
});
