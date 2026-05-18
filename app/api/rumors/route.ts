import { NextResponse } from "next/server";
import {
  extractRumorsFromText,
  RUMOR_SYSTEM_PROMPT,
  sanitizeRumorList,
} from "@/lib/rumors";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function collectResponseText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n") ?? "";

  return text.trim();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { prompt?: unknown; apiKey?: unknown }
    | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const apiKey =
    typeof body?.apiKey === "string" && body.apiKey.trim()
      ? body.apiKey.trim()
      : process.env.OPENAI_API_KEY?.trim() || "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key is required." },
      { status: 400 },
    );
  }

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400 },
    );
  }

  const openAiResponse = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: RUMOR_SYSTEM_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: `Тема слухов: ${prompt}` }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "rumor_table",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              rumors: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: { type: "string" },
              },
            },
            required: ["rumors"],
          },
        },
      },
    }),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    return NextResponse.json(
      { error: "OpenAI request failed.", details: errorText },
      { status: 502 },
    );
  }

  const payload = (await openAiResponse.json()) as OpenAIResponse;
  const rawText = collectResponseText(payload);

  let rumors: string[] = [];
  if (rawText) {
    try {
      const parsed = JSON.parse(rawText) as { rumors?: unknown };
      rumors = sanitizeRumorList(parsed.rumors);
    } catch {
      rumors = [];
    }
  }

  const normalizedRumors = rumors.length ? rumors : extractRumorsFromText(rawText);

  if (normalizedRumors.length !== 5) {
    return NextResponse.json(
      {
        error: "Model returned an unexpected rumor payload.",
        details: rawText,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ rumors: normalizedRumors });
}
