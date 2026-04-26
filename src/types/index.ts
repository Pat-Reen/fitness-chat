export type Platform = "fitbit" | "garmin";

export type Stage =
  | "activity"
  | "preferences"
  | "selection"
  | "equipment"
  | "workout"
  | "run";

export type WorkoutMode = "muscle_group" | "equipment";

export type Goal = "Muscle" | "Weight Loss" | "Endurance" | "General Fitness";

export type Experience = "Beginner" | "Intermediate" | "Advanced";

export type RunDistance = "2k" | "5k" | "8k" | "10k" | "12k" | "14k" | "Other";

export type RunType = "Any" | "Flat" | "Hills" | "Sprints";

export interface FitbitTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

export interface GarminCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  platform: Platform;
  fitbitTokens?: FitbitTokens;
  garminCredentials?: GarminCredentials;
}

export interface Activity {
  date: string;
  type: string;
  duration?: string;
  distance?: string;
  pace?: string;
  heartRate?: string;
  calories?: number;
  trainingEffect?: string;
  elevationGain?: string;
}

export interface WorkoutRecord {
  id?: string;
  type: "workout" | "run";
  mode?: WorkoutMode;
  createdAt: number; // Unix ms
  duration?: string;
  focusGroups?: string[];
  exercises?: string[];
  equipment?: string[];
  goal: string;
  experience: string;
  distance?: string;
  runType?: string;
  summary: string;
}

export interface ExerciseImage {
  exerciseName: string;
  imageUrl: string;
  generatedAt: number;
  style: string;
  slug: string;
}

export interface AppState {
  stage: Stage;
  workoutMode: WorkoutMode;
  activityType: "run" | "workout";
  focusGroups: string[];
  selectedExercises: string[];
  selectedEquipment: string[];
  goal: Goal;
  experience: Experience;
  restrictions: string;
  duration: string;
  runDistance: RunDistance | string;
  runType: RunType;
  variation: number;
  generatedContent: string;
  activities: Activity[];
  activitiesLoading: boolean;
  fitbitAuthUrl?: string;
}

export const INITIAL_STATE: AppState = {
  stage: "activity",
  workoutMode: "muscle_group",
  activityType: "workout",
  focusGroups: [],
  selectedExercises: [],
  selectedEquipment: [],
  goal: "General Fitness",
  experience: "Intermediate",
  restrictions: "",
  duration: "45 min",
  runDistance: "5k",
  runType: "Any",
  variation: 0,
  generatedContent: "",
  activities: [],
  activitiesLoading: false,
};
