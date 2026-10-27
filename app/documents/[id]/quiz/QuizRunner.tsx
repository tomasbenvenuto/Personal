"use client";

import { useMemo, useState } from "react";

type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return null;
    const correct = questions.filter(
      (q) => answers[q.id] === q.correctIndex,
    ).length;
    return { correct, total: questions.length };
  }, [submitted, answers, questions]);

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-6">
      {score && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium">
            Puntaje: {score.correct} / {score.total} (
            {Math.round((score.correct / score.total) * 100)}%)
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 text-xs text-neutral-500 underline hover:text-neutral-900"
          >
            Reintentar
          </button>
        </div>
      )}

      {questions.map((q, qIndex) => {
        const selected = answers[q.id];
        return (
          <div
            key={q.id}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="mb-3 text-sm font-medium">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.choices.map((choice, i) => {
                const isSelected = selected === i;
                const isCorrect = i === q.correctIndex;
                let stateClass = "border-neutral-200 hover:bg-neutral-50";
                if (submitted && isCorrect) {
                  stateClass = "border-emerald-400 bg-emerald-50";
                } else if (submitted && isSelected && !isCorrect) {
                  stateClass = "border-red-400 bg-red-50";
                } else if (!submitted && isSelected) {
                  stateClass = "border-neutral-900 bg-neutral-50";
                }
                return (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${stateClass}`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      disabled={submitted}
                      checked={isSelected}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: i }))
                      }
                    />
                    {choice}
                  </label>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-3 text-xs text-neutral-500">{q.explanation}</p>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button
          type="button"
          disabled={Object.keys(answers).length !== questions.length}
          onClick={() => setSubmitted(true)}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Corregir
        </button>
      )}
    </div>
  );
}
