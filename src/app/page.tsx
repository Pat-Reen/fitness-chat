"use client";

import { useEffect, useReducer, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppState, UserProfile } from "@/types";
import { INITIAL_STATE } from "@/types";

import StepIndicator from "@/components/StepIndicator";
import ActivityStage from "@/components/stages/ActivityStage";
import PreferencesStage from "@/components/stages/PreferencesStage";
import SelectionStage from "@/components/stages/SelectionStage";
import EquipmentStage from "@/components/stages/EquipmentStage";
import WorkoutDisplay from "@/components/stages/WorkoutDisplay";
import RunDisplay from "@/components/stages/RunDisplay";

// ---------------------------------------------------------------------------
// State reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, patch: Partial<AppState>): AppState {
  return { ...state, ...patch };
}

// ---------------------------------------------------------------------------
// Streaming helper
// ---------------------------------------------------------------------------

async function streamToState(
  response: Response,
  onChunk: (text: string) => void
) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(full);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  const setState = useCallback(
    (patch: Partial<AppState>) => dispatch(patch),
    []
  );

  // Load auth state + user profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }
      // Load user profile from Firestore
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (!snap.exists()) {
        router.push("/login");
        return;
      }
      setUser({ uid: firebaseUser.uid, ...snap.data() } as UserProfile);

      // Load equipment from Firestore
      const eqSnap = await getDoc(doc(db, "equipment", "default"));
      if (eqSnap.exists()) {
        setEquipment(eqSnap.data().items as string[]);
      }

      setAuthLoading(false);
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Generation helpers
  // ---------------------------------------------------------------------------

  async function generateWorkout(variation = 0) {
    if (!user) return;
    const token = await getIdToken();
    setState({ generatedContent: "", variation });

    const body =
      state.workoutMode === "muscle_group"
        ? {
            mode: "muscle_group",
            goal: state.goal,
            experience: state.experience,
            restrictions: state.restrictions,
            duration: state.duration,
            focusGroups: state.focusGroups,
            exercises: state.selectedExercises,
            variation,
          }
        : {
            mode: "equipment",
            goal: state.goal,
            experience: state.experience,
            restrictions: state.restrictions,
            duration: state.duration,
            equipment: state.selectedEquipment,
            focusGroups: state.focusGroups,
            variation,
          };

    const res = await fetch("/api/workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setState({ generatedContent: "Error generating workout. Please try again." });
      return;
    }

    await streamToState(res, (text) => setState({ generatedContent: text }));
  }

  async function generateRun(variation = 0) {
    if (!user) return;
    const token = await getIdToken();
    setState({ generatedContent: "", variation });

    const res = await fetch("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        goal: state.goal,
        experience: state.experience,
        restrictions: state.restrictions,
        distance: state.runDistance,
        runType: state.runType,
        variation,
      }),
    });

    if (!res.ok) {
      setState({ generatedContent: "Error generating run plan. Please try again." });
      return;
    }

    await streamToState(res, (text) => setState({ generatedContent: text }));
  }

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

  function handleActivityNext(type: "workout" | "run") {
    setState({ activityType: type, stage: "preferences" });
  }

  function handlePreferencesNext() {
    if (state.activityType === "run") {
      setState({ stage: "run", generatedContent: "" });
      generateRun(0);
    } else if (state.workoutMode === "muscle_group") {
      setState({ stage: "selection" });
    } else {
      setState({ stage: "equipment" });
    }
  }

  function handleSelectionNext() {
    setState({ stage: "workout", generatedContent: "" });
    generateWorkout(0);
  }

  function handleEquipmentNext() {
    setState({ stage: "workout", generatedContent: "" });
    generateWorkout(0);
  }

  function handleReset() {
    dispatch(INITIAL_STATE);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#166534]">Fitness Chat</h1>
          <div className="flex items-center gap-3">
            <a href="/history" className="text-xs text-gray-500 hover:text-[#166534] transition-colors">
              History
            </a>
            <a href="/admin" className="text-xs text-gray-500 hover:text-[#166534] transition-colors">
              Admin
            </a>
            <button
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                await auth.signOut();
                router.push("/login");
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator stage={state.stage} activityType={state.activityType} />

        {/* Stage content */}
        {state.stage === "activity" && (
          <ActivityStage
            user={user}
            state={state}
            setState={setState}
            onNext={handleActivityNext}
          />
        )}

        {state.stage === "preferences" && (
          <PreferencesStage
            state={state}
            setState={setState}
            onNext={handlePreferencesNext}
            onBack={() => setState({ stage: "activity" })}
          />
        )}

        {state.stage === "selection" && (
          <SelectionStage
            state={state}
            setState={setState}
            onNext={handleSelectionNext}
            onBack={() => setState({ stage: "preferences" })}
          />
        )}

        {state.stage === "equipment" && (
          <EquipmentStage
            state={state}
            setState={setState}
            equipment={equipment}
            onNext={handleEquipmentNext}
            onBack={() => setState({ stage: "preferences" })}
          />
        )}

        {state.stage === "workout" && (
          <WorkoutDisplay
            user={user}
            state={state}
            setState={setState}
            onRegenerate={() => generateWorkout(state.variation + 1)}
            onReset={handleReset}
          />
        )}

        {state.stage === "run" && (
          <RunDisplay
            user={user}
            state={state}
            onRegenerate={() => generateRun(state.variation + 1)}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) return "";
  return user.getIdToken();
}
