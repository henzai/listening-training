import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "./index";
import { applySchema, cleanTables } from "./test-helpers";

describe("GET /api/v1/health", () => {
  beforeAll(async () => {
    await applySchema();
  });

  beforeEach(async () => {
    await cleanTables();
  });

  it("returns { ok: true }", async () => {
    const res = await app.request("/api/v1/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
