import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../index";
import { applySchema, cleanTables } from "../test-helpers";

describe("audio routes", () => {
  beforeAll(async () => {
    await applySchema();
  });

  beforeEach(async () => {
    await cleanTables();
  });

  describe("GET /api/v1/audio/:scriptId/:index", () => {
    it("returns 404 when audio not found in R2", async () => {
      const res = await app.request("/api/v1/audio/nonexistent/0", {}, env);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Audio not found" });
    });

    it("returns audio with correct headers when R2 object exists", async () => {
      const testData = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
      await env.AUDIO_BUCKET.put("audio/test-script/0.mp3", testData);

      const res = await app.request("/api/v1/audio/test-script/0", {}, env);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");

      const body = new Uint8Array(await res.arrayBuffer());
      expect(body).toEqual(testData);
    });
  });
});
