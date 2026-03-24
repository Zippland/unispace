# UniSpace

Local coding agent with a web workspace UI. Connects to any OpenAI-compatible LLM and gives it full file system access — read, write, edit, search, execute — all through a browser.

## Setup

```bash
git clone https://github.com/Zippland/unispace.git
cd unispace
cd server && bun install && bun link && cd ../web && bun install && cd ..
unispace onboard
```

`onboard` creates `~/.unispace/` and walks you through setting your API key.

## Run

```bash
unispace
```

Opens API server on `http://localhost:3210` and web UI on `http://localhost:5173`.

## CLI

| Command | Description |
|---------|-------------|
| `unispace` | Start server + web UI (default) |
| `unispace start` | API server only |
| `unispace web` | Web UI only |
| `unispace onboard` | Interactive setup |
| `unispace help` | Show usage |

## Workspace

Everything lives in `~/.unispace/`:

| File | Purpose |
|------|---------|
| `config.json` | Model, API key, port, working directory |
| `SOUL.md` | Agent personality — read at every conversation start |
| `sessions/` | Conversation history (JSONL, auto-managed) |
| `skills/` | Reusable skills (add a folder with `SKILL.md` inside) |

Click `config.json` or `SOUL.md` in the sidebar to edit them through the GUI.

## Tools

The agent has 10 tools: `read_file`, `write_file`, `edit_file`, `list_dir`, `bash`, `search`, `find_files`, `task_create`, `task_update`, `task_list`. Descriptions are in `server/src/tools/descriptions/`.

## Using a Different Model

Any OpenAI-compatible API works. Edit `~/.unispace/config.json`:

```json
{
  "model": {
    "provider": "openai",
    "name": "gpt-4o",
    "apiKey": "sk-...",
    "baseUrl": "https://api.openai.com/v1",
    "temperature": 0.7
  }
}
```

Or re-run `unispace onboard`.

## License

MIT
