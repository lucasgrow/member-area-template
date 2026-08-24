"use client";

import { useRef } from "react";

const DIRECT_VIDEO = /\.(mp4|webm|ogg)(?:\?|$)/i;

export function LessonVideo({
  lessonId,
  videoUrl,
  initialPosition,
}: {
  lessonId: string;
  videoUrl: string;
  initialPosition: number;
}) {
  const maxPosition = useRef(initialPosition);
  const lastSent = useRef(initialPosition);
  const pendingPlays = useRef(0);

  if (!DIRECT_VIDEO.test(videoUrl)) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg bg-black">
        <iframe
          src={videoUrl}
          title="Lesson video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  async function persist(video: HTMLVideoElement, watchedToEnd = false) {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const current = Math.max(0, Math.floor(video.currentTime));
    maxPosition.current = Math.max(maxPosition.current, current);
    const percent = duration > 0 ? Math.min(100, Math.floor((maxPosition.current / duration) * 100)) : 0;
    const delta = Math.max(0, current - lastSent.current);
    lastSent.current = current;
    await fetch("/api/video/watch-state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId,
        lastPositionSeconds: current,
        maxPositionSeconds: maxPosition.current,
        maxPercentWatched: watchedToEnd ? 100 : percent,
        totalWatchTimeDelta: delta,
        playCountDelta: pendingPlays.current,
        watchedToEnd,
      }),
      keepalive: true,
    });
    pendingPlays.current = 0;
  }

  return (
    <video
      controls
      preload="metadata"
      className="aspect-video w-full rounded-lg bg-black"
      src={videoUrl}
      onLoadedMetadata={(event) => {
        event.currentTarget.currentTime = Math.min(initialPosition, event.currentTarget.duration || initialPosition);
      }}
      onPlay={() => {
        pendingPlays.current += 1;
      }}
      onTimeUpdate={(event) => {
        const current = Math.floor(event.currentTarget.currentTime);
        if (current - lastSent.current >= 10) void persist(event.currentTarget);
      }}
      onPause={(event) => void persist(event.currentTarget)}
      onEnded={(event) => void persist(event.currentTarget, true)}
    />
  );
}
