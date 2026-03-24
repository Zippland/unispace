import { resolve } from "path";
import { ensureInit, loadConfig, getDir } from "./config";
import { loadAllSessions } from "./session";
import { createServer } from "./server";

// ── Onboard ───────────────────────────────────────────────────

console.log("\n  UniSpace");
ensureInit();

// ── Config ────────────────────────────────────────────────────

const config = loadConfig();

if (!config.model.apiKey) {
  console.error(
    `\n  No API key. Edit ${getDir()}/config.json → model.apiKey\n`,
  );
  process.exit(1);
}

// ── Sessions ──────────────────────────────────────────────────

loadAllSessions();

// ── Start ─────────────────────────────────────────────────────

const workDir = resolve(process.argv[2] || config.server.workDir || getDir());
const port = config.server.port;

const app = createServer(config, workDir);
Bun.serve({ port, fetch: app.fetch });

console.log(`  Config   : ${getDir()}`);
console.log(`  Work dir : ${workDir}`);
console.log(`  Listen   : http://localhost:${port}\n`);
