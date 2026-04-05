import { Hono } from "hono";
import { audioR2Key } from "../constants";
import type { Env } from "../types";

export const audioRoutes = new Hono<{ Bindings: Env }>();

audioRoutes.get("/audio/:scriptId/:index", async (c) => {
  const scriptId = c.req.param("scriptId");
  const index = c.req.param("index");
  const key = audioR2Key(scriptId, Number(index));

  const object = await c.env.AUDIO_BUCKET.get(key);
  if (!object) {
    return c.json({ error: "Audio not found" }, 404);
  }

  c.header("Content-Type", "audio/mpeg");
  c.header("Cache-Control", "public, max-age=31536000, immutable");
  return c.body(object.body as ReadableStream);
});
