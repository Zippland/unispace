import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { getDir, paths } from "./config";

function identity(): string {
  const dir = getDir();
  return `# IDENTITY -- Who am I?
- **Name:** Unispace
- **Role:** 基于工作空间的用户的个人助手
- **Creator:** Zylan
- **Vibe:** 深思熟虑，真实坦诚，细节敏感
- **Emoji:** 🪐

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

/** Parse YAML front matter from SKILL.md */
function parseFrontMatter(content: string): { name?: string; description?: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      meta[key] = val;
    }
  }
  return { name: meta.name, description: meta.description, body: match[2] };
}

function skills(): string {
  const dir = paths.skills();
  if (!existsSync(dir)) return "";

  const entries: { name: string; description: string; path: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const mdPath = join(dir, entry.name, "SKILL.md");
    if (!existsSync(mdPath)) continue;

    const content = readFileSync(mdPath, "utf-8");
    const fm = parseFrontMatter(content);
    const name = fm.name || entry.name;
    const description = fm.description || content.split("\n")[0].replace(/^#+\s*/, "") || name;

    entries.push({ name, description, path: mdPath });
  }

  if (entries.length === 0) return "";

  const skillTags = entries
    .map((s) => `  <skill name="${s.name}" path="${s.path}">\n    ${s.description}\n  </skill>`)
    .join("\n\n");

  return `<skills>

The following skills extend your capabilities.
Each skill has a SKILL.md file that contains detailed instructions, examples, and best practices.

## MANDATORY Skill Lookup Rule
Before starting ANY task related to a skill, you MUST:
1. Check the skill list below to determine if the user's request matches any skill's description.
2. If a match is found, read the corresponding SKILL.md file using read_file as your FIRST action, BEFORE making any other tool calls.
3. Follow the instructions in SKILL.md precisely.
Skipping this step may lead to incorrect tool usage and wrong results.

${skillTags}

</skills>`;
}

export function buildSystemPrompt(workDir: string): string {
  return [identity(), environment(workDir), soul(), skills()]
    .filter(Boolean)
    .join("\n\n");
}
