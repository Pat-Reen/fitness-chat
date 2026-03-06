'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Preferences, WorkoutRequest } from '@/lib/types'

interface Props {
  preferences: Preferences
  exercises: string[]
  equipment: string[]
  variation: number
  cached: string
  onCached: (text: string) => void
  onRegenerate: () => void
  onEditExercises: () => void
  onStartOver: () => void
}

export default function WorkoutStep({
  preferences,
  exercises,
  equipment,
  variation,
  cached,
  onCached,
  onRegenerate,
  onEditExercises,
  onStartOver,
}: Props) {
  const [text, setText] = useState(cached)
  const [streaming, setStreaming] = useState(!cached)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (cached) return

    const ac = new AbortController()
    abortRef.current = ac

    const body: WorkoutRequest = {
      ...preferences,
      exercises,
      equipment,
      variation,
    }

    setStreaming(true)
    setText('')

    fetch('/api/workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
      .then(async res => {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let full = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })
          setText(full)
        }
        onCached(full)
        setStreaming(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err)
        setStreaming(false)
      })

    return () => ac.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editLabel = preferences.mode === 'equipment' ? '← Edit equipment' : '← Edit exercises'

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">Focus:</span>{' '}
        {preferences.focusGroups.length > 0 ? preferences.focusGroups.join(', ') : 'Auto'}
        {' · '}
        <span className="font-medium text-gray-700 dark:text-gray-300">Goal:</span>{' '}
        {preferences.goal}
        {' · '}
        <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>{' '}
        {preferences.duration}
        {variation > 0 && (
          <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
            variation #{variation}
          </span>
        )}
      </p>

      {/* Workout content */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-900 min-h-32">
        {text ? (
          <div className="workout-prose text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            Generating your workout…
          </div>
        )}
        {streaming && text && (
          <span className="inline-block w-2 h-4 bg-green-600 animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          onClick={onRegenerate}
          disabled={streaming}
          className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          Regenerate
        </button>
        <button
          onClick={onEditExercises}
          disabled={streaming}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {editLabel}
        </button>
        <button
          onClick={onStartOver}
          disabled={streaming}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          Start over
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ml-auto"
        >
          Print / Save PDF
        </button>
      </div>
    </div>
  )
}
