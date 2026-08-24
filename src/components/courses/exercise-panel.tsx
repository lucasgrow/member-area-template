"use client";

import { Checkbox } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

type ExerciseStep = { title: string; description?: string };

export function ExercisePanel({ lessonId, exerciseData }: { lessonId: string; exerciseData: string }) {
  const steps = useMemo(() => {
    try {
      const parsed = JSON.parse(exerciseData) as { steps?: ExerciseStep[] };
      return Array.isArray(parsed.steps) ? parsed.steps : [];
    } catch {
      return [];
    }
  }, [exerciseData]);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    void fetch(`/api/lessons/${lessonId}/exercise-progress`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          Array.isArray((data as { completedSteps?: unknown }).completedSteps)
        ) {
          setCompleted((data as { completedSteps: number[] }).completedSteps);
        }
      });
  }, [lessonId]);

  async function toggle(index: number) {
    const next = completed.includes(index)
      ? completed.filter((item) => item !== index)
      : [...completed, index].sort((a, b) => a - b);
    setCompleted(next);
    await fetch(`/api/lessons/${lessonId}/exercise-progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedSteps: next, quizAnswers: {} }),
    });
  }

  if (steps.length === 0) return null;
  return (
    <section className="space-y-4 border-t border-divider pt-6">
      <h2 className="text-xl font-semibold">Exercise</h2>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <label key={`${step.title}-${index}`} className="flex gap-3 rounded-lg border border-divider p-4">
            <Checkbox isSelected={completed.includes(index)} onValueChange={() => void toggle(index)} />
            <span>
              <span className="block font-medium">{step.title}</span>
              {step.description ? <span className="text-sm text-default-500">{step.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
