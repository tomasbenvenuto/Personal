import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Sonnet for the calls whose output the user actually reads (summary,
// the final reduce step, flashcards/quiz/exam questions). Haiku for cheap
// bulk/structural sub-calls (per-chunk key-point extraction, grading).
export const MODEL_SMART = "claude-sonnet-5";
export const MODEL_FAST = "claude-haiku-4-5";

/** Concatenates the text blocks of a non-parsed message response. */
export function getTextContent(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
