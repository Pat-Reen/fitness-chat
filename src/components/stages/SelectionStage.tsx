"use client";

import { useState, useEffect } from "react";
import type { AppState } from "@/types";
import { EXERCISES, MUSCLE_GROUPS } from "@/lib/exercises";

interface Props {
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SelectionStage({ state, setState, onNext, onBack }: Props) {
  const [otherGroup, setOtherGroup] = useState<string | null>(null);

  // Initialise selected exercises from focus groups on mount / when focus changes
  useEffect(() => {
    if (state.selectedExercises.length === 0 && state.focusGroups.length > 0) {
      const initial = Array.from(
        new Set(state.focusGroups.flatMap((g) => EXERCISES[g] ?? []))
      );
      setState({ selectedExercises: initial });
    }
  }, [state.focusGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExercise(name: string) {
    const current = state.selectedExercises;
    const next = current.includes(name)
      ? current.filter((e) => e !== name)
      : [...current, name];
    setState({ selectedExercises: next });
  }

  function toggleFocusGroup(group: string) {
    const current = state.focusGroups;
    const isSelected = current.includes(group);
    let next: string[];

    if (isSelected) {
      next = current.filter((g) => g !== group);
      // Remove exercises that only belong to removed group
      const remaining = next.flatMap((g) => EXERCISES[g] ?? []);
      const filtered = state.selectedExercises.filter(
        (e) => remaining.includes(e) || !Object.values(EXERCISES).flat().includes(e)
      );
      setState({ focusGroups: next, selectedExercises: filtered });
      return;
    } else if (current.length >= 3) {
      return; // Max 3 groups
    } else {
      next = [...current, group];
    }

    const newExercises = Array.from(
      new Set([...state.selectedExercises, ...(EXERCISES[group] ?? [])])
    );
    setState({ focusGroups: next, selectedExercises: newExercises });
  }

  const mainExercises = Array.from(
    new Set(state.focusGroups.flatMap((g) => EXERCISES[g] ?? []))
  );
  const otherExercises = otherGroup
    ? (EXERCISES[otherGroup] ?? []).filter((e) => !mainExercises.includes(e))
    : [];
  const otherGroups = MUSCLE_GROUPS.filter((g) => !state.focusGroups.includes(g));

  return (
    <div className="space-y-5">
      {/* Focus groups */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Focus areas{" "}
          <span className="text-gray-400 font-normal">(up to 3)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((g) => {
            const active = state.focusGroups.includes(g);
            const disabled = !active && state.focusGroups.length >= 3;
            return (
              <button
                key={g}
                disabled={disabled}
                onClick={() => toggleFocusGroup(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-[#166534] border-[#166534] text-white"
                    : disabled
                    ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-300 text-gray-600 hover:border-[#166534]"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected exercises */}
      {mainExercises.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Selected exercises{" "}
            <span className="text-gray-400 font-normal">
              ({state.selectedExercises.length} selected)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {mainExercises.map((e) => {
              const selected = state.selectedExercises.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => toggleExercise(e)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    selected
                      ? "bg-[#dcfce7] border-[#166534] text-[#166534] font-medium"
                      : "bg-white border-gray-200 text-gray-400 line-through"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add from other groups */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Add from other groups
        </h2>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {otherGroups.map((g) => (
            <button
              key={g}
              onClick={() => setOtherGroup(otherGroup === g ? null : g)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                otherGroup === g
                  ? "bg-gray-800 border-gray-800 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {otherGroup && otherExercises.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {otherExercises.map((e) => {
              const selected = state.selectedExercises.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => toggleExercise(e)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    selected
                      ? "bg-[#dcfce7] border-[#166534] text-[#166534]"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>
        )}
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
          disabled={state.selectedExercises.length === 0}
          className="flex-1 py-2.5 bg-[#166534] text-white rounded-xl text-sm font-semibold hover:bg-[#14532d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Build Workout
        </button>
      </div>
    </div>
  );
}
