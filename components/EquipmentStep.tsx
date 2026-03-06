'use client'

import { useState } from 'react'
import { EQUIPMENT } from '@/lib/data'
import { Preferences } from '@/lib/types'

interface Props {
  preferences: Preferences
  initial: string[]
  onBuild: (equipment: string[]) => void
  onBack: () => void
}

export default function EquipmentStep({ preferences, initial, onBuild, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))

  function toggle(item: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  function selectAll() { setSelected(new Set(EQUIPMENT)) }
  function clearAll()  { setSelected(new Set()) }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Goal:</span>{' '}
          {preferences.goal}
          {' · '}
          <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>{' '}
          {preferences.duration}
          {preferences.focusGroups.length > 0 && (
            <>
              {' · '}
              <span className="font-medium text-gray-700 dark:text-gray-300">Focus:</span>{' '}
              {preferences.focusGroups.join(', ')}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{selected.size} of {EQUIPMENT.length} selected</span>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          >
            Select all
          </button>
          <button
            onClick={clearAll}
            className="text-xs px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {EQUIPMENT.map(item => (
          <label
            key={item}
            className={[
              'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
              selected.has(item)
                ? 'border-green-600 bg-green-50 dark:bg-green-950 dark:border-green-700'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={selected.has(item)}
              onChange={() => toggle(item)}
              className="accent-green-700 w-4 h-4 shrink-0"
            />
            <span className={selected.has(item) ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}>
              {item}
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onBuild(Array.from(selected))}
          disabled={selected.size === 0}
          className="flex-1 py-2.5 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          Build workout →
        </button>
      </div>
    </div>
  )
}
