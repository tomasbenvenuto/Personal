import { prisma } from "@/lib/prisma";
import { anthropic, getTextContent, MODEL_FAST, MODEL_SMART } from "@/lib/anthropic";
import {
  chunkText,
  estimateTokens,
  SINGLE_CALL_TOKEN_THRESHOLD,
} from "@/lib/chunking";
import { mapWithConcurrency } from "@/lib/concurrency";

const SUMMARY_SYSTEM_PROMPT = `Sos un asistente de estudio. Te paso el contenido de un documento (o una síntesis de sus puntos clave, si es muy largo) y tenés que producir un resumen de estudio claro y bien organizado, de 400 a 800 palabras, cubriendo los temas principales, definiciones importantes y conclusiones. Usá encabezados y viñetas en markdown donde ayude. Respondé siempre en español, sin preámbulos.`;

async function extractKeyPoints(chunk: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL_FAST,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Extraé los puntos clave (5 a 10 viñetas) de este fragmento de un documento de estudio. Solo las viñetas, sin introducción:\n\n${chunk}`,
      },
    ],
  });
  return getTextContent(message);
}

/**
 * Generates (or regenerates) the study summary for a document and persists
 * it. For short documents this is a single Claude call; for long ones it
 * runs the map (cheap per-chunk key points, Haiku) → reduce (final
 * synthesis, Sonnet) strategy described in the plan, so cost stays roughly
 * linear in document length instead of blowing up the context window.
 */
export async function generateSummary(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });
  const text = document.extractedText;
  if (!text) {
    throw new Error("El documento todavía no tiene texto extraído.");
  }

  let sourceForFinalCall = text;
  if (estimateTokens(text) > SINGLE_CALL_TOKEN_THRESHOLD) {
    const chunks = chunkText(text);
    const keyPoints = await mapWithConcurrency(chunks, 5, extractKeyPoints);
    sourceForFinalCall = keyPoints
      .map((kp, i) => `Fragmento ${i + 1} de ${keyPoints.length}:\n${kp}`)
      .join("\n\n");
  }

  const message = await anthropic.messages.create({
    model: MODEL_SMART,
    max_tokens: 2048,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: sourceForFinalCall }],
  });
  const content = getTextContent(message);

  return prisma.summary.upsert({
    where: { documentId },
    update: { content, model: MODEL_SMART },
    create: { documentId, content, model: MODEL_SMART },
  });
}
