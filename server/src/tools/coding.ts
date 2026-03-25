import type { Tool } from "./index";
import { loadDescription } from "./descriptions";
import { resolve, basename } from "path";
import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";

// ── read_file ─────────────────────────────────────────────────

const readFileTool: Tool = {
  name: "read_file",
  description: loadDescription("read_file"),
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path (relative to working directory or absolute)" },
      offset: { type: "number", description: "Starting line number (1-based). Omit to start from the beginning." },
      limit: { type: "number", description: "Maximum number of lines to read. Omit to read the entire file." },
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
  description: loadDescription("write_file"),
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to write to (relative or absolute)" },
      content: { type: "string", description: "The complete file content to write" },
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
  description: loadDescription("edit_file"),
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to edit" },
      old_string: { type: "string", description: "The exact string to find (must match file content exactly, including whitespace and indentation)" },
      new_string: { type: "string", description: "The replacement string" },
    },
    required: ["path", "old_string", "new_string"],
  },
  async execute(input, ctx) {
    const fp = resolve(ctx.workDir, input.path);
    const content = await readFile(fp, "utf-8");
    const n = content.split(input.old_string).length - 1;
    if (n === 0) throw new Error(`old_string not found in ${input.path}`);
    if (n > 1) throw new Error(`old_string found ${n} times in ${input.path} — provide more context to make it unique`);
    await writeFile(fp, content.replace(input.old_string, input.new_string), "utf-8");
    return `Edited: ${input.path}`;
  },
};

// ── list_dir ──────────────────────────────────────────────────

const listDirTool: Tool = {
  name: "list_dir",
  description: loadDescription("list_dir"),
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory path (relative or absolute). Defaults to the working directory if omitted." },
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
  description: loadDescription("bash"),
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "The bash command to execute" },
      timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
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
  description: loadDescription("search"),
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Regular expression pattern to search for" },
      path: { type: "string", description: "Directory or file to search in. Defaults to the working directory." },
      include: { type: "string", description: "Glob pattern to filter files (e.g. '*.ts', '*.{js,py}')" },
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
  description: loadDescription("find_files"),
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob pattern to match files (e.g. '**/*.ts', 'src/**/*.tsx')" },
      path: { type: "string", description: "Base directory to search from. Defaults to the working directory." },
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

// ── send_file ─────────────────────────────────────────────────

const sendFileTool: Tool = {
  name: "send_file",
  description:
    "Send a file to the user. Use this after creating or locating a file the user needs. " +
    "On chat channels (Feishu, etc.) the file is delivered as a message attachment. " +
    "On web it returns a download path.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path to send (relative to working directory or absolute)",
      },
    },
    required: ["path"],
  },
  async execute(input, ctx) {
    const fp = resolve(ctx.workDir, input.path);
    if (!existsSync(fp)) throw new Error(`File not found: ${input.path}`);

    const info = await stat(fp);
    const name = basename(fp);
    const kb = Math.round(info.size / 1024);

    if (ctx.onSendFile) {
      await ctx.onSendFile(fp);
      return `Sent to user: ${name} (${kb} KB)`;
    }

    return `File ready: ${name} (${kb} KB) — ${fp}`;
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
  sendFileTool,
];
