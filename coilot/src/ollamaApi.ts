// ollamaApi.ts
// Utility for communicating with Ollama's OpenAI-compatible local API

export interface OllamaChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
}

export interface OllamaChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OllamaChatMessage;
    finish_reason: string;
  }>;
}

export async function ollamaChat(
  req: OllamaChatRequest,
  endpoint: string = "http://localhost:11434/v1/chat/completions"
): Promise<OllamaChatResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
  return res.json();
}

// Get available models from Ollama
export async function getOllamaModels(endpoint: string = "http://localhost:11434/api/tags") {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Ollama models error: ${res.status}`);
  const data = await res.json();
  // data.models: [{name: "llama2", ...}, ...]
  return data.models?.map((m: any) => m.name) || [];
}
