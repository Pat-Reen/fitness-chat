"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ExerciseGroupEditor from "@/components/admin/ExerciseGroupEditor";
import EquipmentEditor from "@/components/admin/EquipmentEditor";
import ImageManager from "@/components/admin/ImageManager";
import type { ExerciseImage } from "@/types";

type Tab = "exercises" | "equipment" | "images";

export default function AdminPage() {
  const router = useRouter();
  const { status } = useSession();
  const [tab, setTab] = useState<Tab>("exercises");
  const [exercises, setExercises] = useState<Record<string, string[]>>({});
  const [equipment, setEquipment] = useState<string[]>([]);
  const [images, setImages] = useState<ExerciseImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;
    loadAll().then(() => setLoading(false));
  }, [status, router]);

  async function loadAll() {
    const [exRes, eqRes, imgRes] = await Promise.all([
      fetch("/api/admin/exercises"),
      fetch("/api/admin/equipment"),
      fetch("/api/exercise-images"),
    ]);
    if (exRes.ok) setExercises((await exRes.json()).exercises ?? {});
    if (eqRes.ok) setEquipment((await eqRes.json()).items ?? []);
    if (imgRes.ok) setImages((await imgRes.json()).images ?? []);
  }

  async function updateExerciseGroup(groupName: string, items: string[]) {
    await fetch("/api/admin/exercises", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupName, items }),
    });
    setExercises((prev) => ({ ...prev, [groupName]: items }));
  }

  async function updateEquipment(items: string[]) {
    await fetch("/api/admin/equipment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setEquipment(items);
  }

  if (loading || status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-sm text-gray-400">Loading...</span></div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "exercises", label: "Exercises" },
    { key: "equipment", label: "Equipment" },
    { key: "images", label: "Images" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#166534]">Admin</h1>
          <a href="/" className="text-xs text-gray-500 hover:text-[#166534] transition-colors">← Back to app</a>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key ? "border-[#166534] text-[#166534]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "exercises" && (
          <div className="space-y-4">
            {Object.entries(exercises).map(([group, items]) => (
              <ExerciseGroupEditor key={group} groupName={group} items={items} onUpdate={updateExerciseGroup} />
            ))}
            {Object.keys(exercises).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No exercises loaded. Run the seeding script first.</p>
            )}
          </div>
        )}
        {tab === "equipment" && <EquipmentEditor items={equipment} onUpdate={updateEquipment} />}
        {tab === "images" && <ImageManager images={images} onReload={loadAll} />}
      </div>
    </div>
  );
}
