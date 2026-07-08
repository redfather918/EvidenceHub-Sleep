// EvidenceHub Media Factory (EMF) — LLM-backed Script Generator (P2)
//
// Wraps the deterministic Template Engine (templates.ts) with an optional LLM
// pass. It reuses the same DeepSeek/OpenAI chat-completions pattern as the
// pipeline (pipeline/ai-extractor.ts) and falls back to the deterministic
// script when no key is set or the call fails — so the engine always runs.

import type { ScriptInput, ScriptDraft } from "./types";
import { generateScript } from "./templates";
import { pipelineConfig } from "../../pipeline/config";

function buildScriptPrompt(input: ScriptInput): string {
  const c = input.claim;
  return [
    `You are a short-form health video scriptwriter for EvidenceHub.`,
    `Write a ~30-second script for the "${input.template}" template about "${input.item}"` +
      `${input.category ? ` in the ${input.category} domain` : ""}.`,
    c?.summary ? `Known evidence: ${c.summary}` : "",
    c?.studyCount
      ? `Study count: ${c.studyCount} (RCTs: ${c.rctCount ?? 0}, meta-analyses: ${c.metaCount ?? 0}).`
      : "",
    c?.evidenceScore != null ? `Evidence confidence: ${c.evidenceScore}/100.` : "",
    `Return STRICT JSON only: {"hook": string, "body": string[3-4], "ending": string}.`,
    `Hook must be under 12 words. No emojis. No markdown.`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callDeepSeek(prompt: string, apiKey: string, model: string, temperature: number): Promise<string> {
  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature, max_tokens: 1200 }),
  });
  if (!resp.ok) throw new Error(`DeepSeek HTTP ${resp.status}: ${await resp.text()}`);
  return (await resp.json()).choices[0].message.content;
}

async function callOpenAI(prompt: string, apiKey: string, model: string, temperature: number): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature, max_tokens: 1200 }),
  });
  if (!resp.ok) throw new Error(`OpenAI HTTP ${resp.status}: ${await resp.text()}`);
  return (await resp.json()).choices[0].message.content;
}

function parseScript(text: string, fallback: ScriptDraft): ScriptDraft | null {
  try {
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const p = JSON.parse(jsonStr);
    if (typeof p?.hook === "string" && Array.isArray(p?.body) && typeof p?.ending === "string") {
      return { ...fallback, hook: p.hook, body: p.body.map(String), ending: p.ending };
    }
  } catch {
    /* fall through to deterministic */
  }
  return null;
}

/**
 * Generate a script for a planned item. Uses the LLM when configured
 * (DEEPSEEK_API_KEY / OPENAI_API_KEY via pipelineConfig.ai); otherwise returns
 * the deterministic draft from the Template Engine.
 */
export async function generateScriptWithLLM(input: ScriptInput): Promise<ScriptDraft> {
  const { provider, apiKey, model, temperature } = pipelineConfig.ai;
  const deterministic = generateScript(input);
  if (provider === "mock" || !apiKey) return deterministic;

  try {
    const raw =
      provider === "deepseek"
        ? await callDeepSeek(buildScriptPrompt(input), apiKey, model, temperature)
        : await callOpenAI(buildScriptPrompt(input), apiKey, model, temperature);
    return parseScript(raw, deterministic) ?? deterministic;
  } catch (err) {
    console.warn(`  [LLM] script gen failed (${String(err)}); using deterministic fallback.`);
    return deterministic;
  }
}
