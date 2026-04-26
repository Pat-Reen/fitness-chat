"use client";

import type { AppState, Goal, Experience, RunDistance, RunType, WorkoutMode } from "@/types";

const GOALS: Goal[] = ["Muscle", "Weight Loss", "Endurance", "General Fitness"];
const EXPERIENCES: Experience[] = ["Beginner", "Intermediate", "Advanced"];
const DURATIONS = ["30 min", "45 min", "60 min", "90 min"];
const RUN_DISTANCES: (RunDistance | string)[] = ["2k", "5k", "8k", "10k", "12k", "14k", "Other"];
const RUN_TYPES: RunType[] = ["Any", "Flat", "Hills", "Sprints"];

interface Props {
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function Chip<T extends string>({
  value,
  active,
  onClick,
}: {
  value: T;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-[#166534] border-[#166534] text-white"
          : "bg-white border-gray-300 text-gray-600 hover:border-[#166534]"
      }`}
    >
      {value}
    </button>
  );
}

export default function PreferencesStage({ state, setState, onNext, onBack }: Props) {
  const isRun = state.activityType === "run";

  const canProceed = isRun
    ? !!state.runDistance
    : !!state.goal && !!state.experience && !!state.duration;

  return (
    <div className="space-y-6">
      {/* Goal */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Goal</label>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip
              key={g}
              value={g}
              active={state.goal === g}
              onClick={() => setState({ goal: g })}
            />
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Experience</label>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCES.map((e) => (
            <Chip
              key={e}
              value={e}
              active={state.experience === e}
              onClick={() => setState({ experience: e })}
            />
          ))}
        </div>
      </div>

      {isRun ? (
        <>
          {/* Distance */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Distance</label>
            <div className="flex flex-wrap gap-2">
              {RUN_DISTANCES.map((d) => (
                <Chip
                  key={d}
                  value={d}
                  active={state.runDistance === d}
                  onClick={() => setState({ runDistance: d })}
                />
              ))}
            </div>
            {state.runDistance === "Other" && (
              <input
                type="text"
                placeholder="e.g. 3k, 20k"
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#166534]"
                onChange={(e) => setState({ runDistance: e.target.value })}
              />
            )}
          </div>

          {/* Run type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Run type</label>
            <div className="flex flex-wrap gap-2">
              {RUN_TYPES.map((t) => (
                <Chip
                  key={t}
                  value={t}
                  active={state.runType === t}
                  onClick={() => setState({ runType: t })}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Session duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  value={d}
                  active={state.duration === d}
                  onClick={() => setState({ duration: d })}
                />
              ))}
            </div>
          </div>

          {/* Workout mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Workout style</label>
            <div className="flex gap-2">
              {(["muscle_group", "equipment"] as WorkoutMode[]).map((m) => (
                <Chip
                  key={m}
                  value={m === "muscle_group" ? "By muscle group" : "By equipment"}
                  active={state.workoutMode === m}
                  onClick={() => setState({ workoutMode: m })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Restrictions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Injuries / limitations{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          maxLength={200}
          placeholder="e.g. left knee pain, avoid overhead pressing"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#166534] resize-none"
          value={state.restrictions}
          onChange={(e) => setState({ restrictions: e.target.value })}
        />
        <p className="text-right text-xs text-gray-400 mt-0.5">
          {state.restrictions.length}/200
        </p>
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-2.5 bg-[#166534] text-white rounded-xl text-sm font-semibold hover:bg-[#14532d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
