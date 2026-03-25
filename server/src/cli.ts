#!/usr/bin/env bun

import { resolve, join } from "path";
import { type Config, ensureInit, loadConfig, saveConfig, loadChannelsConfig, getDir, paths } from "./config";
import { loadAllSessions } from "./session";
import { createServer } from "./server";
import { ChannelManager } from "./channels";
import { createRegistry } from "./tools";

const REPO_ROOT = resolve(import.meta.dir, "..", "..");
const command = process.argv[2];

switch (command) {
  case "onboard":
    onboard();
    break;
  case "start":
    start();
    break;
  case "web":
    web();
    break;
  case "dev":
    launch(true);
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  case undefined:
    launch(false);
    break;
  default:
    console.error(`  Unknown command: ${command}`);
    help();
    process.exit(1);
}

// ── onboard ───────────────────────────────────────────────────

function onboard() {
  console.log("\n  UniSpace — Workspace Setup\n");

  ensureInit();
  const config = loadConfig();
  let changed = false;

  const currentKey = config.model.apiKey;
  const maskedKey = currentKey
    ? `${currentKey.slice(0, 4)}...${currentKey.slice(-4)}`
    : "(not set)";
  console.log(`  Current API key: ${maskedKey}`);
  const newKey = prompt("  Enter API key (press Enter to keep current):");
  if (newKey && newKey.trim()) {
    config.model.apiKey = newKey.trim();
    changed = true;
  }

  console.log(`  Current model: ${config.model.name}`);
  const newModel = prompt("  Enter model name (press Enter to keep current):");
  if (newModel && newModel.trim()) {
    config.model.name = newModel.trim();
    changed = true;
  }

  console.log(`  Current base URL: ${config.model.baseUrl}`);
  const newUrl = prompt("  Enter base URL (press Enter to keep current):");
  if (newUrl && newUrl.trim()) {
    config.model.baseUrl = newUrl.trim();
    changed = true;
  }

  console.log(`  Current port: ${config.server.port}`);
  const newPort = prompt("  Enter port (press Enter to keep current):");
  if (newPort && newPort.trim()) {
    config.server.port = parseInt(newPort.trim()) || config.server.port;
    changed = true;
  }

  if (changed) {
    saveConfig(config);
    console.log(`\n  Config saved to ${paths.config()}`);
  }

  console.log(`\n  Workspace: ${getDir()}`);
  console.log(`  Config:    ${paths.config()}`);
  console.log(`  SOUL.md:   ${paths.soul()}`);
  console.log(`  Skills:    ${paths.skills()}`);
  console.log(`  Sessions:  ${paths.sessions()}`);
  console.log(`\n  Run \`unispace\` to launch.\n`);
}

// ── start (server only) ──────────────────────────────────────

async function start() {
  console.log("\n  UniSpace (server)");
  ensureInit();

  const config = loadConfig();
  if (!config.model.apiKey) {
    console.error(
      `\n  No API key. Run \`unispace onboard\` or edit ${getDir()}/config.json\n`,
    );
    process.exit(1);
  }

  loadAllSessions();

  const workDir = resolve(
    process.argv[3] || config.server.workDir || getDir(),
  );
  const port = config.server.port;

  const app = createServer(config, workDir);
  Bun.serve({ port, fetch: app.fetch });

  console.log(`  Config   : ${getDir()}`);
  console.log(`  Work dir : ${workDir}`);
  console.log(`  Listen   : http://localhost:${port}`);

  // Start channels
  await startChannels(config, workDir);
  console.log();
}

// ── web (frontend only) ──────────────────────────────────────

function web() {
  const webDir = join(REPO_ROOT, "web");
  console.log("\n  UniSpace (web)\n");

  const proc = Bun.spawn(["bunx", "vite"], {
    cwd: webDir,
    stdio: ["inherit", "inherit", "inherit"],
  });

  process.on("SIGINT", () => {
    proc.kill();
    process.exit(0);
  });
}

// ── launch (server + web, with optional dev mode) ─────────────

async function launch(devMode: boolean) {
  console.log(`\n  UniSpace${devMode ? " [dev]" : ""}`);
  ensureInit();

  const config = loadConfig();
  if (!config.model.apiKey) {
    console.error(
      `\n  No API key. Run \`unispace onboard\` or edit ${getDir()}/config.json\n`,
    );
    process.exit(1);
  }

  loadAllSessions();

  const workDir = resolve(
    process.argv[3] || config.server.workDir || getDir(),
  );
  const port = config.server.port;

  const app = createServer(config, workDir);
  Bun.serve({ port, fetch: app.fetch });

  console.log(`  Config   : ${getDir()}`);
  console.log(`  Work dir : ${workDir}`);
  console.log(`  API      : http://localhost:${port}`);

  // Start channels
  await startChannels(config, workDir);

  // Start Vite with VITE_DEV_MODE env for dev panel
  const webDir = join(REPO_ROOT, "web");
  const env = { ...process.env, ...(devMode ? { VITE_DEV_MODE: "true" } : {}) };
  const vite = Bun.spawn(["bunx", "vite", "--port", "5173"], {
    cwd: webDir,
    env,
    stdio: ["inherit", "inherit", "inherit"],
  });

  console.log(`  Web      : http://localhost:5173${devMode ? " (dev mode)" : ""}\n`);

  process.on("SIGINT", () => {
    vite.kill();
    process.exit(0);
  });
}

// ── channels ─────────────────────────────────────────────────

async function startChannels(config: Config, workDir: string) {
  const channelsConfig = loadChannelsConfig();
  const hasEnabled = Object.values(channelsConfig).some(
    (c: any) => c?.enabled,
  );
  if (!hasEnabled) return;

  const registry = createRegistry();
  const manager = new ChannelManager(config, registry, workDir);
  manager.init(channelsConfig);
  await manager.startAll();

  process.on("SIGINT", async () => {
    await manager.stopAll();
  });
}

// ── help ──────────────────────────────────────────────────────

function help() {
  console.log(`
  UniSpace — Local coding agent

  Usage:
    unispace                Start server + web UI (default)
    unispace dev            Start with dev panel (system prompt & tools inspector)
    unispace start          API server only
    unispace web            Web UI only
    unispace onboard        Interactive workspace setup
    unispace help           Show this message

  The workspace lives at ~/.unispace/ (override with UNISPACE_DIR env var).
`);
}
