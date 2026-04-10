import { query } from "@anthropic-ai/claude-agent-sdk";

const cwd = "/Users/bytedance/.unispace/projects/default-copy";

console.log("=== Phase 1: fresh session, no agent ===");
let sessionId = "";
const q1 = query({
  prompt: "Reply with exactly the single word: BANANA",
  options: {
    cwd,
    settingSources: ["project"],
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
  },
});

for await (const msg of q1) {
  if ((msg as any).session_id && !sessionId) {
    sessionId = (msg as any).session_id;
  }
  if (msg.type === "assistant") {
    const content = (msg as any).message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text") {
          console.log("  [assistant]", block.text.slice(0, 100));
        }
      }
    }
  }
  if (msg.type === "result") {
    console.log("  result.subtype:", (msg as any).subtype);
  }
}
console.log("  sessionId:", sessionId);

if (!sessionId) {
  console.error("PHASE 1 FAILED: no session_id captured");
  process.exit(1);
}

console.log("\n=== Phase 2: resume session + apply 'taster' agent ===");
let phase2Ok = false;
let phase2Text = "";

try {
  const q2 = query({
    prompt:
      "What word did you say in the previous turn? Reply in one short flavor-metaphor sentence.",
    options: {
      cwd,
      settingSources: ["project"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      resume: sessionId,
      agent: "taster",
      agents: {
        taster: {
          description: "A fruit taster who describes flavor",
          prompt:
            "You are a fruit taster. Always answer using flavor-metaphor language.",
        },
      },
    },
  });

  for await (const msg of q2) {
    if (msg.type === "assistant") {
      const content = (msg as any).message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text") {
            phase2Text += block.text;
            console.log("  [assistant]", block.text.slice(0, 200));
          }
        }
      }
    }
    if (msg.type === "result") {
      const sub = (msg as any).subtype;
      console.log("  result.subtype:", sub);
      if (sub === "success") phase2Ok = true;
    }
  }
} catch (e: any) {
  console.error("  PHASE 2 EXCEPTION:", e?.message || e);
}

console.log("\n=== VERDICT ===");
console.log("Phase 2 stream completed:", phase2Ok);
console.log(
  "Phase 2 referenced prior turn (contained 'banana'):",
  /banana/i.test(phase2Text),
);
console.log(
  "Phase 2 adopted persona (mentioned flavor/taste/fruit):",
  /flavor|taste|fruit|ripe|sweet|sour|tangy/i.test(phase2Text),
);
