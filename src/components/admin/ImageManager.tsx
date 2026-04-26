"use client";

import { useState } from "react";
import type { ExerciseImage } from "@/types";

interface Props {
  images: ExerciseImage[];
  onReload: () => void;
}

function ImageCard({
  image,
  onReload,
}: {
  image: ExerciseImage;
  onReload: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exercise-images/${image.slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exerciseName: image.exerciseName }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/exercise-images/${image.slug}`, {
        method: "PATCH",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
      <div className="bg-gray-50 rounded-lg aspect-square flex items-center justify-center overflow-hidden">
        {image.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image.imageUrl}
            alt={image.exerciseName}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-gray-300 text-xs">No image</span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-700 leading-tight">{image.exerciseName}</p>
      <p className="text-[10px] text-gray-400">
        {image.generatedAt
          ? new Date(image.generatedAt).toLocaleDateString()
          : "—"}
      </p>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
      <div className="flex gap-1.5 mt-auto">
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex-1 text-[10px] py-1.5 border border-[#166534] text-[#166534] rounded-lg hover:bg-[#f0fdf4] transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Regenerate"}
        </button>
        <label className="flex-1 text-[10px] py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-center cursor-pointer">
          Upload
          <input
            type="file"
            accept="image/svg+xml"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>
    </div>
  );
}

export default function ImageManager({ images, onReload }: Props) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [newExercise, setNewExercise] = useState("");

  async function handleGenerateNew() {
    if (!newExercise.trim()) return;
    setGenerating(newExercise);
    try {
      const res = await fetch("/api/exercise-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ exerciseName: newExercise.trim() }),
      });
      if (!res.ok) throw new Error("Generation failed");
      setNewExercise("");
      onReload();
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Generate new */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Exercise name to generate image for..."
          value={newExercise}
          onChange={(e) => setNewExercise(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#166534]"
          onKeyDown={(e) => e.key === "Enter" && handleGenerateNew()}
        />
        <button
          onClick={handleGenerateNew}
          disabled={!!generating || !newExercise.trim()}
          className="px-4 py-2 bg-[#166534] text-white text-sm rounded-lg hover:bg-[#14532d] transition-colors disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {images.map((img) => (
          <ImageCard key={img.slug} image={img} onReload={onReload} />
        ))}
      </div>

      {images.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          No exercise images yet. Run the seeding script or generate individually above.
        </p>
      )}
    </div>
  );
}
