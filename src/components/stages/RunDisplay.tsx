"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { AppState, UserProfile } from "@/types";

const PINNED_KEY = "fitness_chat_pinned";

interface Props {
  user: UserProfile;
  state: AppState;
  onRegenerate: () => void;
  onReset: () => void;
}

export default function RunDisplay({ user, state, onRegenerate, onReset }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

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
    const type = state.runType !== "Any" ? `${state.runType} ` : "";
    const title = `${state.runDistance} ${type}run`;
    localStorage.setItem(
      PINNED_KEY,
      JSON.stringify({ type: "run", content: state.generatedContent, pinnedAt: Date.now(), title }),
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
          type: "run",
          distance: state.runDistance,
          runType: state.runType,
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
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onRegenerate}
          className="px-4 py-2 text-xs font-medium border border-[#166534] text-[#166534] rounded-lg hover:bg-[#f0fdf4] transition-colors"
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
          New plan
        </button>
        <button
          onClick={handlePin}
          disabled={!state.generatedContent || pinned}
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
          disabled={saving || saved || !state.generatedContent}
          className={`ml-auto px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
            saved
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-[#166534] text-white hover:bg-[#14532d] disabled:opacity-50"
          }`}
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save plan"}
        </button>
      </div>
      {saveError && <p className="text-xs text-red-500">{saveError}</p>}

      <div className="workout-content prose-sm max-w-none">
        {state.generatedContent ? (
          <ReactMarkdown>{state.generatedContent}</ReactMarkdown>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">🏃</div>
            <p className="text-sm">Generating your run plan...</p>
          </div>
        )}
      </div>
    </div>
  );
}
