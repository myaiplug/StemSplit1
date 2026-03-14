<!-- agent-gui-design.md -->
# OpenCode Agent Control GUI Design

## Design Goals
- Minimalistic, premium, creative look
- Fast, distraction-free, and intuitive
- Responsive (desktop, tablet, mobile)
- Dark/light mode support

## Layout
- **Header:** Project name, agent status, quick settings
- **Sidebar:**
  - Agent list (avatars, status, switch/activate)
  - Custom commands (quick access)
- **Main Panel:**
  - Chat/interaction area (rich markdown, code, images)
  - File/plan/task context panel (toggleable)
- **Footer:**
  - Input bar (slash commands, file upload, emoji, voice)
  - Model/agent selector, session switcher

## Visual Style
- Clean, ample whitespace, soft shadows
- Rounded corners, subtle gradients
- Premium font (e.g., Inter, Söhne, or custom)
- Micro-animations for transitions, agent switching
- Color palette: deep blue/gray, accent gold or teal

## Key Features
- Multi-agent session control (switch, parallel, assign tasks)
- Drag-and-drop file/context sharing
- Command palette (Ctrl+K)
- Real-time agent status (typing, thinking, idle)
- Quick model/agent switching
- Customizable shortcuts
- Theme toggle

## Technologies
- React (Next.js or Vite)
- Tailwind CSS or styled-components
- Framer Motion (for animation)
- Electron or Tauri for desktop

---

## Wireframe (textual)

[Header]
| Project: StemSplit | [Agent Status] | [Settings ⚙️] |

[Sidebar]
- [● Claude] [● Copilot] [● OpenAI] [Add Agent]
- [Custom Commands]

[Main]
| Chat/Code/Markdown | [Context/Plan/Files Panel] |

[Footer]
| [Input Bar: /, @, file, emoji, mic] | [Agent/Model] | [Session] |

---

## Next Steps
- Scaffold React+Tauri app in `.opencode/gui`.
- Implement layout, theme, and agent/session logic.
- Integrate with OpenCode backend via API or CLI.
