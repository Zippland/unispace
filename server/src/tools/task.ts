import type { Tool } from "./index";
import { loadDescription } from "./descriptions";

// ── TaskStore (per-session, serializable) ─────────────────────

export interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done";
  description?: string;
  createdAt: number;
}

export class TaskStore {
  private tasks = new Map<string, Task>();

  create(title: string, description?: string): Task {
    const task: Task = {
      id: crypto.randomUUID().slice(0, 8),
      title,
      status: "pending",
      description,
      createdAt: Date.now(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  update(id: string, fields: Partial<Pick<Task, "status" | "description">>): Task | null {
    const t = this.tasks.get(id);
    if (!t) return null;
    Object.assign(t, fields);
    return t;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(): Task[] {
    return [...this.tasks.values()];
  }

  dump(): Task[] {
    return this.list();
  }

  restore(tasks: Task[]): void {
    for (const t of tasks) this.tasks.set(t.id, t);
  }
}

// ── Task tools ────────────────────────────────────────────────

function fmtTask(t: Task): string {
  const icon = t.status === "done" ? "[x]" : t.status === "in_progress" ? "[~]" : "[ ]";
  return `${icon} ${t.id}  ${t.title}${t.description ? "\n     " + t.description : ""}`;
}

const taskCreate: Tool = {
  name: "task_create",
  description: loadDescription("task_create"),
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Optional details" },
    },
    required: ["title"],
  },
  async execute(input, ctx) {
    const t = ctx.taskStore.create(input.title, input.description);
    return `Created task [${t.id}]: ${t.title}`;
  },
};

const taskUpdate: Tool = {
  name: "task_update",
  description: loadDescription("task_update"),
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "Task ID" },
      status: {
        type: "string",
        enum: ["pending", "in_progress", "done"],
        description: "New status",
      },
      description: { type: "string", description: "Updated description" },
    },
    required: ["id"],
  },
  async execute(input, ctx) {
    const t = ctx.taskStore.update(input.id, {
      ...(input.status && { status: input.status }),
      ...(input.description !== undefined && { description: input.description }),
    });
    if (!t) return `Task ${input.id} not found.`;
    return `Updated: ${fmtTask(t)}`;
  },
};

const taskList: Tool = {
  name: "task_list",
  description: loadDescription("task_list"),
  parameters: { type: "object", properties: {} },
  async execute(_input, ctx) {
    const tasks = ctx.taskStore.list();
    if (tasks.length === 0) return "No tasks.";
    return tasks.map(fmtTask).join("\n");
  },
};

export const taskTools: Tool[] = [taskCreate, taskUpdate, taskList];
