import type { Tool, ToolContext } from "./index";
import { resolve } from "path";
import { readFile, writeFile, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";

// ── read_file ─────────────────────────────────────────────────

const readFileTool: Tool = {
  name: "read_file",
  description:
    "Read file contents with line numbers. Use offset/limit for large files.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path (relative or absolute)" },
      offset: { type: "number", description: "Start line (1-based)" },
      limit: { type: "number", description: "Max lines to read" },
    },
    required: ["path"],
  },
  async execute(input, ctx) {
    const fp = resolve(ctx.workDir, input.path);
    const content = await readFile(fp, "utf-8");
    const lines = content.split("\n");
    const off = Math.max(0, (input.offset || 1) - 1);
    const lim = input.limit || lines.length;
    return lines
      .slice(off, off + lim)
      .map((l, i) => `${String(off + i + 1).padStart(6)}\t${l}`)
      .join("\n");
  },
};

// ── write_file ────────────────────────────────────────────────

const writeFileTool: Tool = {
  name: "write_file",
  description: "Create or overwrite a file with given content.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path" },
      content: { type: "string", description: "File content" },
    },
    required: ["path", "content"],
  },
  async execute(input, ctx) {
    const fp = resolve(ctx.workDir, input.path);
    const dir = resolve(fp, "..");
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(fp, input.content, "utf-8");
    return `Written: ${input.path}`;
  },
};

// ── edit_file ─────────────────────────────────────────────────

const editFileTool: Tool = {
  name: "edit_file",
  description:
    "Replace an exact unique string in a file. old_string must match exactly once.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path" },
      old_string: { type: "string", description: "Exact string to find" },
      new_string: { type: "string", description: "Replacement string" },
    },
    required: ["path", "old_string", "new_string"],
  },
  async execute(input, ctx) {
    const fp = resolve(ctx.workDir, input.path);
    const content = await readFile(fp, "utf-8");
    const n = content.split(input.old_string).length - 1;
    if (n === 0) throw new Error(`String not found in ${input.path}`);
    if (n > 1) throw new Error(`${n} occurrences — must be unique in ${input.path}`);
    await writeFile(fp, content.replace(input.old_string, input.new_string), "utf-8");
    return `Edited: ${input.path}`;
  },
};

// ── list_dir ──────────────────────────────────────────────────

const listDirTool: Tool = {
  name: "list_dir",
  description: "List files and directories at a given path.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory path (default: workDir)" },
    },
  },
  async execute(input, ctx) {
    const dir = resolve(ctx.workDir, input.path || ".");
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((e) => `${e.isDirectory() ? "d" : "-"} ${e.name}`)
      .join("\n");
  },
};

// ── bash ──────────────────────────────────────────────────────

const bashTool: Tool = {
  name: "bash",
  description:
    "Execute a shell command. Use for tests, git, install, etc.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Shell command" },
      timeout: { type: "number", description: "Timeout ms (default: 30000)" },
    },
    required: ["command"],
  },
  async execute(input, ctx) {
    const timeout = input.timeout || 30_000;
    const proc = Bun.spawn(["bash", "-c", input.command], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: ctx.workDir,
    });
    const timer = setTimeout(() => proc.kill(), timeout);
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    clearTimeout(timer);

    let out = stdout;
    if (stderr) out += (out ? "\n" : "") + `STDERR: ${stderr}`;
    out += `\nExit code: ${code}`;
    return out;
  },
};

// ── search (grep) ─────────────────────────────────────────────

const searchTool: Tool = {
  name: "search",
  description:
    "Grep for a regex pattern in files. Returns matching lines with paths and line numbers.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regex pattern" },
      path: { type: "string", description: "Directory or file (default: workDir)" },
      include: { type: "string", description: "Glob filter (e.g. '*.ts')" },
    },
    required: ["pattern"],
  },
  async execute(input, ctx) {
    const searchPath = input.path ? resolve(ctx.workDir, input.path) : ctx.workDir;
    const args = ["grep", "-rn", "-E"];
    if (input.include) args.push("--include", input.include);
    args.push(input.pattern, searchPath);

    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", cwd: ctx.workDir });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (code === 1) return "No matches found.";
    if (code !== 0) throw new Error(stderr || `grep exit ${code}`);

    return stdout
      .split("\n")
      .map((l) => (l.startsWith(ctx.workDir) ? l.slice(ctx.workDir.length + 1) : l))
      .join("\n")
      .trim();
  },
};

// ── find_files (glob) ─────────────────────────────────────────

const findFilesTool: Tool = {
  name: "find_files",
  description: "Find files matching a glob pattern.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob (e.g. '**/*.ts')" },
      path: { type: "string", description: "Base directory (default: workDir)" },
    },
    required: ["pattern"],
  },
  async execute(input, ctx) {
    const base = input.path ? resolve(ctx.workDir, input.path) : ctx.workDir;
    const glob = new Bun.Glob(input.pattern);
    const files: string[] = [];
    for await (const f of glob.scan({ cwd: base, dot: false })) {
      files.push(f);
      if (files.length >= 1000) break;
    }
    return files.length ? files.join("\n") : "No files found.";
  },
};

// ── Export all ─────────────────────────────────────────────────

export const codingTools: Tool[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirTool,
  bashTool,
  searchTool,
  findFilesTool,
];
