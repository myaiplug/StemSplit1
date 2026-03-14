// lmstudioApi.ts
// Utility for communicating with LM Studio's OpenAI-compatible local API

export interface LMStudioChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LMStudioChatRequest {
  model: string;
  messages: LMStudioChatMessage[];
  stream?: boolean;
}

export interface LMStudioChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: LMStudioChatMessage;
    finish_reason: string;
  }>;
}

export async function lmstudioChat(
  req: LMStudioChatRequest,
  endpoint: string = "http://localhost:1234/v1/chat/completions"
): Promise<LMStudioChatResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`LM Studio API error: ${res.status}`);
  return res.json();
}

// Get available models from LM Studio
export async function getLMStudioModels(endpoint: string = "http://localhost:1234/v1/models") {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`LM Studio models error: ${res.status}`);
  const data = await res.json();
  // data: { object: "list", data: [{id: "modelname", ...}, ...] }
  return data.data?.map((m: any) => m.id) || [];
}
