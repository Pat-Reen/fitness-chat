export type Step = 'preferences' | 'exercises' | 'equipment' | 'workout'

export type Goal = 'Build Muscle' | 'Weight Loss' | 'Endurance' | 'General Fitness'
export type Experience = 'Beginner' | 'Intermediate' | 'Advanced'
export type Duration = '30 min' | '45 min' | '60 min' | '90 min'
export type Mode = 'muscle' | 'equipment'

export interface Preferences {
  goal: Goal
  experience: Experience
  restrictions: string
  duration: Duration
  mode: Mode
  focusGroups: string[]
}

export interface WorkoutRequest extends Preferences {
  exercises: string[]
  equipment: string[]
  variation: number
}
