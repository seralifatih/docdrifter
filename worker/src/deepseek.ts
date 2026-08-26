export interface DriftVerdict {
  docs_should_update: boolean;
  reason: string;
}

export async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<DriftVerdict> {
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    }),
  });

  if (!resp.ok) {
    throw new Error(`DeepSeek request failed: ${resp.status}`);
  }

  const result = await resp.json<{ choices: { message: { content: string } }[] }>();
  let content = result.choices[0].message.content.trim();
  content = content.replace(/^```(?:json)?|```$/gm, "").trim();

  const parsed = JSON.parse(content) as Partial<DriftVerdict>;
  if (typeof parsed.docs_should_update !== "boolean") {
    throw new Error("Malformed DeepSeek response: missing docs_should_update");
  }
  return { docs_should_update: parsed.docs_should_update, reason: parsed.reason ?? "" };
}
