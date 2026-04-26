"use client";

import { useState } from "react";

interface Props {
  items: string[];
  onUpdate: (items: string[]) => Promise<void>;
}

export default function EquipmentEditor({ items, onUpdate }: Props) {
  const [list, setList] = useState(items);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed || list.includes(trimmed)) return;
    const next = [...list, trimmed];
    setList(next);
    setNewItem("");
    await save(next);
  }

  async function removeItem(item: string) {
    const next = list.filter((i) => i !== item);
    setList(next);
    await save(next);
  }

  async function save(next: string[]) {
    setSaving(true);
    setSaved(false);
    try {
      await onUpdate(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800">Equipment</h3>
        {saved && <span className="text-xs text-green-600">Saved</span>}
        {saving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {list.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
          >
            {item}
            <button
              onClick={() => removeItem(item)}
              className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add equipment item..."
          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#166534]"
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="px-3 py-1.5 bg-[#166534] text-white text-xs rounded-lg hover:bg-[#14532d] transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
