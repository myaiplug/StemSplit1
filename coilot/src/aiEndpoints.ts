// aiEndpoints.ts
// Utility for managing multiple AI endpoints (Ollama, LM Studio, etc.)

export type AIProvider = "ollama" | "lmstudio" | "custom";

export interface AIEndpoint {
  id: string;
  label: string;
  provider: AIProvider;
  apiUrl: string;
  modelListUrl?: string;
  openaiCompatible?: boolean;
}

export const defaultEndpoints: AIEndpoint[] = [
  {
    id: "ollama-local",
    label: "Ollama (Local)",
    provider: "ollama",
    apiUrl: "http://localhost:11434/v1/chat/completions",
    modelListUrl: "http://localhost:11434/api/tags",
    openaiCompatible: true,
  },
  {
    id: "lmstudio-local",
    label: "LM Studio (Local)",
    provider: "lmstudio",
    apiUrl: "http://localhost:1234/v1/chat/completions",
    modelListUrl: "http://localhost:1234/v1/models",
    openaiCompatible: true,
  },
  {
    id: "openrouter-cloud",
    label: "OpenRouter (Cloud, Free Tier)",
    provider: "custom",
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    modelListUrl: "https://openrouter.ai/api/v1/models",
    openaiCompatible: true,
  },
  {
    id: "huggingface-inference",
    label: "Hugging Face Inference API (Free Tier)",
    provider: "custom",
    apiUrl: "https://api-inference.huggingface.co/models/{model}",
    modelListUrl: "https://huggingface.co/api/models?pipeline_tag=text-generation",
    openaiCompatible: false,
  },
  {
    id: "custom-endpoint",
    label: "Custom Endpoint (OpenAI-compatible)",
    provider: "custom",
    apiUrl: "",
    modelListUrl: "",
    openaiCompatible: true,
  },
];
