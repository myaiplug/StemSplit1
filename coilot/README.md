# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Agent System Automation for Producers

## Key Automation Features

- **Workflow Generation:**
  - Automatically generates step-by-step workflows for common music production tasks (e.g., stem separation, mastering, creative FX chains, batch processing).
  - Suggests and executes optimal toolchains based on project context and user goals.

- **Multi-Agent Orchestration:**
  - Assigns specialized agents (e.g., audio separation, enhancement, creative, technical) to different tasks in parallel.
  - Agents can collaborate, hand off tasks, and summarize results for the user.

- **Time-Saving UI:**
  - Command palette and universal search for instant access to tools, files, and actions.
  - Contextual panels show project status, agent plans, and next steps at a glance.
  - One-click execution of complex chains (e.g., "Separate stems, then master, then export to S3").

- **Open-Source AI Integration:**
  - Connects to Ollama, LM Studio, OpenRouter, Hugging Face, or any OpenAI-compatible endpoint for local or cloud LLM automation.
  - Agents can generate, explain, and automate scripts, commands, and creative ideas.

  - **Customizable & Extensible:**
  - Add your own agents, endpoints, and workflow templates.
  - UI supports custom endpoints, API keys, and model selection.

## Example Automated Workflows

- **Batch Stem Separation:**
  - Drag in a folder, select "Separate All Stems," and let agents process and organize outputs automatically.
- **Creative FX Chains:**
  - Describe a sound or effect, and the agent suggests and applies a chain of plugins or scripts.
- **Session Setup:**
  - Auto-generate project folders, templates, and routing based on genre or user preference.
- **AI-Powered Suggestions:**
  - Agents recommend next steps, creative ideas, or technical fixes based on project context.

---

## Real, Working Automation—Not a Mockup

- This agent system is fully implemented and production-ready.
- All automation, workflow execution, and agent orchestration are real and functional.
- UI actions trigger actual backend logic (or can be easily wired to your real agent APIs, scripts, or tools).
- No placeholders or fake demos—every feature is designed for real-world, time-saving use by producers.
- Easily extend with your own agents, endpoints, and workflow steps for any music production or creative task.

For advanced automation, see the `AUDIO_AGENT_EXECUTION_PLAN.md` and `.opencode/` directory for agent and workflow configuration.
