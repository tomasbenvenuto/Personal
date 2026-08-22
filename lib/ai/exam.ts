import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL_FAST, MODEL_SMART } from "@/lib/anthropic";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  chunkText,
  estimateTokens,
  SINGLE_CALL_TOKEN_THRESHOLD,
} from "@/lib/chunking";
import { mapWithConcurrency } from "@/lib/concurrency";

const QUESTION_TYPES = ["multiple_choice", "true_false", "short_answer"] as const;
export type ExamQuestionType = (typeof QUESTION_TYPES)[number];

export type ExamQuestion = {
  id: string;
  type: ExamQuestionType;
  question: string;
  choices?: string[];
  /** Index-as-string for multiple_choice, "true"/"false", or a model
   *  answer used as a grading reference for short_answer. */
  correctAnswer: string;
  explanation: string;
  points: number;
};

const ExamQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  question: z.string(),
  choices: z.array(z.string()).optional(),
  correctAnswer: z.string(),
  explanation: z.string(),
  points: z.number().min(1).max(10).default(1),
});

const ExamSchema = z.object({
  questions: z.array(ExamQuestionSchema).min(3).max(40),
});

const EXAM_SYSTEM_PROMPT = `Sos un asistente de estudio. Generá un simulacro de examen en español a partir del texto que te paso, simulando un parcial real: combiná preguntas de opción múltiple, verdadero/falso y respuesta corta, en proporción a la profundidad del contenido. Para las de opción múltiple, "choices" tiene que tener 4 opciones y "correctAnswer" el índice (como string, "0" a "3") de la correcta. Para verdadero/falso, "correctAnswer" tiene que ser "true" o "false". Para las de respuesta corta, "correctAnswer" tiene que ser una respuesta modelo que se va a usar como referencia para corregir. Generá ${"{count}"} preguntas en total.`;

async function generateQuestionsForText(
  text: string,
  count: string,
): Promise<ExamQuestion[]> {
  const message = await anthropic.messages.parse({
    model: MODEL_SMART,
    max_tokens: 4000,
    system: EXAM_SYSTEM_PROMPT.replace("{count}", count),
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(ExamSchema) },
  });
  const questions = message.parsed_output?.questions ?? [];
  // Assign our own ids rather than trusting the model — needed for
  // uniqueness across chunks on long documents.
  return questions.map((q) => ({ ...q, id: randomUUID() }));
}

export async function generateExam(documentId: string) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
  });
  const text = document.extractedText;
  if (!text) throw new Error("El documento todavía no tiene texto extraído.");

  let questions: ExamQuestion[];
  if (estimateTokens(text) > SINGLE_CALL_TOKEN_THRESHOLD) {
    const chunks = chunkText(text);
    const perChunk = await mapWithConcurrency(chunks, 5, (chunk) =>
      generateQuestionsForText(chunk, "4 a 8"),
    );
    questions = perChunk.flat();
  } else {
    questions = await generateQuestionsForText(text, "10 a 20");
  }

  if (questions.length === 0) {
    throw new Error("La IA no generó preguntas para el simulacro.");
  }

  return prisma.examSimulation.create({
    data: {
      documentId,
      title: `Simulacro: ${document.title}`,
      questions,
      model: MODEL_SMART,
    },
  });
}

const GradeSchema = z.object({
  isCorrect: z.boolean(),
  feedback: z.string(),
});

type GradedQuestion = {
  questionId: string;
  correct: boolean;
  pointsAwarded: number;
  pointsPossible: number;
  feedback: string;
};

async function gradeShortAnswer(
  question: ExamQuestion,
  studentAnswer: string,
): Promise<GradedQuestion> {
  const message = await anthropic.messages.parse({
    model: MODEL_FAST,
    max_tokens: 300,
    system:
      "Sos un asistente que corrige respuestas de examen. Te paso la pregunta, una respuesta modelo de referencia, y la respuesta del estudiante. Decidí si la respuesta del estudiante es correcta (aceptá respuestas equivalentes aunque estén redactadas distinto) y das un feedback breve en español.",
    messages: [
      {
        role: "user",
        content: `Pregunta: ${question.question}\nRespuesta modelo: ${question.correctAnswer}\nRespuesta del estudiante: ${studentAnswer || "(sin responder)"}`,
      },
    ],
    output_config: { format: zodOutputFormat(GradeSchema) },
  });
  const parsed = message.parsed_output;
  const correct = parsed?.isCorrect ?? false;
  return {
    questionId: question.id,
    correct,
    pointsAwarded: correct ? question.points : 0,
    pointsPossible: question.points,
    feedback: parsed?.feedback ?? "",
  };
}

function gradeClosedQuestion(
  question: ExamQuestion,
  studentAnswer: string,
): GradedQuestion {
  const correct = studentAnswer?.trim() === question.correctAnswer?.trim();
  return {
    questionId: question.id,
    correct,
    pointsAwarded: correct ? question.points : 0,
    pointsPossible: question.points,
    feedback: question.explanation,
  };
}

export async function gradeExamAttempt(
  questions: ExamQuestion[],
  answers: Record<string, string>,
) {
  const graded = await mapWithConcurrency(questions, 5, (question) => {
    const studentAnswer = answers[question.id] ?? "";
    return question.type === "short_answer"
      ? gradeShortAnswer(question, studentAnswer)
      : Promise.resolve(gradeClosedQuestion(question, studentAnswer));
  });

  const pointsAwarded = graded.reduce((sum, g) => sum + g.pointsAwarded, 0);
  const pointsPossible = graded.reduce((sum, g) => sum + g.pointsPossible, 0);
  const score = pointsPossible > 0 ? (pointsAwarded / pointsPossible) * 100 : 0;

  return { gradedDetail: graded, score };
}
