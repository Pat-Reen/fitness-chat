export const EXERCISES: Record<string, string[]> = {
  Chest: [
    "Barbell Bench Press (Flat)", "Barbell Bench Press (Incline)",
    "Dumbbell Bench Press", "Dumbbell Fly", "Cable Fly / Crossover",
    "Chest Press Machine", "Chest Fly Machine", "Weighted Dips",
    "Landmine Press",
  ],
  Back: [
    "Lat Pulldown", "Seated Cable Row", "Barbell Bent-Over Row", "T-Bar Row",
    "Dumbbell Bent-Over Row", "Dumbbell Single-Arm Row",
    "Deadlift", "Romanian Deadlift",
    "Pull-Up / Chin-Up", "Face Pull (Cable)",
  ],
  Legs: [
    "Barbell Back Squat", "Romanian Deadlift", "Leg Press Machine",
    "Leg Extension Machine", "Leg Curl Machine", "Dumbbell Lunge",
    "Reverse Lunge", "Squat",
    "Smith Machine Squat", "Calf Raise", "Step-Up (Plyometric Box)",
    "Single-Leg RDL", "Bulgarian Split Squat", "Weighted Hip Thrust",
    "Cossack Squat",
  ],
  Shoulders: [
    "Barbell Overhead Press", "Dumbbell Shoulder Press",
    "Dumbbell Lateral Raise", "Cable Lateral Raise", "Face Pull (Cable)",
    "Arnold Press", "Upright Row",
  ],
  Arms: [
    "Barbell Bicep Curl", "Dumbbell Bicep Curl", "Hammer Curl",
    "Cable Bicep Curl", "Tricep Pushdown (Cable)", "Skull Crusher",
    "Dumbbell Overhead Tricep Extension", "Tricep Dip",
    "Straight-Arm Cable Pulldown", "Barbell Bench Press (Flat)",
    "Barbell Bench Press (Incline)", "Dumbbell Bench Press", "Dumbbell Fly",
  ],
  "Core (Equipment)": [
    "Cable Crunch", "Hanging Leg Raise",
    "Russian Twist (Medicine Ball)",
    "Bench Crunch", "Pallof Press (Cable)",
  ],
  "Mat Core": [
    "Dead Bug", "Hollow Body Hold", "Bird Dog",
    "Full Plank", "Side Plank",
    "High Side Plank", "Side Plank Reach Through",
    "Bicycle Crunch", "Reverse Crunch", "V-Up",
    "Glute Bridge", "Wall Sit", "Plank Dumbbell Drag",
  ],
  Cardio: [
    "Rowing Machine", "Stationary Bike", "Spin Bike",
    "Elliptical Trainer", "Stair Climber", "Treadmill Run/Walk",
  ],
  "Full Body / Functional": [
    "Kettlebell Swing", "Kettlebell Turkish Get-Up",
    "Barbell Clean & Press", "Burpee", "Deadlift",
  ],
}

export const MUSCLE_GROUPS = Object.keys(EXERCISES)

export const EQUIPMENT: string[] = [
  "Pull-up bar",
  "Mat",
  "Ab roller",
  "Heavy kettlebell",
  "Skipping rope",
  "Resistance band",
  "Foam roller",
  "Light dumbbells",
  "Heavy dumbbells",
  "Exercise bench (inclined/flat/straight-backed)",
  "Stretch bands",
  "Rowing machine",
]
