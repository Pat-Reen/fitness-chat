"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { WorkoutRecord, Activity } from "@/types";
import { formatActivity } from "@/lib/format-activity";

type HistoryItem =
  | { kind: "workout"; record: WorkoutRecord; sortKey: number }
  | { kind: "activity"; activity: Activity; sortKey: number };

function relativeDate(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function absoluteDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function activityIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("run") || t.includes("jog")) return "🏃";
  if (t.includes("walk")) return "🚶";
  if (t.includes("cycle") || t.includes("bike") || t.includes("spin")) return "🚴";
  if (t.includes("swim")) return "🏊";
  return "⚡";
}

export default function HistoryPage() {
  const router = useRouter();
  const { status } = useSession();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    fetch("/api/history")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;

        const workoutItems: HistoryItem[] = (data.records as WorkoutRecord[]).map((r) => ({
          kind: "workout",
          record: r,
          sortKey: r.createdAt,
        }));

        const activityItems: HistoryItem[] = (data.trackerActivities as Activity[]).map((a) => ({
          kind: "activity",
          activity: a,
          // Use noon on the activity date so same-day sorting is stable
          sortKey: new Date(`${a.date}T12:00:00`).getTime(),
        }));

        const merged = [...workoutItems, ...activityItems].sort((a, b) => b.sortKey - a.sortKey);
        setItems(merged);
        setLoading(false);
      });
  }, [status, router]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading history…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#166534]">History</h1>
          <a href="/" className="text-xs text-gray-500 hover:text-[#166534] transition-colors">← Back</a>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm">No activity yet.</p>
            <p className="text-xs mt-1">Generate a workout and hit &quot;Save&quot; to record it here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, i) => {
              if (item.kind === "workout") {
                const r = item.record;
                return (
                  <li key={r.id ?? i} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{r.type === "run" ? "🏃" : "🏋️"}</span>
                          <span className="text-xs font-semibold text-gray-800 truncate">{r.summary}</span>
                        </div>
                        {r.exercises && r.exercises.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {r.exercises.slice(0, 5).join(" · ")}
                            {r.exercises.length > 5 ? ` +${r.exercises.length - 5}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className="text-xs text-gray-700 font-medium"
                          title={absoluteDate(r.createdAt)}
                        >
                          {relativeDate(r.createdAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              }

              // Tracker-only activity (no saved workout that day)
              const a = item.activity;

              return (
                <li key={`activity-${i}`} className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{activityIcon(a.type)}</span>
                        <span className="text-xs text-gray-700 truncate">{formatActivity(a)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="text-xs text-gray-500"
                        title={a.date}
                      >
                        {relativeDate(new Date(`${a.date}T12:00:00`).getTime())}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
