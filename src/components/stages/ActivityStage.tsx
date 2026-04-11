"use client";

import { useEffect, useState } from "react";
import type { Activity, AppState, UserProfile } from "@/types";

interface Props {
  user: UserProfile;
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  onNext: (type: "workout" | "run") => void;
}

function formatActivity(a: Activity): string {
  const parts = [a.type];
  if (a.duration) parts.push(a.duration);
  if (a.distance) parts.push(a.distance);
  if (a.pace) parts.push(`@ ${a.pace}`);
  if (a.heartRate) parts.push(a.heartRate);
  if (a.calories) parts.push(`${a.calories} kcal`);
  if (a.trainingEffect) parts.push(a.trainingEffect);
  if (a.elevationGain) parts.push(a.elevationGain);
  return parts.join(" · ");
}

export default function ActivityStage({ user, state, setState, onNext }: Props) {
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fitbitNeedsAuth, setFitbitNeedsAuth] = useState(false);

  useEffect(() => {
    if (state.activities.length > 0 || state.activitiesLoading) return;

    setState({ activitiesLoading: true });
    setFetchError(null);

    const endpoint =
      user.platform === "fitbit" ? "/api/fitbit/activities" : "/api/garmin";

    fetch(endpoint)
      .then((r) => {
        if (r.status === 401 && user.platform === "fitbit") {
          setFitbitNeedsAuth(true);
          return { activities: [] };
        }
        if (!r.ok) throw new Error(`Failed: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setState({
          activities: data.activities ?? [],
          activitiesLoading: false,
        });
      })
      .catch((e) => {
        setFetchError(e.message);
        setState({ activitiesLoading: false });
      });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          Signed in as{" "}
          <span className="font-medium text-gray-700">{user.displayName}</span>
          {" · "}
          <span className="text-[#166534] capitalize">{user.platform}</span>
        </p>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity (last 7 days)</h2>
        {state.activitiesLoading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading activities...</p>
        ) : fitbitNeedsAuth ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <p className="text-amber-800 mb-3">
              Connect your Fitbit account to see recent activities.
            </p>
            <a
              href="/api/fitbit/auth"
              className="inline-block px-4 py-2 bg-[#166534] text-white rounded-lg text-sm font-medium hover:bg-[#14532d] transition-colors"
            >
              Connect Fitbit
            </a>
          </div>
        ) : fetchError ? (
          <p className="text-sm text-red-500 py-2">{fetchError}</p>
        ) : state.activities.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No recent activities found.</p>
        ) : (
          <ul className="space-y-1.5">
            {state.activities.map((a, i) => (
              <li key={i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                <span className="font-medium text-gray-800">{a.date}</span>
                {" — "}
                {formatActivity(a)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action selection */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">What are you planning today?</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNext("workout")}
            className="px-4 py-4 border-2 border-[#166534] rounded-xl text-[#166534] font-semibold hover:bg-[#f0fdf4] transition-colors text-sm"
          >
            🏋️ Workout
          </button>
          <button
            onClick={() => onNext("run")}
            className="px-4 py-4 border-2 border-[#166534] rounded-xl text-[#166534] font-semibold hover:bg-[#f0fdf4] transition-colors text-sm"
          >
            🏃 Run
          </button>
        </div>
      </div>
    </div>
  );
}
