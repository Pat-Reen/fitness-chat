"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

const PINNED_KEY = "fitness_chat_pinned";

interface PinnedWorkout {
  type: "workout" | "run";
  content: string;
  pinnedAt: number;
  title: string;
}

export default function PinnedPage() {
  const [pinned, setPinned] = useState<PinnedWorkout | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY);
      if (raw) setPinned(JSON.parse(raw) as PinnedWorkout);
    } catch {}
    setReady(true);
  }, []);

  function handleUnpin() {
    localStorage.removeItem(PINNED_KEY);
    setPinned(null);
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#166534]">Pinned</h1>
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-[#166534] transition-colors"
          >
            Back to app
          </a>
        </div>

        {!pinned ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📌</div>
            <p className="text-sm font-medium text-gray-500 mb-1">No workout pinned</p>
            <p className="text-xs text-gray-400">
              Generate a workout and tap <strong>Pin</strong> before heading to the gym.
              It will be available here even without internet.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{pinned.title}</p>
                <p className="text-xs text-gray-400">
                  Pinned {new Date(pinned.pinnedAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={handleUnpin}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Unpin
              </button>
            </div>

            <div className="workout-content prose-sm max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {pinned.content}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
