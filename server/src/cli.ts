#!/usr/bin/env bun

import { resolve, join } from "path";
import {
  ensureInit,
  loadConfig,
  saveConfig,
  paths,
  getDir,
  listProjects,
  projectExists,
  cloneProject,
} from "./config";
import { loadAllSessions } from "./session";
import { createServer } from "./server";

const REPO_ROOT = resolve(import.meta.dir, "..", "..");
const command = process.argv[2];
const subcommand = process.argv[3];

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
  case "project":
    projectCmd();
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
  console.log(`  Current ANTHROPIC_API_KEY: ${maskedKey}`);
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

  console.log(`\n  Workspace       : ${getDir()}`);
  console.log(`  Current project : ${config.currentProject}`);
  console.log(`  Project path    : ${paths.project(config.currentProject)}`);
  console.log(`\n  Run \`unispace\` to launch.\n`);
}

// ── start (server only) ──────────────────────────────────────

async function start() {
  console.log("\n  UniSpace (server)");
  ensureInit();

  const config = loadConfig();
  if (!config.model.apiKey) {
    console.error(
      `\n  No ANTHROPIC_API_KEY. Run \`unispace onboard\` or edit ${paths.config()}\n`,
    );
    process.exit(1);
  }

  loadAllSessions();

  const port = config.server.port;
  const app = createServer(config);
  Bun.serve({ port, fetch: app.fetch });

  console.log(`  Workspace       : ${getDir()}`);
  console.log(`  Current project : ${config.currentProject}`);
  console.log(`  Listen          : http://localhost:${port}\n`);
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

// ── launch (server + web) ────────────────────────────────────

async function launch(devMode: boolean) {
  console.log(`\n  UniSpace${devMode ? " [dev]" : ""}`);
  ensureInit();

  const config = loadConfig();
  if (!config.model.apiKey) {
    console.error(
      `\n  No ANTHROPIC_API_KEY. Run \`unispace onboard\` or edit ${paths.config()}\n`,
    );
    process.exit(1);
  }

  loadAllSessions();

  const port = config.server.port;
  const app = createServer(config);
  Bun.serve({ port, fetch: app.fetch });

  console.log(`  Workspace       : ${getDir()}`);
  console.log(`  Current project : ${config.currentProject}`);
  console.log(`  API             : http://localhost:${port}`);

  const webDir = join(REPO_ROOT, "web");
  const env = { ...process.env, ...(devMode ? { VITE_DEV_MODE: "true" } : {}) };
  const vite = Bun.spawn(["bunx", "vite", "--port", "5174"], {
    cwd: webDir,
    env,
    stdio: ["inherit", "inherit", "inherit"],
  });

  console.log(`  Web             : http://localhost:5174${devMode ? " (dev mode)" : ""}\n`);

  process.on("SIGINT", () => {
    vite.kill();
    process.exit(0);
  });
}

// ── project commands ─────────────────────────────────────────

function projectCmd() {
  ensureInit();

  switch (subcommand) {
    case "list": {
      const cfg = loadConfig();
      console.log("\n  Projects:\n");
      for (const p of listProjects()) {
        const marker = p.name === cfg.currentProject ? "*" : " ";
        console.log(`  ${marker} ${p.name}`);
      }
      console.log();
      break;
    }

    case "clone": {
      const from = process.argv[4];
      const to = process.argv[5];
      if (!from || !to) {
        console.error("  Usage: unispace project clone <from> <to>");
        process.exit(1);
      }
      try {
        cloneProject(from, to);
        console.log(`  Cloned ${from} → ${to}`);
      } catch (e: any) {
        console.error(`  ${e.message}`);
        process.exit(1);
      }
      break;
    }

    case "use": {
      const name = process.argv[4];
      if (!name) {
        console.error("  Usage: unispace project use <name>");
        process.exit(1);
      }
      if (!projectExists(name)) {
        console.error(`  Project not found: ${name}`);
        process.exit(1);
      }
      const cfg = loadConfig();
      cfg.currentProject = name;
      saveConfig(cfg);
      console.log(`  Current project → ${name}`);
      break;
    }

    default:
      console.log(`
  Usage:
    unispace project list
    unispace project clone <from> <to>
    unispace project use <name>
`);
  }
}

// ── help ──────────────────────────────────────────────────────

function help() {
  console.log(`
  UniSpace — Browser-native Claude Code for projects

  Usage:
    unispace                       Start server + web UI (default)
    unispace dev                   Start with dev panel
    unispace start                 API server only
    unispace web                   Web UI only
    unispace onboard               Interactive setup

  Projects:
    unispace project list          List all projects
    unispace project clone <a> <b> Copy project <a> to new project <b>
    unispace project use <name>    Set current project

  The workspace lives at ~/.unispace/ (override with UNISPACE_DIR env var).
  Projects live at ~/.unispace/projects/<name>/.
`);
}
