"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { AppState, UserProfile } from "@/types";

interface Props {
  user: UserProfile;
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  onRegenerate: () => void;
  onReset: () => void;
}

export default function WorkoutDisplay({ user, state, setState, onRegenerate, onReset }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onRegenerate}
          disabled={!!state.generatedContent && state.generatedContent.endsWith("…")}
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
          onClick={handleSave}
          disabled={saving || saved || !state.generatedContent}
          className={`ml-auto px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            saved
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-[#166534] text-white hover:bg-[#14532d] disabled:opacity-50"
          }`}
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save workout"}
        </button>
      </div>
      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      {/* Content */}
      <div className="workout-content prose-sm max-w-none">
        {state.generatedContent ? (
          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
            {state.generatedContent}
          </ReactMarkdown>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">🏋️</div>
            <p className="text-sm">Generating your workout...</p>
          </div>
        )}
      </div>
    </div>
  );
}
