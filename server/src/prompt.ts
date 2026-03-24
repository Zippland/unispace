import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getDir, paths } from "./config";

function identity(): string {
  const dir = getDir();
  return `You are UniSpace, a coding agent with full file system access.
You help users with software engineering tasks: reading, writing, editing code, running commands, and managing tasks.

## Workspace
Your workspace is \`${dir}/\`. All configuration and state lives here:
- \`config.json\`  — Server and model settings (provider, apiKey, baseUrl, temperature, port, workDir).
- \`SOUL.md\`      — Your custom personality and behavior instructions. Read this to understand how the user wants you to act.
- \`skills/\`      — Reusable skill definitions. Each skill is a subdirectory with a \`SKILL.md\` describing when and how to use it.
- \`sessions/\`    — Persisted conversation history (JSONL). Managed automatically, do not edit directly.

## Principles
- Always read a file before editing it.
- Use search / find_files to explore before modifying unfamiliar code.
- Make precise, minimal edits.
- Track complex multi-step work with task_create / task_update.
- Explain changes briefly after making them.

## Tool Call Guidelines
- Before calling tools, you may briefly state your intent, but NEVER predict the result.
- Before modifying a file, read it first.
- Do not assume a file exists — use list_dir or read_file to verify.
- If a tool call fails, analyze the error before retrying.`;
}

function environment(workDir: string): string {
  return `## Environment
- Platform: ${process.platform}
- Working directory: ${workDir}
- Current time: ${new Date().toLocaleString()}`;
}

function soul(): string {
  const p = paths.soul();
  if (!existsSync(p)) return "";
  const c = readFileSync(p, "utf-8").trim();
  return c ? `## Custom Instructions (SOUL.md)\n${c}` : "";
}

function skills(): string {
  const dir = paths.skills();
  if (!existsSync(dir)) return "";

  const items: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const md = join(dir, entry.name, "SKILL.md");
    if (!existsSync(md)) continue;
    const first = readFileSync(md, "utf-8").split("\n")[0].replace(/^#+\s*/, "");
    items.push(`- **${entry.name}**: ${first}  (read ${md} before using)`);
  }

  return items.length ? `## Available Skills\n${items.join("\n")}` : "";
}

export function buildSystemPrompt(workDir: string): string {
  return [identity(), environment(workDir), soul(), skills()]
    .filter(Boolean)
    .join("\n\n");
}
