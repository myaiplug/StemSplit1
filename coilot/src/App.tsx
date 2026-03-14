

import { useState, useRef, useEffect } from "react";
import { ollamaChat, getOllamaModels } from "./ollamaApi";
import { lmstudioChat, getLMStudioModels } from "./lmstudioApi";
import { defaultEndpoints } from "./aiEndpoints";
import { motion, AnimatePresence } from "framer-motion";
import { defaultWorkflows, runWorkflow } from "./agentWorkflows";
import type { OllamaChatMessage } from "./ollamaApi";
import type { LMStudioChatMessage } from "./lmstudioApi";
import type { AIEndpoint } from "./aiEndpoints";
import type { Workflow } from "./agentWorkflows";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

// Utility for classnames
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}


// Default agent data
const defaultAgents = [
  { name: "Claude", color: "from-cyan-500 to-blue-500" },
  { name: "Copilot", color: "from-fuchsia-500 to-pink-500" },
  { name: "OpenAI", color: "from-emerald-500 to-teal-500" },
];




// Main App component (fixed structure)

export default function App() {
  // Theme, agent, chat, and input state
  const [theme, setTheme] = useState("dark");
  const [agents, setAgents] = useState(defaultAgents);
  const [activeAgent, setActiveAgent] = useState(defaultAgents[0].name);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true); // Context panel toggle
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentColor, setNewAgentColor] = useState("from-sky-500 to-indigo-500");
  const inputRef = useRef<HTMLInputElement>(null);

  // Multi-endpoint AI integration state
  const [endpoints] = useState<AIEndpoint[]>(defaultEndpoints);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(defaultEndpoints[0].id);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  // Custom endpoint state
  const [customApiUrl, setCustomApiUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");

  // Workflow automation state
  const [workflows] = useState<Workflow[]>(defaultWorkflows);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowStepIdx, setWorkflowStepIdx] = useState<number>(-1);
  const [workflowResult, setWorkflowResult] = useState<string>("");

  // Fetch models when endpoint changes
  useEffect(() => {
    const endpoint = endpoints.find(e => e.id === selectedEndpointId);
    if (!endpoint) return;
    async function fetchModels() {
      try {
        let modelList: string[] = [];
        if (endpoint && endpoint.provider === "ollama") {
          modelList = await getOllamaModels(endpoint.modelListUrl);
        } else if (endpoint && endpoint.provider === "lmstudio") {
          modelList = await getLMStudioModels(endpoint.modelListUrl);
        } else if (endpoint && endpoint.id === "custom-endpoint" && customApiUrl) {
          // Try OpenAI-compatible /models endpoint
          const res = await fetch(customApiUrl.replace(/\/$/, "") + "/models", {
            headers: customApiKey ? { "Authorization": `Bearer ${customApiKey}` } : undefined
          });
          if (res.ok) {
            const data = await res.json();
            // OpenAI format: { data: [{id: "modelname", ...}, ...] }
            modelList = data.data?.map((m: any) => m.id) || [];
          }
        }
        setModels(modelList);
        setSelectedModel(modelList[0] || "");
      } catch {
        setModels([]);
        setSelectedModel("");
      }
    }
    fetchModels();
  }, [selectedEndpointId, endpoints, customApiUrl, customApiKey]);

  // Add a new agent
  function handleAddAgent() {
    if (!newAgentName.trim()) return;
    setAgents((prev) => [...prev, { name: newAgentName.trim(), color: newAgentColor }]);
    setNewAgentName("");
    setNewAgentColor("from-sky-500 to-indigo-500");
    setShowAddAgent(false);
  }

  // Remove an agent
  function handleRemoveAgent(name: string) {
    setAgents((prev) => prev.filter((a) => a.name !== name));
    if (activeAgent === name && agents.length > 1) {
      const next = agents.find((a) => a.name !== name);
      if (next) setActiveAgent(next.name);
    }
  }

  // Send message to agent and update chat
  async function handleSend() {
    if (!input.trim() || isSending || !selectedModel) return;
    const userMsg = { sender: "You", text: input };
    setChatHistory((h) => [...h, userMsg]);
    setInput("");
    setIsSending(true);
    try {
      const endpoint = endpoints.find(e => e.id === selectedEndpointId);
      if (!endpoint) throw new Error("No endpoint selected");
      let reply = "";
      if (endpoint.provider === "ollama") {
        const messages: OllamaChatMessage[] = [
          ...chatHistory.map(m => ({
            role: m.sender === "You" ? "user" as const : "assistant" as const,
            content: m.text
          })),
          { role: "user", content: userMsg.text }
        ];
        const res = await ollamaChat({ model: selectedModel, messages }, endpoint.apiUrl);
        reply = res.choices?.[0]?.message?.content || "(No response)";
      } else if (endpoint.provider === "lmstudio") {
        const messages: LMStudioChatMessage[] = [
          ...chatHistory.map(m => ({
            role: m.sender === "You" ? "user" as const : "assistant" as const,
            content: m.text
          })),
          { role: "user", content: userMsg.text }
        ];
        const res = await lmstudioChat({ model: selectedModel, messages }, endpoint.apiUrl);
        reply = res.choices?.[0]?.message?.content || "(No response)";
      } else if (endpoint.id === "custom-endpoint" && customApiUrl) {
        // OpenAI-compatible custom endpoint
        const messages = [
          ...chatHistory.map(m => ({
            role: m.sender === "You" ? "user" : "assistant",
            content: m.text
          })),
          { role: "user", content: userMsg.text }
        ];
        const res = await fetch(customApiUrl.replace(/\/$/, "") + "/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(customApiKey ? { "Authorization": `Bearer ${customApiKey}` } : {})
          },
          body: JSON.stringify({ model: selectedModel, messages })
        });
        if (!res.ok) throw new Error(`Custom endpoint error: ${res.status}`);
        const data = await res.json();
        reply = data.choices?.[0]?.message?.content || "(No response)";
      } else {
        reply = "[Unsupported endpoint type]";
      }
      setChatHistory((h) => [...h, { sender: activeAgent, text: reply }]);
    } catch (err: any) {
      setChatHistory((h) => [...h, { sender: activeAgent, text: `[AI error: ${err.message}]` }]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col font-inter bg-gradient-to-br",
      theme === "dark"
        ? "from-[#0a0c1b] to-[#1a1c2b] text-white"
        : "from-[#f8fafc] to-[#e2e8f0] text-gray-900"
    )}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/10">
                {/* Workflow Automation */}
                <div className="flex items-center gap-2">
                  <label htmlFor="workflow-select" className="text-xs font-semibold mr-1">Workflow:</label>
                  <select
                    id="workflow-select"
                    className="px-2 py-1 rounded border border-white/10 bg-white/10 dark:bg-black/20 text-xs"
                    value={selectedWorkflowId}
                    onChange={e => setSelectedWorkflowId(e.target.value)}
                  >
                    <option value="">Select workflow…</option>
                    {workflows.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <button
                    className="px-3 py-1 rounded bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white text-xs font-semibold shadow hover:scale-105 transition disabled:opacity-50"
                    disabled={!selectedWorkflowId || workflowRunning}
                    onClick={async () => {
                      setWorkflowRunning(true);
                      setWorkflowStepIdx(-1);
                      setWorkflowResult("");
                      const wf = workflows.find(w => w.id === selectedWorkflowId);
                      if (!wf) return;
                      await runWorkflow(wf, (_, idx) => setWorkflowStepIdx(idx));
                      setWorkflowRunning(false);
                      setWorkflowStepIdx(-1);
                      setWorkflowResult("Workflow completed!");
                    }}
                  >
                    Run
                  </button>
                </div>
        <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 mr-2 animate-pulse" />
          StemSplit Agents
        </div>
        <div className="flex items-center gap-4">
          {/* Endpoint and model selection */}
          <div className="flex items-center gap-2">
            <label htmlFor="endpoint-select" className="text-xs font-semibold mr-1">Endpoint:</label>
            <select
              id="endpoint-select"
              className="px-2 py-1 rounded border border-white/10 bg-white/10 dark:bg-black/20 text-xs"
              value={selectedEndpointId}
              onChange={e => setSelectedEndpointId(e.target.value)}
            >
              {endpoints.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            {selectedEndpointId === "custom-endpoint" && (
              <>
                <input
                  type="text"
                  className="ml-2 px-2 py-1 rounded border border-white/10 bg-white/10 dark:bg-black/20 text-xs w-48"
                  placeholder="Custom API URL (e.g. https://...)"
                  value={customApiUrl}
                  onChange={e => setCustomApiUrl(e.target.value)}
                  autoFocus
                />
                <input
                  type="text"
                  className="ml-2 px-2 py-1 rounded border border-white/10 bg-white/10 dark:bg-black/20 text-xs w-32"
                  placeholder="API Key (optional)"
                  value={customApiKey}
                  onChange={e => setCustomApiKey(e.target.value)}
                />
              </>
            )}
            <label htmlFor="model-select" className="text-xs font-semibold ml-2 mr-1">Model:</label>
            <select
              id="model-select"
              className="px-2 py-1 rounded border border-white/10 bg-white/10 dark:bg-black/20 text-xs"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              disabled={models.length === 0}
            >
              {models.length === 0 && <option value="">No models found</option>}
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {/* Toggle context panel button */}
          <button
            className={cn(
              "rounded-lg px-3 py-2 font-semibold transition border border-white/10",
              showContextPanel
                ? "bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white shadow"
                : "bg-white/10 dark:bg-black/20 text-white/60 hover:text-white"
            )}
            onClick={() => setShowContextPanel((v) => !v)}
            aria-label="Toggle context panel"
          >
            {showContextPanel ? "Hide Context" : "Show Context"}
          </button>
          <button
            className="rounded-full p-2 hover:bg-white/10 transition"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunIcon className="w-6 h-6" />
            ) : (
              <MoonIcon className="w-6 h-6" />
            )}
          </button>
          <button className="rounded-lg px-4 py-2 bg-gradient-to-tr from-amber-400 to-pink-500 text-white font-semibold shadow-lg hover:scale-105 transition">
            Settings
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-24 flex flex-col items-center py-8 gap-6 border-r border-white/10 bg-white/5 dark:bg-black/10 backdrop-blur-xl">
          {agents.map((agent) => (
            <div key={agent.name} className="relative group">
              <motion.button
                className={cn(
                  "w-12 h-12 rounded-full bg-gradient-to-br shadow-lg flex items-center justify-center text-lg font-bold border-2 border-transparent transition-all",
                  agent.name === activeAgent
                    ? `${agent.color} border-amber-400 scale-110`
                    : "from-gray-700 to-gray-900 opacity-60 hover:opacity-100"
                )}
                onClick={() => setActiveAgent(agent.name)}
                aria-label={agent.name}
                whileTap={{ scale: 0.95 }}
              >
                {agent.name[0]}
              </motion.button>
              {agents.length > 1 && (
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  title="Remove agent"
                  onClick={() => handleRemoveAgent(agent.name)}
                  tabIndex={-1}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-2xl text-white/40 hover:text-emerald-400 hover:border-emerald-400 transition"
            onClick={() => setShowAddAgent(true)}
            title="Add agent"
          >
            +
          </button>
          {/* Add Agent Modal */}
          <AnimatePresence>
            {showAddAgent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute left-24 top-8 z-50 bg-white dark:bg-black rounded-xl shadow-xl p-6 border border-white/20 flex flex-col gap-3 min-w-[220px]"
              >
                <div className="font-bold text-lg mb-2">Add Agent</div>
                <input
                  className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Agent name"
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  autoFocus
                />
                <label className="text-sm font-medium mb-1" htmlFor="agent-color-select">Agent color</label>
                <select
                  id="agent-color-select"
                  title="Agent color"
                  className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 dark:bg-black/20 focus:outline-none"
                  value={newAgentColor}
                  onChange={e => setNewAgentColor(e.target.value)}
                >
                  <option value="from-sky-500 to-indigo-500">Blue</option>
                  <option value="from-emerald-400 to-cyan-500">Green</option>
                  <option value="from-fuchsia-500 to-pink-500">Pink</option>
                  <option value="from-amber-400 to-pink-500">Amber</option>
                  <option value="from-cyan-500 to-blue-500">Cyan</option>
                </select>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-4 py-2 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white font-semibold shadow hover:scale-105 transition"
                    onClick={handleAddAgent}
                  >
                    Add
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-semibold shadow hover:scale-105 transition"
                    onClick={() => setShowAddAgent(false)}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative">
          {/* Workflow Progress UI */}
          {selectedWorkflowId && workflowRunning && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-2 border border-emerald-400">
              <div className="font-bold text-lg mb-2">Running Workflow…</div>
              <ul className="text-sm mb-2">
                {workflows.find(w => w.id === selectedWorkflowId)?.steps.map((step, idx) => (
                  <li key={idx} className={idx === workflowStepIdx ? "font-bold text-emerald-400" : "opacity-60"}>
                    {step.agent}: {step.action}
                  </li>
                ))}
              </ul>
              <div className="text-xs opacity-70">Step {workflowStepIdx + 1} of {workflows.find(w => w.id === selectedWorkflowId)?.steps.length}</div>
            </div>
          )}
          {workflowResult && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-8 py-4 rounded-xl shadow-lg font-semibold">
              {workflowResult}
              <button className="ml-4 underline" onClick={() => setWorkflowResult("")}>Dismiss</button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeAgent}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="w-full max-w-2xl mx-auto bg-white/10 dark:bg-black/20 rounded-3xl shadow-2xl p-10 flex flex-col gap-6 backdrop-blur-2xl border border-white/10"
              style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <h2 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 animate-pulse" />
                {activeAgent} Agent
              </h2>
              <div className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto bg-black/5 dark:bg-white/5 rounded-xl p-4 mb-4 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {chatHistory.length === 0 ? (
                    <motion.div
                      key="empty-chat"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-lg opacity-60 italic text-center mt-8"
                    >
                      Start a conversation or assign a task to this agent.
                    </motion.div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: i * 0.03 }}
                        className={cn(
                          "px-4 py-2 rounded-lg max-w-[80%]",
                          msg.sender === "You"
                            ? "self-end bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white"
                            : "self-start bg-white/20 dark:bg-black/30 text-white"
                        )}
                      >
                        <span className="font-semibold mr-2">{msg.sender}:</span>
                        <span>{msg.text}</span>
                      </motion.div>
                    ))
                  )}
                  {isSending && (
                    <motion.div
                      key="typing-indicator"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="self-start px-4 py-2 rounded-lg bg-white/20 dark:bg-black/30 text-white animate-pulse"
                    >
                      {activeAgent} is typing…
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-500 text-white font-semibold shadow hover:scale-105 transition"
                  onClick={() => handleSend()}
                  disabled={isSending || !input.trim()}
                >
                  Send
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-semibold shadow hover:scale-105 transition"
                  onClick={() => setInput("/assign ")}
                  disabled={isSending}
                >
                  Assign Task
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Context/Plan Panel (toggleable) */}
        <AnimatePresence>
          {showContextPanel && (
            <motion.aside
              key="context-panel"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 hidden md:flex flex-col border-l border-white/10 bg-white/5 dark:bg-black/10 backdrop-blur-xl p-6"
            >
              <h3 className="text-xl font-bold mb-4">Context & Plan</h3>
              {/* TODO: Replace with real project/plan/agent context */}
              <div className="text-sm opacity-70 mb-4">Project files, plans, and agent context will appear here.</div>
              <ul className="text-sm space-y-2">
                <li>• <span className="font-semibold">Current Project:</span> StemSplit</li>
                <li>• <span className="font-semibold">Active Agent:</span> {activeAgent}</li>
                <li>• <span className="font-semibold">Session:</span> Default</li>
                <li>• <span className="font-semibold">Recent Files:</span> <span className="opacity-60">(coming soon)</span></li>
                <li>• <span className="font-semibold">Plan:</span> <span className="opacity-60">(coming soon)</span></li>
              </ul>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-4 border-t border-white/10 bg-white/5 dark:bg-black/10 backdrop-blur-xl">
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            className="flex-1 px-4 py-2 rounded-lg bg-white/20 dark:bg-black/20 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-base shadow-inner"
            placeholder="Type a command, message, or use / for commands..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKey}
            disabled={isSending}
          />
        </div>
        <div className="flex items-center gap-4 ml-6">
          <button
            className="rounded-lg px-4 py-2 bg-gradient-to-tr from-emerald-400 to-cyan-500 text-white font-semibold shadow hover:scale-105 transition"
            onClick={handleSend}
            disabled={isSending || !input.trim()}
          >
            Send
          </button>
          <button className="rounded-lg px-4 py-2 bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-semibold shadow hover:scale-105 transition">
            <span className="sr-only">Open Command Palette</span>
            ⌘K
          </button>
        </div>
      </footer>
    </div>
  );
}
