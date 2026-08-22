// Classic SM-2 spaced-repetition algorithm.
// quality: 0-5. The review UI maps its four buttons to:
//   Otra vez=0, Difícil=3, Bien=4, Fácil=5.

export type SM2State = {
  easeFactor: number;
  interval: number;
  repetitions: number;
};

export type SM2Result = SM2State & { dueDate: Date };

export function sm2(state: SM2State, quality: number): SM2Result {
  let { easeFactor, interval, repetitions } = state;

  if (quality < 3) {
    // Failed recall: start the interval over, but keep the ease factor
    // update below so a hard card still drifts toward a lower ease.
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return { easeFactor, interval, repetitions, dueDate };
}
