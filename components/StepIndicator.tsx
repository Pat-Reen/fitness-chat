import { Step } from '@/lib/types'

const STEPS: { key: Step; label: string }[] = [
  { key: 'preferences', label: 'Preferences' },
  { key: 'exercises',   label: 'Exercises'   },
  { key: 'workout',     label: 'Workout'      },
]

const EQUIPMENT_STEPS: { key: Step; label: string }[] = [
  { key: 'preferences', label: 'Preferences' },
  { key: 'equipment',   label: 'Equipment'   },
  { key: 'workout',     label: 'Workout'      },
]

interface Props {
  current: Step
  mode: 'muscle' | 'equipment'
}

export default function StepIndicator({ current, mode }: Props) {
  const steps = mode === 'equipment' ? EQUIPMENT_STEPS : STEPS
  const currentIndex = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                  done   ? 'bg-green-700 text-white' : '',
                  active ? 'bg-green-700 text-white ring-2 ring-green-300' : '',
                  !done && !active ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : '',
                ].join(' ')}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={[
                  'text-sm font-medium',
                  active ? 'text-green-700 dark:text-green-400' : '',
                  done   ? 'text-gray-500 dark:text-gray-400' : '',
                  !done && !active ? 'text-gray-400 dark:text-gray-500' : '',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={[
                'h-px w-8 flex-shrink-0',
                i < currentIndex ? 'bg-green-700' : 'bg-gray-200 dark:bg-gray-700',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
