"use client";

import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useState } from "react";

export function LessonActions({
  courseSlug,
  lessonId,
  initialCompleted,
}: {
  courseSlug: string;
  lessonId: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const response = await fetch(
      `/api/courses/${courseSlug}/lessons/${lessonId}/complete`,
      { method: completed ? "DELETE" : "POST" },
    );
    if (response.ok) setCompleted(!completed);
    setPending(false);
  }

  return (
    <Button
      color={completed ? "success" : "primary"}
      variant={completed ? "flat" : "solid"}
      isLoading={pending}
      startContent={!pending ? (
        <Icon icon={completed ? "solar:check-circle-bold" : "solar:check-circle-linear"} width={19} />
      ) : null}
      onPress={toggle}
    >
      {completed ? "Completed" : "Mark complete"}
    </Button>
  );
}
