# AGENTS.md

## Project AI Agents Setup

This file documents the AI agents and their configuration for this project.

### Example Agent Configuration

- **Coder Agent**: Handles code generation and refactoring tasks.
- **Task Agent**: Manages project planning and task breakdowns.
- **Title Agent**: Suggests commit messages and PR titles.

You can customize agent models and settings in `.opencode.json`.

---

## How to Add/Modify Agents

1. Edit `.opencode.json` in the project root.
2. Add or update the `agents` section, e.g.:

```
"agents": {
  "coder": { "model": "gpt-4.1", "maxTokens": 5000 },
  "task": { "model": "claude-3.7-sonnet", "maxTokens": 5000 },
  "title": { "model": "gpt-4.1-mini", "maxTokens": 80 }
}
```

3. Save and restart OpenCode if running.

---

## Custom Commands

- Place markdown files in `.opencode/commands/` to define custom agent commands.
- Use `/connect` in OpenCode TUI to link providers.

---

For more, see https://opencode.ai/docs/agents/
