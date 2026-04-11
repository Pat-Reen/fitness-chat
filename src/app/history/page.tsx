"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { WorkoutRecord } from "@/types";

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
      }
      setLoading(false);
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading history...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#166534]">History</h1>
          <a href="/" className="text-xs text-gray-500 hover:text-[#166534] transition-colors">
            ← Back
          </a>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm">No saved workouts yet.</p>
            <p className="text-xs mt-1">
              Generate a workout and hit &quot;Save&quot; to record it here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {records.map((r, i) => (
              <li
                key={r.id ?? i}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{r.type === "run" ? "🏃" : "🏋️"}</span>
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {r.summary}
                      </span>
                    </div>
                    {r.exercises && r.exercises.length > 0 && (
                      <p className="text-xs text-gray-500 truncate">
                        {r.exercises.slice(0, 5).join(" · ")}
                        {r.exercises.length > 5 ? ` +${r.exercises.length - 5}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {formatDate(r.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
