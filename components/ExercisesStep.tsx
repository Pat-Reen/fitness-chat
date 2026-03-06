'use client'

import { useState } from 'react'
import { EXERCISES, MUSCLE_GROUPS } from '@/lib/data'
import { Preferences } from '@/lib/types'

interface Props {
  preferences: Preferences
  initial: string[]
  onBuild: (exercises: string[]) => void
  onBack: () => void
}

function buildInitial(focusGroups: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const group of focusGroups) {
    for (const ex of EXERCISES[group] ?? []) {
      if (!seen.has(ex)) { seen.add(ex); result.push(ex) }
    }
  }
  return result
}

export default function ExercisesStep({ preferences, initial, onBuild, onBack }: Props) {
  const { focusGroups } = preferences
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.length > 0 ? initial : buildInitial(focusGroups))
  )
  const [extraOpen, setExtraOpen] = useState(false)

  function toggle(ex: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(ex) ? next.delete(ex) : next.add(ex)
      return next
    })
  }

  const otherGroups = MUSCLE_GROUPS.filter(g => !focusGroups.includes(g))
  const renderedInFocus = new Set<string>()

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">Focus:</span>{' '}
            {focusGroups.join(', ')}
            {' · '}
            <span className="font-medium text-gray-700 dark:text-gray-300">Goal:</span>{' '}
            {preferences.goal}
            {' · '}
            <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>{' '}
            {preferences.duration}
          </p>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{selected.size} selected</span>
      </div>

      {/* Focus group exercises */}
      {focusGroups.map(group => {
        const exercises = (EXERCISES[group] ?? []).filter(ex => {
          if (renderedInFocus.has(ex)) return false
          renderedInFocus.add(ex)
          return true
        })
        return (
          <div key={group}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              {group}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {exercises.map(ex => (
                <label
                  key={ex}
                  className={[
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                    selected.has(ex)
                      ? 'border-green-600 bg-green-50 dark:bg-green-950 dark:border-green-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(ex)}
                    onChange={() => toggle(ex)}
                    className="accent-green-700 w-4 h-4 shrink-0"
                  />
                  <span className={selected.has(ex) ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}>
                    {ex}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}

      {/* Other groups collapsible */}
      {otherGroups.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setExtraOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span>Add exercises from other groups</span>
            <span className="text-lg leading-none">{extraOpen ? '−' : '+'}</span>
          </button>
          {extraOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              {otherGroups.map(group => {
                const exercises = (EXERCISES[group] ?? []).filter(ex => !renderedInFocus.has(ex))
                if (exercises.length === 0) return null
                return (
                  <div key={group}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      {group}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {exercises.map(ex => (
                        <label
                          key={ex}
                          className={[
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                            selected.has(ex)
                              ? 'border-green-600 bg-green-50 dark:bg-green-950 dark:border-green-700'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(ex)}
                            onChange={() => toggle(ex)}
                            className="accent-green-700 w-4 h-4 shrink-0"
                          />
                          <span className={selected.has(ex) ? 'text-green-800 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}>
                            {ex}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

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
