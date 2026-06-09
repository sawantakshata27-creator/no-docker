export type GeminiMessage = { role: "user" | "assistant"; content: string };

export async function askGemini(apiKey: string, messages: GeminiMessage[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "ProcessHub Assistant",
    },
    body: JSON.stringify({
      model: "google/gemma-4-31b-it:free",
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `OpenRouter error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response.";
}
