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

const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        choices: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      }),
    )
    .min(1)
    .max(20),
});

async function generateQuestionsForText(text: string, targetCount: string) {
  const message = await anthropic.messages.parse({
    model: MODEL_SMART,
    max_tokens: 3000,
    system: `Sos un asistente de estudio. Generá preguntas de opción múltiple en español a partir del texto que te paso, con 4 opciones cada una y exactamente una correcta. Incluí una explicación breve de por qué la respuesta correcta lo es. Los distractores tienen que ser creíbles, no obviamente incorrectos. Generá ${targetCount} preguntas.`,
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(QuizSchema) },
  });
  return message.parsed_output?.questions ?? [];
}

/** Generates a new batch of quiz questions for a document (batches
 *  accumulate, same choice as flashcards — old quiz sets stay available). */
export async function generateQuiz(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });
  const text = document.extractedText;
  if (!text) throw new Error("El documento todavía no tiene texto extraído.");

  let questions: Awaited<ReturnType<typeof generateQuestionsForText>>;
  if (estimateTokens(text) > SINGLE_CALL_TOKEN_THRESHOLD) {
    const chunks = chunkText(text);
    const perChunk = await mapWithConcurrency(chunks, 5, (chunk) =>
      generateQuestionsForText(chunk, "2 a 4"),
    );
    questions = perChunk.flat();
  } else {
    questions = await generateQuestionsForText(text, "6 a 12");
  }

  if (questions.length === 0) {
    throw new Error("La IA no generó preguntas para este documento.");
  }

  await prisma.quizQuestion.createMany({
    data: questions.map((q) => ({
      documentId,
      question: q.question,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  });

  return prisma.quizQuestion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
}
