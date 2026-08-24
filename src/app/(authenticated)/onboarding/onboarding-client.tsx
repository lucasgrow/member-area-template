"use client";

import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OnboardingClient() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/onboarding/complete", { method: "POST" });
    if (!response.ok) {
      setError("Could not complete onboarding. Try again.");
      setPending(false);
      return;
    }
    router.push("/courses");
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-default-500">First access</p>
        <h1 className="text-3xl font-semibold">Your learning area is ready</h1>
        <p className="text-default-500">
          Your account and access level have been configured. Continue to the course library.
        </p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button
        color="primary"
        isLoading={pending}
        endContent={!pending ? <Icon icon="solar:arrow-right-linear" width={18} /> : null}
        onPress={complete}
      >
        Open courses
      </Button>
    </div>
  );
}
