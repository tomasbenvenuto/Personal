"use client";

import { useState } from "react";
import type { ExamQuestion } from "@/lib/ai/exam";

type GradedQuestion = {
  questionId: string;
  correct: boolean;
  pointsAwarded: number;
  pointsPossible: number;
  feedback: string;
};

type Result = { score: number; gradedDetail: GradedQuestion[] };

const TYPE_LABEL: Record<ExamQuestion["type"], string> = {
  multiple_choice: "Opción múltiple",
  true_false: "Verdadero o falso",
  short_answer: "Respuesta corta",
};

export function ExamRunner({
  examId,
  questions,
}: {
  examId: string;
  questions: ExamQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error("No se pudo corregir el examen.");
      const attempt = await res.json();
      setResult({ score: attempt.score, gradedDetail: attempt.gradedDetail });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al corregir.");
    } finally {
      setSubmitting(false);
    }
  }

  function gradedFor(id: string) {
    return result?.gradedDetail.find((g) => g.questionId === id);
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium">
            Puntaje: {Math.round(result.score)}%
          </p>
        </div>
      )}

      {questions.map((q, qIndex) => {
        const graded = gradedFor(q.id);
        return (
          <div
            key={q.id}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
              {TYPE_LABEL[q.type]} · {q.points} pt{q.points === 1 ? "" : "s"}
            </p>
            <p className="mb-3 text-sm font-medium">
              {qIndex + 1}. {q.question}
            </p>

            {q.type === "multiple_choice" && (
              <div className="space-y-2">
                {(q.choices ?? []).map((choice, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      disabled={!!result}
                      checked={answers[q.id] === String(i)}
                      onChange={() => setAnswer(q.id, String(i))}
                    />
                    {choice}
                  </label>
                ))}
              </div>
            )}

            {q.type === "true_false" && (
              <div className="flex gap-2">
                {[
                  { value: "true", label: "Verdadero" },
                  { value: "false", label: "Falso" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      disabled={!!result}
                      checked={answers[q.id] === opt.value}
                      onChange={() => setAnswer(q.id, opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}

            {q.type === "short_answer" && (
              <textarea
                disabled={!!result}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={3}
                placeholder="Tu respuesta"
                className="w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-neutral-500 focus:outline-none disabled:bg-neutral-50"
              />
            )}

            {graded && (
              <p
                className={`mt-3 rounded-md p-2 text-xs ${
                  graded.correct
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {graded.correct ? "✓ Correcto" : "✗ Incorrecto"} —{" "}
                {graded.feedback}
              </p>
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!result && (
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Corrigiendo…" : "Entregar examen"}
        </button>
      )}
    </div>
  );
}
