"use client";

import { useState, useEffect } from "react";
import type { AppState } from "@/types";

interface Props {
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  equipment: string[];
  onNext: () => void;
  onBack: () => void;
}

export default function EquipmentStage({ state, setState, equipment, onNext, onBack }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded && equipment.length > 0 && state.selectedEquipment.length === 0) {
      // Pre-select all by default
      setState({ selectedEquipment: [...equipment] });
      setLoaded(true);
    }
  }, [equipment]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(item: string) {
    const current = state.selectedEquipment;
    setState({
      selectedEquipment: current.includes(item)
        ? current.filter((e) => e !== item)
        : [...current, item],
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Select available equipment
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Deselect anything you don&apos;t have access to.
        </p>
        <div className="flex flex-wrap gap-2">
          {equipment.map((item) => {
            const active = state.selectedEquipment.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  active
                    ? "bg-[#dcfce7] border-[#166534] text-[#166534] font-medium"
                    : "bg-white border-gray-200 text-gray-400 line-through"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
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
          disabled={state.selectedEquipment.length === 0}
          className="flex-1 py-2.5 bg-[#166534] text-white rounded-xl text-sm font-semibold hover:bg-[#14532d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Build Workout
        </button>
      </div>
    </div>
  );
}
