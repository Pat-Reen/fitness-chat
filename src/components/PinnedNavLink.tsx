"use client";

import { useEffect, useState } from "react";
import { PINNED_KEY } from "@/lib/constants";

export default function PinnedNavLink() {
  const [hasPinned, setHasPinned] = useState(false);

  useEffect(() => {
    setHasPinned(!!localStorage.getItem(PINNED_KEY));
  }, []);

  return (
    <a
      href="/pinned"
      className="relative text-xs text-gray-500 hover:text-[#166534] transition-colors"
    >
      Pinned
      {hasPinned && (
        <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
    </a>
  );
}
