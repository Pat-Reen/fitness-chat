'use client'

import { useState } from 'react'
import { Preferences, Goal, Experience, Duration, Mode } from '@/lib/types'
import { MUSCLE_GROUPS } from '@/lib/data'

const GOALS: Goal[] = ['Build Muscle', 'Weight Loss', 'Endurance', 'General Fitness']
const EXPERIENCES: Experience[] = ['Beginner', 'Intermediate', 'Advanced']
const DURATIONS: Duration[] = ['30 min', '45 min', '60 min', '90 min']

interface Props {
  initial: Preferences
  onNext: (prefs: Preferences) => void
}

export default function PreferencesStep({ initial, onNext }: Props) {
  const [goal, setGoal] = useState<Goal>(initial.goal)
  const [experience, setExperience] = useState<Experience>(initial.experience)
  const [restrictions, setRestrictions] = useState(initial.restrictions)
  const [duration, setDuration] = useState<Duration>(initial.duration)
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [focusGroups, setFocusGroups] = useState<string[]>(initial.focusGroups)

  function toggleGroup(g: string) {
    setFocusGroups(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  const canContinue = mode === 'equipment' || focusGroups.length > 0

  function handleNext() {
    onNext({ goal, experience, restrictions, duration, mode, focusGroups })
  }

  return (
    <div className="space-y-6">
      {/* Goal */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Fitness goal
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map(g => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={[
                'px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left',
                goal === g
                  ? 'border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300',
              ].join(' ')}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Experience level
        </label>
        <div className="flex gap-2">
          {EXPERIENCES.map(e => (
            <button
              key={e}
              onClick={() => setExperience(e)}
              className={[
                'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                experience === e
                  ? 'border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300',
              ].join(' ')}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Session duration
        </label>
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={[
                'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                duration === d
                  ? 'border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300',
              ].join(' ')}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Restrictions */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Injuries or limitations
          <span className="font-normal text-gray-400 ml-1">(leave blank if none)</span>
        </label>
        <input
          type="text"
          value={restrictions}
          onChange={e => setRestrictions(e.target.value)}
          placeholder="e.g. bad knee, shoulder impingement"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {/* Mode */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
          Workout mode
        </label>
        <div className="flex gap-2">
          {(['muscle', 'equipment'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                mode === m
                  ? 'border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300',
              ].join(' ')}
            >
              {m === 'muscle' ? 'By muscle group' : 'By equipment'}
            </button>
          ))}
        </div>
      </div>

      {/* Focus groups */}
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
          Focus areas
          {mode === 'muscle'
            ? <span className="font-normal text-gray-400 ml-1">(pick 1–3)</span>
            : <span className="font-normal text-gray-400 ml-1">(optional)</span>}
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          {MUSCLE_GROUPS.map(g => (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className={[
                'px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
                focusGroups.includes(g)
                  ? 'border-green-700 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 dark:border-green-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400',
              ].join(' ')}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!canContinue}
        className="w-full py-2.5 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {mode === 'muscle' ? 'Select exercises' : 'Select equipment'}
        {' '}→
      </button>
    </div>
  )
}
