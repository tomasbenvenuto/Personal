"use client";

import { useState } from "react";

type ReviewCard = {
  id: string;
  question: string;
  answer: string;
  documentTitle: string;
};

const RATING_BUTTONS: { label: string; quality: number; className: string }[] = [
  { label: "Otra vez", quality: 0, className: "bg-red-100 text-red-700 hover:bg-red-200" },
  { label: "Difícil", quality: 3, className: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
  { label: "Bien", quality: 4, className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  { label: "Fácil", quality: 5, className: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
];

export function ReviewSession({ initialCards }: { initialCards: ReviewCard[] }) {
  const [queue, setQueue] = useState(initialCards);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const current = queue[0];

  async function rate(quality: number) {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/flashcards/${current.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
      setQueue((prev) => prev.slice(1));
      setReviewedCount((n) => n + 1);
      setShowAnswer(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
        <p className="text-sm text-neutral-600">
          {reviewedCount > 0
            ? `¡Listo! Repasaste ${reviewedCount} tarjeta${reviewedCount === 1 ? "" : "s"}.`
            : "No hay flashcards pendientes de repaso hoy."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-400">
        {queue.length} pendiente{queue.length === 1 ? "" : "s"} · {current.documentTitle}
      </p>

      <div className="min-h-48 rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-base font-medium">{current.question}</p>
        {showAnswer && (
          <p className="mt-4 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
            {current.answer}
          </p>
        )}
      </div>

      {!showAnswer ? (
        <button
          type="button"
          onClick={() => setShowAnswer(true)}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Mostrar respuesta
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATING_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              type="button"
              disabled={submitting}
              onClick={() => rate(btn.quality)}
              className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${btn.className}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
