import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anthropic, getTextContent, MODEL_FAST, MODEL_SMART } from "@/lib/anthropic";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  chunkText,
  estimateTokens,
  SINGLE_CALL_TOKEN_THRESHOLD,
} from "@/lib/chunking";
import { mapWithConcurrency } from "@/lib/concurrency";

const ConceptMapSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
      }),
    )
    .min(3)
    .max(30),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    }),
  ),
});

const CONCEPT_MAP_SYSTEM_PROMPT = `Sos un asistente de estudio. Analizá el contenido que te paso (o la síntesis de sus puntos clave, si es muy largo) y armá un mapa conceptual: identificá entre 10 y 25 conceptos clave como nodos, y las relaciones entre ellos como conexiones (edges). Los ids de los nodos tienen que ser slugs cortos sin espacios. El source/target de cada conexión tiene que hacer referencia a un id de nodo existente. Respondé en español.`;

async function extractKeyPoints(chunk: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL_FAST,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Extraé los conceptos y términos clave (5 a 10 viñetas) de este fragmento de un documento de estudio:\n\n${chunk}`,
      },
    ],
  });
  return getTextContent(message);
}

export async function generateConceptMap(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });
  const text = document.extractedText;
  if (!text) throw new Error("El documento todavía no tiene texto extraído.");

  let source = text;
  if (estimateTokens(text) > SINGLE_CALL_TOKEN_THRESHOLD) {
    const chunks = chunkText(text);
    const keyPoints = await mapWithConcurrency(chunks, 5, extractKeyPoints);
    source = keyPoints
      .map((kp, i) => `Fragmento ${i + 1} de ${keyPoints.length}:\n${kp}`)
      .join("\n\n");
  }

  const message = await anthropic.messages.parse({
    model: MODEL_SMART,
    max_tokens: 4000,
    system: CONCEPT_MAP_SYSTEM_PROMPT,
    messages: [{ role: "user", content: source }],
    output_config: { format: zodOutputFormat(ConceptMapSchema) },
  });

  const parsed = message.parsed_output;
  if (!parsed) throw new Error("La IA no devolvió un mapa conceptual válido.");

  return prisma.conceptMap.upsert({
    where: { documentId },
    update: { nodes: parsed.nodes, edges: parsed.edges, model: MODEL_SMART },
    create: {
      documentId,
      nodes: parsed.nodes,
      edges: parsed.edges,
      model: MODEL_SMART,
    },
  });
}
