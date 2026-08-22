import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL_SMART } from "@/lib/anthropic";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  chunkText,
  estimateTokens,
  SINGLE_CALL_TOKEN_THRESHOLD,
} from "@/lib/chunking";
import { mapWithConcurrency } from "@/lib/concurrency";

const FlashcardsSchema = z.object({
  cards: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .min(1)
    .max(30),
});

async function generateCardsForText(text: string, targetCount: string) {
  const message = await anthropic.messages.parse({
    model: MODEL_SMART,
    max_tokens: 2048,
    system: `Sos un asistente de estudio. Generá flashcards en español para repaso con repetición espaciada a partir del texto que te paso. Cada tarjeta tiene que evaluar un solo hecho o concepto atómico (evitá preguntas compuestas). Preferí preguntas de "qué/por qué/cómo" antes que preguntas de sí o no. Generá ${targetCount} tarjetas.`,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(FlashcardsSchema) },
  });
  return message.parsed_output?.cards ?? [];
}

/** Generates flashcards for a document and appends them (doesn't replace
 *  previously generated ones — each generation adds a new batch, same as
 *  the plan's "quiz sets accumulate" choice). */
export async function generateFlashcards(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });
  const text = document.extractedText;
  if (!text) throw new Error("El documento todavía no tiene texto extraído.");

  let cards: { question: string; answer: string }[];
  if (estimateTokens(text) > SINGLE_CALL_TOKEN_THRESHOLD) {
    const chunks = chunkText(text);
    const perChunk = await mapWithConcurrency(chunks, 5, (chunk) =>
      generateCardsForText(chunk, "3 a 6"),
    );
    cards = perChunk.flat();
  } else {
    cards = await generateCardsForText(text, "8 a 15");
  }

  if (cards.length === 0) {
    throw new Error("La IA no generó flashcards para este documento.");
  }

  await prisma.flashcard.createMany({
    data: cards.map((card) => ({
      documentId,
      userId: document.userId,
      question: card.question,
      answer: card.answer,
    })),
  });

  return prisma.flashcard.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
}
