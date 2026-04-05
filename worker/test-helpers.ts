import { env } from "cloudflare:workers";
import schema from "./db/schema.sql?raw";

const statements = schema
  .split(";")
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter((s) => s.length > 0 && !s.startsWith("PRAGMA"));

export async function applySchema(): Promise<void> {
  await env.DB.batch(statements.map((s) => env.DB.prepare(s)));
}

export async function cleanTables(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sentences"),
    env.DB.prepare("DELETE FROM scripts"),
  ]);
}
