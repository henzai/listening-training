import { env } from "cloudflare:workers";
import schemaSql from "./db/schema.sql?raw";

export async function applySchema(): Promise<void> {
  await env.DB.exec(schemaSql);
}
