"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { AppState, UserProfile } from "@/types";

const PINNED_KEY = "fitness_chat_pinned";

interface Props {
  user: UserProfile;
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  onRegenerate: () => void;
  onReset: () => void;
}

/** Shows the GCS exercise image; falls back to an inline text label on error. */
function ExerciseImage({ src, alt }: { src?: string | Blob; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const srcStr = typeof src === "string" ? src : undefined;
  if (failed || !srcStr) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400 border border-gray-200 rounded px-2 py-0.5">
        [{alt ?? "image"}]
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={srcStr} alt={alt ?? ""} onError={() => setFailed(true)} />
  );
}

/** Animated placeholder shown while the workout is still streaming. */
function WorkoutSkeleton() {
  return (
    <div className="animate-pulse space-y-5 py-2">
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-3/6" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-2/5" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-2/6" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-1/4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <p className="text-xs text-gray-400 text-center pt-2">Generating your workout…</p>
    </div>
  );
}

export default function WorkoutDisplay({ user, state, setState, onRegenerate, onReset }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  // Check if this exact content is already pinned
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { content: string };
        setPinned(p.content === state.generatedContent);
      }
    } catch {}
  }, [state.generatedContent]);

  function handlePin() {
    if (!state.generatedContent) return;
    const title =
      state.workoutMode === "muscle_group"
        ? `${state.focusGroups.join(" · ")} · ${state.duration}`
        : `${state.selectedEquipment.slice(0, 2).join(" · ")} · ${state.duration}`;
    localStorage.setItem(
      PINNED_KEY,
      JSON.stringify({ type: "workout", content: state.generatedContent, pinnedAt: Date.now(), title }),
    );
    setPinned(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/workout/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "workout",
          mode: state.workoutMode,
          duration: state.duration,
          focusGroups: state.focusGroups,
          exercises: state.selectedExercises,
          equipment: state.selectedEquipment,
          goal: state.goal,
          experience: state.experience,
          markdownText: state.generatedContent,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const isStreaming = !state.generatedContent;

  return (
    <div className="space-y-0">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-2 -mx-4 px-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRegenerate}
            disabled={isStreaming}
            className="px-4 py-2 text-xs font-medium border border-[#166534] text-[#166534] rounded-lg hover:bg-[#f0fdf4] transition-colors disabled:opacity-50"
          >
            Regenerate
            {state.variation > 0 && (
              <span className="ml-1 text-gray-400">#{state.variation}</span>
            )}
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            New workout
          </button>
          <button
            onClick={handlePin}
            disabled={isStreaming || pinned}
            title="Pin for offline use at the gym"
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
              pinned
                ? "border-amber-300 text-amber-700 bg-amber-50"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {pinned ? "Pinned" : "Pin"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved || isStreaming}
            className={`ml-auto px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              saved
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-[#166534] text-white hover:bg-[#14532d] disabled:opacity-50"
            }`}
          >
            {saved ? "Saved!" : saving ? "Saving…" : "Save workout"}
          </button>
        </div>
        {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}
      </div>

      {/* Content */}
      <div className="workout-content prose-sm max-w-none">
        {isStreaming ? (
          <WorkoutSkeleton />
        ) : (
          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{ img: ({ src, alt }) => <ExerciseImage src={src} alt={alt} /> }}
          >
            {state.generatedContent}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
