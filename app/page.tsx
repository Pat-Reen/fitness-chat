'use client'

import { useState } from 'react'
import { Preferences, Step } from '@/lib/types'
import StepIndicator from '@/components/StepIndicator'
import PreferencesStep from '@/components/PreferencesStep'
import ExercisesStep from '@/components/ExercisesStep'
import EquipmentStep from '@/components/EquipmentStep'
import WorkoutStep from '@/components/WorkoutStep'

const DEFAULT_PREFS: Preferences = {
  goal: 'Build Muscle',
  experience: 'Intermediate',
  restrictions: '',
  duration: '60 min',
  mode: 'muscle',
  focusGroups: [],
}

export default function Home() {
  const [step, setStep] = useState<Step>('preferences')
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [exercises, setExercises] = useState<string[]>([])
  const [equipment, setEquipment] = useState<string[]>([])
  const [variation, setVariation] = useState(0)
  const [cachedWorkout, setCachedWorkout] = useState('')

  function handlePrefsNext(p: Preferences) {
    setPrefs(p)
    setCachedWorkout('')
    setVariation(0)
    setStep(p.mode === 'muscle' ? 'exercises' : 'equipment')
  }

  function handleExercisesBuild(ex: string[]) {
    setExercises(ex)
    setCachedWorkout('')
    setStep('workout')
  }

  function handleEquipmentBuild(eq: string[]) {
    setEquipment(eq)
    setCachedWorkout('')
    setStep('workout')
  }

  function handleRegenerate() {
    setVariation(v => v + 1)
    setCachedWorkout('')
  }

  function handleEditExercises() {
    setCachedWorkout('')
    setStep(prefs.mode === 'muscle' ? 'exercises' : 'equipment')
  }

  function handleStartOver() {
    setCachedWorkout('')
    setVariation(0)
    setStep('preferences')
  }

  const indicatorStep: Step =
    step === 'equipment' ? 'equipment' : step

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Fitness Chat
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI-powered workout planner
          </p>
          <div className="mt-4 border-t border-gray-200 dark:border-gray-800" />
        </div>

        {/* Step indicator */}
        <StepIndicator current={indicatorStep} mode={prefs.mode} />

        {/* Step title */}
        <div className="mb-6">
          {step === 'preferences' && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your preferences
            </h2>
          )}
          {step === 'exercises' && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Choose your exercises
            </h2>
          )}
          {step === 'equipment' && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your equipment
            </h2>
          )}
          {step === 'workout' && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Your workout
            </h2>
          )}
        </div>

        {/* Step content */}
        {step === 'preferences' && (
          <PreferencesStep initial={prefs} onNext={handlePrefsNext} />
        )}
        {step === 'exercises' && (
          <ExercisesStep
            preferences={prefs}
            initial={exercises}
            onBuild={handleExercisesBuild}
            onBack={() => setStep('preferences')}
          />
        )}
        {step === 'equipment' && (
          <EquipmentStep
            preferences={prefs}
            initial={equipment}
            onBuild={handleEquipmentBuild}
            onBack={() => setStep('preferences')}
          />
        )}
        {step === 'workout' && (
          <WorkoutStep
            preferences={prefs}
            exercises={exercises}
            equipment={equipment}
            variation={variation}
            cached={cachedWorkout}
            onCached={setCachedWorkout}
            onRegenerate={handleRegenerate}
            onEditExercises={handleEditExercises}
            onStartOver={handleStartOver}
          />
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          nav, button, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}
