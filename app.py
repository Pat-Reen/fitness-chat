import anthropic
import base64
import os
import urllib.parse
from datetime import date, timedelta
from dotenv import load_dotenv
import requests
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Fitness Chat",
    page_icon="🏋️",
    layout="centered",
)

GLOBAL_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', sans-serif !important;
}

/* Page padding */
.block-container { padding-top: 2rem; padding-bottom: 3rem; max-width: 720px; }

/* Title */
h1 { font-weight: 700 !important; letter-spacing: -0.5px; font-size: 1.6rem !important; }
h1 + div { border-top: 2px solid #166534; padding-top: 1rem; margin-bottom: 0.5rem; }

/* Section headers */
h2 { color: #166534 !important; font-weight: 600 !important; font-size: 1.15rem !important; }
h3 { color: #166534 !important; font-weight: 600 !important; font-size: 1rem !important; }

/* Caption */
.stCaptionContainer p { color: #6b7280 !important; font-size: 0.85rem !important; }

/* ------------------------------------------------------------------ */
/* Multiselect → styled tags                                           */
/* ------------------------------------------------------------------ */
div[data-testid="stMultiSelect"] label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
}
div[data-testid="stMultiSelect"] > div > div {
    border-radius: 0.5rem !important;
    border-color: #e5e7eb !important;
}
/* Selected tags */
div[data-testid="stMultiSelect"] span[data-baseweb="tag"] {
    background: #f0fdf4 !important;
    border: 1px solid #166534 !important;
    border-radius: 999px !important;
    color: #166534 !important;
    font-size: 0.8rem !important;
}

/* ------------------------------------------------------------------ */
/* Text input                                                          */
/* ------------------------------------------------------------------ */
div[data-testid="stTextInput"] label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
}
div[data-testid="stTextInput"] input {
    border-radius: 0.5rem !important;
    border-color: #e5e7eb !important;
    font-size: 0.875rem;
}
div[data-testid="stTextInput"] input:focus {
    border-color: #166534 !important;
    box-shadow: 0 0 0 2px #bbf7d0 !important;
}

/* ------------------------------------------------------------------ */
/* Checkboxes                                                          */
/* ------------------------------------------------------------------ */
div[data-testid="stCheckbox"] label {
    font-size: 0.875rem;
    color: #374151;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.35rem 0.6rem;
    width: 100%;
    transition: border-color 0.15s;
}
div[data-testid="stCheckbox"]:has(input:checked) label {
    border-color: #166534 !important;
    background: #f0fdf4 !important;
    color: #166534 !important;
}
div[data-testid="stCheckbox"] input[type="checkbox"] {
    accent-color: #166534;
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
div[data-testid="stButton"] > button[kind="primary"] {
    background: #166534 !important;
    border-color: #166534 !important;
    border-radius: 0.5rem !important;
    font-weight: 600 !important;
    font-size: 0.875rem !important;
    padding: 0.5rem 1.25rem !important;
}
div[data-testid="stButton"] > button[kind="primary"]:hover {
    background: #14532d !important;
    border-color: #14532d !important;
}
div[data-testid="stButton"] > button[kind="primary"]:disabled {
    background: #166534 !important;
    border-color: #166534 !important;
    opacity: 0.45 !important;
    cursor: not-allowed !important;
}
div[data-testid="stButton"] > button[kind="secondary"] {
    border-radius: 0.5rem !important;
    border-color: #e5e7eb !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    color: #374151 !important;
}
div[data-testid="stButton"] > button[kind="secondary"]:hover {
    border-color: #9ca3af !important;
    background: #f9fafb !important;
}

/* ------------------------------------------------------------------ */
/* Expander                                                            */
/* ------------------------------------------------------------------ */
[data-testid="stExpander"] summary {
    font-weight: 600;
    font-size: 0.875rem;
    color: #374151;
}

/* ------------------------------------------------------------------ */
/* Divider                                                             */
/* ------------------------------------------------------------------ */
hr { border-color: #e5e7eb !important; margin: 1rem 0 !important; }

/* ------------------------------------------------------------------ */
/* Step pill indicator                                                 */
/* ------------------------------------------------------------------ */
.step-row { display: flex; align-items: center; margin-bottom: 1.5rem; }
.step-pill {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.2rem 0.65rem 0.2rem 0.2rem;
    border-radius: 999px; font-size: 0.78rem; font-weight: 600;
}
.step-pill .num {
    width: 1.3rem; height: 1.3rem; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-weight: 700;
}
.step-pill.done   { color: #166534; }
.step-pill.done .num   { background: #166534; color: #fff; }
.step-pill.active { color: #166534; outline: 2px solid #86efac; border-radius: 999px; }
.step-pill.active .num { background: #166534; color: #fff; }
.step-pill.pending { color: #9ca3af; }
.step-pill.pending .num { background: #e5e7eb; color: #9ca3af; }
.step-connector { height: 2px; width: 2rem; margin: 0 0.15rem; border-radius: 1px; }
.step-connector.done { background: #166534; }
.step-connector.pending { background: #e5e7eb; }

/* ------------------------------------------------------------------ */
/* Workout output — tables                                             */
/* ------------------------------------------------------------------ */
div[data-testid="stMarkdownContainer"] table {
    width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.875rem;
}
div[data-testid="stMarkdownContainer"] thead tr { background: #f3f4f6; }
div[data-testid="stMarkdownContainer"] th {
    text-align: left; font-weight: 600;
    padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb;
}
div[data-testid="stMarkdownContainer"] td {
    text-align: left; padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb; vertical-align: top;
}
div[data-testid="stMarkdownContainer"] tbody tr:nth-child(even) { background: #f9fafb; }

/* Subheader spacing */
div[data-testid="stHeadingWithActionElements"] { margin-top: 1rem; margin-bottom: 0.25rem; }
</style>
"""

load_dotenv()
_api_key = os.environ.get("ANTHROPIC_API_KEY")
if not _api_key:
    st.error("ANTHROPIC_API_KEY environment variable is not set.")
    st.stop()
client = anthropic.Anthropic(api_key=_api_key)

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

EXERCISES = {
    "Chest": [
        "Barbell Bench Press (Flat)", "Barbell Bench Press (Incline)",
        "Dumbbell Bench Press", "Dumbbell Fly", "Cable Fly / Crossover",
        "Chest Press Machine", "Chest Fly Machine", "Weighted Dips", "Landmine Press",
    ],
    "Back": [
        "Lat Pulldown", "Seated Cable Row", "Barbell Bent-Over Row", "T-Bar Row",
        "Dumbbell Bent-Over Row", "Dumbbell Single-Arm Row",
        "Deadlift", "Romanian Deadlift", "Pull-Up / Chin-Up", "Face Pull (Cable)",
    ],
    "Legs": [
        "Barbell Back Squat", "Romanian Deadlift", "Leg Press Machine",
        "Leg Extension Machine", "Leg Curl Machine", "Dumbbell Lunge",
        "Reverse Lunge", "Squat", "Smith Machine Squat", "Calf Raise",
        "Step-Up (Plyometric Box)", "Single-Leg RDL", "Bulgarian Split Squat",
        "Weighted Hip Thrust", "Cossack Squat",
    ],
    "Shoulders": [
        "Barbell Overhead Press", "Dumbbell Shoulder Press",
        "Dumbbell Lateral Raise", "Cable Lateral Raise", "Face Pull (Cable)",
        "Arnold Press", "Upright Row",
    ],
    "Arms": [
        "Barbell Bicep Curl", "Dumbbell Bicep Curl", "Hammer Curl",
        "Cable Bicep Curl", "Tricep Pushdown (Cable)", "Skull Crusher",
        "Dumbbell Overhead Tricep Extension", "Tricep Dip",
        "Straight-Arm Cable Pulldown", "Barbell Bench Press (Flat)",
        "Barbell Bench Press (Incline)", "Dumbbell Bench Press", "Dumbbell Fly",
    ],
    "Core (Equipment)": [
        "Cable Crunch", "Hanging Leg Raise",
        "Russian Twist (Medicine Ball)", "Bench Crunch", "Pallof Press (Cable)",
    ],
    "Mat Core": [
        "Dead Bug", "Hollow Body Hold", "Bird Dog",
        "Full Plank", "Side Plank", "High Side Plank", "Side Plank Reach Through",
        "Bicycle Crunch", "Reverse Crunch", "V-Up",
        "Glute Bridge", "Wall Sit", "Plank Dumbbell Drag",
    ],
    "Cardio": [
        "Rowing Machine", "Stationary Bike", "Spin Bike",
        "Elliptical Trainer", "Stair Climber", "Treadmill Run/Walk",
    ],
    "Full Body / Functional": [
        "Kettlebell Swing", "Kettlebell Turkish Get-Up",
        "Barbell Clean & Press", "Burpee", "Deadlift",
    ],
}

MUSCLE_GROUPS = list(EXERCISES.keys())

EQUIPMENT = [
    "Pull-up bar", "Mat", "Ab roller", "Heavy kettlebell", "Skipping rope",
    "Resistance band", "Foam roller", "Light dumbbells", "Heavy dumbbells",
    "Exercise bench (inclined/flat/straight-backed)", "Stretch bands", "Rowing machine",
]

# ---------------------------------------------------------------------------
# Input sanitisation
# ---------------------------------------------------------------------------

def sanitise_restrictions(text: str) -> str:
    """Strip characters that could break prompt structure, limit length."""
    # Remove newlines, carriage returns, and null bytes
    cleaned = text.replace("\n", " ").replace("\r", " ").replace("\x00", "")
    # Collapse multiple spaces
    cleaned = " ".join(cleaned.split())
    # Hard cap at 200 characters
    return cleaned[:200]

# ---------------------------------------------------------------------------
# User detection
# ---------------------------------------------------------------------------

_PROFILE_OPTIONS = ["Pat (Fitbit)", "Nia (Garmin)", "Other (No History)"]
_PROFILE_MAP     = {"Pat (Fitbit)": "pat", "Nia (Garmin)": "nia", "Other (No History)": "other"}


def get_user_profile() -> str:
    return _PROFILE_MAP.get(st.session_state.get("selected_profile") or "", "other")


# ---------------------------------------------------------------------------
# Fitbit OAuth
# ---------------------------------------------------------------------------

FITBIT_AUTH_URL    = "https://www.fitbit.com/oauth2/authorize"
FITBIT_TOKEN_URL   = "https://api.fitbit.com/oauth2/token"
FITBIT_REDIRECT_URI = "https://fitnesschat.streamlit.app/"


def get_fitbit_auth_url() -> str:
    params = {
        "response_type": "code",
        "client_id":     st.secrets["FITBIT_CLIENT_ID"],
        "redirect_uri":  FITBIT_REDIRECT_URI,
        "scope":         "activity heartrate",
        "expires_in":    "604800",
    }
    return f"{FITBIT_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_fitbit_code(code: str) -> dict:
    credentials = base64.b64encode(
        f"{st.secrets['FITBIT_CLIENT_ID']}:{st.secrets['FITBIT_CLIENT_SECRET']}".encode()
    ).decode()
    resp = requests.post(
        FITBIT_TOKEN_URL,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type":  "application/x-www-form-urlencoded",
        },
        data={
            "code":         code,
            "grant_type":   "authorization_code",
            "redirect_uri": FITBIT_REDIRECT_URI,
        },
        timeout=10,
    )
    return resp.json()


def fetch_fitbit_activities(token: str) -> list:
    after = (date.today() - timedelta(days=7)).isoformat()
    resp = requests.get(
        "https://api.fitbit.com/1/user/-/activities/list.json"
        f"?afterDate={after}&sort=desc&limit=10&offset=0",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    return resp.json().get("activities", [])


_FITBIT_RUN_KEYWORDS = ("structured workout", "run", "outdoor run", "treadmill")

def fitbit_activity_summary(activities: list) -> str:
    if not activities:
        return ""
    lines = []
    for a in activities[:7]:
        name     = a.get("activityName", "Unknown")
        duration = round(a.get("duration", 0) / 60000)
        day      = a.get("startTime", "")[:10]
        is_run   = any(kw in name.lower() for kw in _FITBIT_RUN_KEYWORDS)
        display  = "Run" if is_run else name
        parts    = [f"{duration} min"]
        if is_run:
            dist = a.get("distance")  # km
            if dist:
                parts.append(f"{dist:.2f} km")
                if duration > 0:
                    pace_secs = (duration * 60) / dist
                    parts.append(f"{int(pace_secs // 60)}:{int(pace_secs % 60):02d} /km")
        avg_hr = a.get("averageHeartRate")
        if avg_hr:
            parts.append(f"avg HR {avg_hr} bpm")
        calories = a.get("calories")
        if calories:
            parts.append(f"{calories} kcal")
        if is_run:
            elev = a.get("elevationGain")
            if elev:
                parts.append(f"{elev:.0f} m elev gain")
        zones = a.get("heartRateZones", [])
        peak  = next((z for z in zones if z.get("name") == "Peak"), None)
        if peak and peak.get("minutes", 0) > 0:
            parts.append(f"{peak['minutes']} min in peak HR zone")
        lines.append(f"- {day}: {display} ({', '.join(parts)})")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Garmin Connect
# ---------------------------------------------------------------------------

def fetch_garmin_activities() -> list:
    from garminconnect import Garmin
    client = Garmin(st.secrets["GARMIN_NIA_EMAIL"], st.secrets["GARMIN_NIA_PASSWORD"])
    client.login()
    start = (date.today() - timedelta(days=7)).isoformat()
    end   = date.today().isoformat()
    return client.get_activities_by_date(start, end)


def garmin_activity_summary(activities: list) -> str:
    if not activities:
        return ""
    lines = []
    for a in activities[:7]:
        type_key = a.get("activityType", {}).get("typeKey", "")
        name     = a.get("activityName") or type_key or "Unknown"
        is_run   = "running" in type_key.lower()
        duration = round(a.get("duration", 0) / 60)
        day      = (a.get("startTimeLocal") or "")[:10]
        parts    = [f"{duration} min"]
        if is_run:
            dist_m = a.get("distance")  # metres
            if dist_m:
                dist_km = dist_m / 1000
                parts.append(f"{dist_km:.2f} km")
                avg_speed = a.get("averageSpeed")  # m/s
                if avg_speed and avg_speed > 0:
                    pace_secs = 1000 / avg_speed
                    parts.append(f"{int(pace_secs // 60)}:{int(pace_secs % 60):02d} /km")
        avg_hr   = a.get("averageHR")
        max_hr   = a.get("maxHR")
        if avg_hr:
            hr_str = f"avg HR {avg_hr} bpm"
            if max_hr:
                hr_str += f" / max {max_hr} bpm"
            parts.append(hr_str)
        calories = a.get("calories")
        if calories:
            parts.append(f"{round(calories)} kcal")
        if is_run:
            elev_gain = a.get("elevationGain")
            if elev_gain:
                parts.append(f"{elev_gain:.0f} m elev gain")
        aerobic  = a.get("aerobicTrainingEffect")
        anaerobic = a.get("anaerobicTrainingEffect")
        if aerobic is not None and aerobic > 0:
            parts.append(f"aerobic TE {aerobic:.1f}")
        if anaerobic is not None and anaerobic > 0:
            parts.append(f"anaerobic TE {anaerobic:.1f}")
        lines.append(f"- {day}: {name} ({', '.join(parts)})")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Run-specific activity context
# ---------------------------------------------------------------------------

def get_run_context_fitbit(activities: list) -> str:
    """Detailed summary of only run activities from Fitbit data."""
    runs = [a for a in activities if any(kw in a.get("activityName", "").lower() for kw in _FITBIT_RUN_KEYWORDS)]
    if not runs:
        return ""
    lines = []
    for a in runs[:7]:
        name     = a.get("activityName", "Run")
        duration = round(a.get("duration", 0) / 60000)
        day      = a.get("startTime", "")[:10]
        parts    = [f"{duration} min"]
        dist = a.get("distance")
        if dist:
            parts.append(f"{dist:.2f} km")
            if duration > 0:
                pace_secs = (duration * 60) / dist
                parts.append(f"{int(pace_secs // 60)}:{int(pace_secs % 60):02d} /km")
        avg_hr = a.get("averageHeartRate")
        if avg_hr:
            parts.append(f"avg HR {avg_hr} bpm")
        calories = a.get("calories")
        if calories:
            parts.append(f"{calories} kcal")
        elev = a.get("elevationGain")
        if elev:
            parts.append(f"{elev:.0f} m elev gain")
        zones = a.get("heartRateZones", [])
        peak  = next((z for z in zones if z.get("name") == "Peak"), None)
        if peak and peak.get("minutes", 0) > 0:
            parts.append(f"{peak['minutes']} min in peak HR zone")
        lines.append(f"- {day}: {name} ({', '.join(parts)})")
    return "\n".join(lines)


def get_run_context_garmin(activities: list) -> str:
    """Detailed summary of only run activities from Garmin data."""
    runs = [a for a in activities if "running" in a.get("activityType", {}).get("typeKey", "").lower()]
    if not runs:
        return ""
    lines = []
    for a in runs[:7]:
        name     = a.get("activityName") or "Run"
        duration = round(a.get("duration", 0) / 60)
        day      = (a.get("startTimeLocal") or "")[:10]
        parts    = [f"{duration} min"]
        dist_m = a.get("distance")
        if dist_m:
            dist_km = dist_m / 1000
            parts.append(f"{dist_km:.2f} km")
            avg_speed = a.get("averageSpeed")
            if avg_speed and avg_speed > 0:
                pace_secs = 1000 / avg_speed
                parts.append(f"{int(pace_secs // 60)}:{int(pace_secs % 60):02d} /km")
        avg_hr = a.get("averageHR")
        max_hr = a.get("maxHR")
        if avg_hr:
            hr_str = f"avg HR {avg_hr} bpm"
            if max_hr:
                hr_str += f" / max {max_hr} bpm"
            parts.append(hr_str)
        calories = a.get("calories")
        if calories:
            parts.append(f"{round(calories)} kcal")
        elev_gain = a.get("elevationGain")
        if elev_gain:
            parts.append(f"{elev_gain:.0f} m elev gain")
        aerobic   = a.get("aerobicTrainingEffect")
        anaerobic = a.get("anaerobicTrainingEffect")
        if aerobic is not None and aerobic > 0:
            parts.append(f"aerobic TE {aerobic:.1f}")
        if anaerobic is not None and anaerobic > 0:
            parts.append(f"anaerobic TE {anaerobic:.1f}")
        lines.append(f"- {day}: {name} ({', '.join(parts)})")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Claude helpers
# ---------------------------------------------------------------------------

def build_workout_stream(goal, experience, restrictions, duration, focus_groups, exercises, variation, fitbit_context=""):
    restrictions = sanitise_restrictions(restrictions)
    restriction_line = (
        f"The user has these restrictions/injuries: {restrictions}. Provide modifications where relevant."
        if restrictions else "The user has no injuries or limitations."
    )
    variation_line = (
        f"\nThis is variation #{variation} — make it meaningfully different "
        f"(different rep schemes, tempo, supersets, ordering) from a standard version."
        if variation > 0 else ""
    )
    exercise_list = "\n".join(f"- {e}" for e in exercises)
    fitbit_line = (
        f"\nRecent workouts (from fitness tracker, last 7 days):\n{fitbit_context}\n"
        f"Note: generic names like 'Strength', 'Structured Workout', or 'Weights' mean a general gym/strength session. "
        f"HR data and training effect (TE) scores (1=easy, 5=max) indicate session intensity. "
        f"Factor all of this in — avoid overworking muscle groups likely trained in the last 48 hours, "
        f"and consider overall fatigue from recent high-intensity sessions.\n"
        if fitbit_context else ""
    )
    prompt = (
        f"You are an expert personal trainer. Write a structured {duration} gym workout "
        f"using ONLY the exercises listed below. The session focuses on: {', '.join(focus_groups)}.\n\n"
        f"User profile:\n- Goal: {goal}\n- Experience: {experience}\n- {restriction_line}\n"
        f"{fitbit_line}"
        f"{variation_line}\n\n"
        f"Exercises to include:\n{exercise_list}\n\n"
        f"IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — "
        f"must fit within {duration}. Choose an appropriate number of sets per exercise so the "
        f"timing works out. Do not over-program.\n\n"
        f"Format the plan in markdown with:\n"
        f"1. Warm-up: 10–20 minutes on the rowing machine or stationary/spin bike "
        f"(the user runs on non-gym days so do NOT suggest treadmill/running as a warm-up)\n"
        f"2. Main workout — order exercises logically for a real gym session:\n"
        f"   - Default to 20 reps per set unless the movement type demands otherwise\n"
        f"   - Group the workout into blocks of 3–4 exercises\n"
        f"   - Within each block, alternate between exercises (circuit-style) rather than completing all sets of one before moving on\n"
        f"   - Lead with the most demanding compound movements\n"
        f"   - Group exercises by area of the gym to minimise equipment changes and walking\n"
        f"   - Finish with isolation or machine work, then mat/core exercises last\n"
        f"   - For each exercise: sets × reps (or duration), rest period\n"
        f"3. A brief cool-down note"
    )
    with client.messages.stream(
        model="claude-sonnet-4-6", max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def build_equipment_workout_stream(goal, experience, restrictions, duration, equipment, focus_groups, variation, fitbit_context=""):
    restrictions = sanitise_restrictions(restrictions)
    restriction_line = (
        f"The user has these restrictions/injuries: {restrictions}. Provide modifications where relevant."
        if restrictions else "The user has no injuries or limitations."
    )
    variation_line = (
        f"\nThis is variation #{variation} — make it meaningfully different "
        f"(different rep schemes, tempo, supersets, ordering) from a standard version."
        if variation > 0 else ""
    )
    focus_line = (
        f"Prioritise these muscle groups: {', '.join(focus_groups)}. "
        f"Fill any remaining time with whatever the equipment allows best."
        if focus_groups
        else "No specific focus requested — design a balanced full-body session that hits all "
             "major muscle groups (push, pull, legs, core) as evenly as the equipment allows."
    )
    fitbit_line = (
        f"\nRecent workouts (from fitness tracker, last 7 days):\n{fitbit_context}\n"
        f"Note: generic names like 'Strength', 'Structured Workout', or 'Weights' mean a general gym/strength session. "
        f"HR data and training effect (TE) scores (1=easy, 5=max) indicate session intensity. "
        f"Factor all of this in — avoid overworking muscle groups likely trained in the last 48 hours, "
        f"and consider overall fatigue from recent high-intensity sessions.\n"
        if fitbit_context else ""
    )
    prompt = (
        f"You are an expert personal trainer. Write a structured {duration} workout "
        f"using ONLY the equipment listed below. Do not reference any equipment not in the list.\n\n"
        f"Available equipment:\n" + "\n".join(f"- {e}" for e in equipment) + "\n\n"
        f"User profile:\n- Goal: {goal}\n- Experience: {experience}\n- {restriction_line}\n"
        f"{fitbit_line}"
        f"{variation_line}\n\n"
        f"Focus: {focus_line}\n\n"
        f"Sets and reps:\n"
        f"- Default to 20 reps per set for most exercises unless the movement type demands otherwise\n"
        f"  (e.g. heavy compound lifts or timed holds are fine to adjust)\n\n"
        f"IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — "
        f"must fit within {duration}. Do not over-program.\n\n"
        f"Format the plan in markdown with:\n"
        f"1. Warm-up: 5–15 min using available cardio equipment (rowing machine or skipping rope "
        f"if available; otherwise light bodyweight movement). Do NOT suggest running/treadmill.\n"
        f"2. Main workout — choose appropriate exercises for the equipment, ordered logically:\n"
        f"   - Group the workout into blocks of 3–4 exercises\n"
        f"   - Within each block, alternate between exercises (circuit-style) rather than completing all sets of one before moving on\n"
        f"   - Lead with the most demanding compound movements\n"
        f"   - For each exercise: sets × reps (or duration), rest period\n"
        f"3. Cool-down/stretch note (mention foam roller if available)"
    )
    with client.messages.stream(
        model="claude-sonnet-4-6", max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text

def build_run_suggestion_stream(goal, experience, restrictions, distance, run_type, run_context, variation):
    restrictions = sanitise_restrictions(restrictions)
    restriction_line = (
        f"The user has these restrictions/injuries: {restrictions}. Provide modifications where relevant."
        if restrictions else "The user has no injuries or limitations."
    )
    variation_line = (
        f"\nThis is variation #{variation} — suggest a meaningfully different run structure or session."
        if variation > 0 else ""
    )
    run_type_line = (
        f"The user wants a {run_type.lower()} run — structure the session around this.\n"
        if run_type and run_type != "Any" else ""
    )
    run_context_line = (
        f"\nRecent run history (last 7 days):\n{run_context}\n"
        f"Use this data — distance, pace, HR, training effect — to gauge current fitness "
        f"and training load. Plan a session that balances training stimulus with recovery.\n"
        if run_context else
        "No recent run data available — suggest a run appropriate for the user's goal and experience level.\n"
    )
    prompt = (
        f"You are an expert running coach. Plan a {distance} run for today.\n\n"
        f"User profile:\n- Goal: {goal}\n- Experience: {experience}\n- {restriction_line}\n"
        f"{run_type_line}"
        f"{run_context_line}"
        f"If {distance} seems like a significant jump from the user's recent distances "
        f"(e.g. beyond normal progression or risky given recent fatigue), "
        f"briefly flag this at the start — but still provide a full plan for the requested {distance}.\n"
        f"{variation_line}\n\n"
        f"Provide a structured run plan in markdown with:\n"
        f"1. **Run Type** (e.g. Easy Recovery, Tempo, Intervals, Long Run, Fartlek, Hill Reps, Sprint Session)\n"
        f"   — Explain why this suits today given recent training load\n"
        f"2. **Structure** — warm-up, main effort, cool-down with specific paces or effort levels "
        f"(use min/km referencing recent pace data, or RPE 1–10 if no data)\n"
        f"3. **Target Distance** — {distance}, broken down across the structure above\n"
        f"4. **Key Metrics to Watch** — target HR zones, pace windows, or effort cues\n"
        f"5. **Post-run** — brief recovery note (stretches, nutrition timing)\n\n"
        f"Keep pacing guidance concrete and practical, referencing the user's actual recent pace where available."
    )
    with client.messages.stream(
        model="claude-sonnet-4-6", max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

def init_state():
    defaults = {
        "stage": "activity",
        "mode": "By muscle group",
        "workout_mode": "muscle",
        "activity_type": None,
        "focus_groups": [],
        "selected": [],
        "equipment": [],
        "workout": "",
        "run_plan": "",
        "variation": 0,
        "goal": "Muscle",
        "experience": "Intermediate",
        "restrictions": "",
        "duration": "60 min",
        "run_distance": "5k",
        "run_type": "Any",
        "fitbit_token": None,
        "fitbit_activities": [],
        "fitbit_error": None,
        "garmin_connected": False,
        "garmin_activities": [],
        "selected_profile": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


# ---------------------------------------------------------------------------
# Step indicator
# ---------------------------------------------------------------------------

def render_step_indicator():
    mode          = st.session_state.mode or "By muscle group"
    stage         = st.session_state.stage
    activity_type = st.session_state.get("activity_type")

    if activity_type == "run" or stage == "run":
        steps  = ["activity", "preferences", "run"]
        labels = ["Session",  "Preferences",  "Run Plan"]
    elif mode == "By muscle group":
        steps  = ["activity", "preferences", "selection", "workout"]
        labels = ["Session",  "Preferences",  "Exercises",  "Workout"]
    else:
        steps  = ["activity", "preferences", "equipment", "workout"]
        labels = ["Session",  "Preferences",  "Equipment",  "Workout"]

    current = steps.index(stage) if stage in steps else 0
    pills = []
    for i, label in enumerate(labels):
        if i < current:
            cls, sym = "done",    "✓"
        elif i == current:
            cls, sym = "active",  str(i + 1)
        else:
            cls, sym = "pending", str(i + 1)
        pills.append(
            f'<span class="step-pill {cls}">'
            f'<span class="num">{sym}</span>{label}'
            f'</span>'
        )

    parts = []
    for i, pill in enumerate(pills):
        parts.append(pill)
        if i < len(pills) - 1:
            conn_cls = "done" if i < current else "pending"
            parts.append(f'<span class="step-connector {conn_cls}"></span>')

    st.markdown(
        f'<div class="step-row">{"".join(parts)}</div>',
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Stage renderers
# ---------------------------------------------------------------------------

def render_activity():
    st.header("Recent Activity")

    selection = st.selectbox(
        "Who are you?",
        options=[None] + _PROFILE_OPTIONS,
        index=([None] + _PROFILE_OPTIONS).index(st.session_state.selected_profile)
              if st.session_state.selected_profile in _PROFILE_OPTIONS else 0,
        format_func=lambda x: "Select…" if x is None else x,
        label_visibility="collapsed",
    )
    if selection != st.session_state.selected_profile:
        st.session_state.selected_profile = selection
        st.rerun()

    profile = get_user_profile()

    if profile == "pat":
        if st.session_state.fitbit_error:
            st.error(f"Fitbit connection failed: {st.session_state.fitbit_error}")
        if st.session_state.fitbit_token:
            with st.expander("Fitbit ✓", expanded=False):
                summary = fitbit_activity_summary(st.session_state.fitbit_activities)
                if summary:
                    st.markdown(summary)
                else:
                    st.caption("No workouts recorded in the last 7 days.")
        else:
            st.link_button("Connect Fitbit →", get_fitbit_auth_url(), use_container_width=True)
    elif profile == "nia":
        if st.session_state.garmin_connected:
            with st.expander("Garmin ✓", expanded=False):
                summary = garmin_activity_summary(st.session_state.garmin_activities)
                if summary:
                    st.markdown(summary)
                else:
                    st.caption("No workouts recorded in the last 7 days.")
        else:
            with st.spinner("Connecting to Garmin…"):
                try:
                    activities = fetch_garmin_activities()
                    st.session_state.garmin_activities = activities
                    st.session_state.garmin_connected  = True
                    st.rerun()
                except Exception as e:
                    st.error(f"Garmin connection failed: {e}")

    st.divider()
    activity_type = st.session_state.get("activity_type")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Run", type="primary" if activity_type == "run" else "secondary", use_container_width=True):
            st.session_state.activity_type = "run"
            st.session_state.stage = "preferences"
            st.rerun()
    with col2:
        if st.button("Workout", type="primary" if activity_type == "workout" else "secondary", use_container_width=True):
            st.session_state.activity_type = "workout"
            st.session_state.stage = "preferences"
            st.rerun()


def render_preferences():
    activity_type = st.session_state.get("activity_type")

    st.header("Your Preferences")

    if st.button("← Back", key="prefs_back"):
        st.session_state.stage         = "activity"
        st.session_state.activity_type = None
        st.rerun()

    restrictions = st.text_input(
        "Injuries or limitations",
        value=st.session_state.restrictions,
        placeholder="Leave blank if none",
    )

    btn_disabled = False
    mode = st.session_state.get("mode") or "By muscle group"
    focus_groups: list[str] = []

    if activity_type == "run":
        st.segmented_control(
            "Distance", ["2k", "5k", "8k", "10k", "12k", "14k", "Other"],
            key="_wgt_run_distance",
            default=st.session_state.get("run_distance") if st.session_state.get("run_distance") in ["2k", "5k", "8k", "10k", "12k", "14k", "Other"] else "5k",
        )
        run_distance_other = ""
        if st.session_state.get("_wgt_run_distance") == "Other":
            run_distance_other = st.text_input(
                "Enter distance (e.g. 6k, half marathon)",
                value="" if st.session_state.get("run_distance") in ["2k", "5k", "8k", "10k", "12k", "14k"] else st.session_state.get("run_distance", ""),
                placeholder="e.g. 6k",
            )
            btn_disabled = not run_distance_other.strip()
        st.segmented_control(
            "Type", ["Any", "Flat", "Hills", "Sprints"],
            key="_wgt_run_type",
            default=st.session_state.get("run_type", "Any"),
        )

    else:
        st.segmented_control(
            "Session duration", ["30 min", "45 min", "60 min", "90 min"],
            key="_wgt_duration",
            default=st.session_state.get("duration"),
        )
        st.segmented_control(
            "Fitness goal", ["Muscle", "Weight Loss", "Endurance", "General"],
            key="_wgt_goal",
            default=st.session_state.get("goal"),
        )
        st.segmented_control(
            "Experience level", ["Beginner", "Intermediate", "Advanced"],
            key="_wgt_experience",
            default=st.session_state.get("experience"),
        )
        st.segmented_control(
            "Workout mode", ["By muscle group", "By equipment"],
            key="_wgt_mode",
            default=st.session_state.get("mode"),
        )
        mode = st.session_state._wgt_mode or "By muscle group"
        if mode == "By muscle group":
            focus_groups = st.multiselect(
                "Focus areas (pick 1–3)",
                options=MUSCLE_GROUPS,
                default=st.session_state.focus_groups or [],
            )
            btn_disabled = len(focus_groups) == 0
        else:
            focus_groups = st.multiselect(
                "Focus areas (optional — leave blank to let Claude decide)",
                options=MUSCLE_GROUPS,
                default=st.session_state.focus_groups or [],
            )

    if st.button("Continue →", type="primary", disabled=btn_disabled):
        st.session_state.restrictions = restrictions
        st.session_state.workout      = ""
        st.session_state.run_plan     = ""
        st.session_state.variation    = 0
        if activity_type == "run":
            raw = st.session_state.get("_wgt_run_distance") or "5k"
            st.session_state.run_distance = run_distance_other.strip() if raw == "Other" else raw
            st.session_state.run_type     = st.session_state.get("_wgt_run_type") or "Any"
            st.session_state.stage        = "run"
        else:
            st.session_state.duration     = st.session_state._wgt_duration or "60 min"
            st.session_state.goal         = st.session_state._wgt_goal or "Muscle"
            st.session_state.experience   = st.session_state._wgt_experience or "Intermediate"
            st.session_state.mode         = mode
            st.session_state.focus_groups = focus_groups
            if mode == "By muscle group":
                seen: set[str] = set()
                preselected: list[str] = []
                for group in focus_groups:
                    for ex in EXERCISES.get(group, []):
                        if ex not in seen:
                            seen.add(ex)
                            preselected.append(ex)
                st.session_state.selected = preselected
                st.session_state.stage    = "selection"
            else:
                st.session_state.stage = "equipment"
        st.rerun()


def render_selection():
    focus_groups = st.session_state.focus_groups
    st.header("Choose Your Exercises")
    restrictions = st.session_state.restrictions
    limits_part = f" · Limits: **{restrictions[:30]}{'…' if len(restrictions) > 30 else ''}**" if restrictions else ""
    st.caption(
        f"Focus: **{', '.join(focus_groups)}** · "
        f"Goal: **{st.session_state.goal}** · "
        f"Level: **{st.session_state.experience}** · "
        f"Duration: **{st.session_state.duration}**"
        f"{limits_part}"
    )

    all_exercises: list[str] = list(dict.fromkeys(
        ex for group in focus_groups for ex in EXERCISES.get(group, [])
    ))
    all_selected = set(all_exercises) <= set(st.session_state.selected)
    if st.button("Clear all" if all_selected else "Select all", use_container_width=True):
        if all_selected:
            for ex in all_exercises:
                st.session_state[f"focus_{ex}"] = False
            st.session_state.selected = []
        else:
            for ex in all_exercises:
                st.session_state[f"focus_{ex}"] = True
            st.session_state.selected = all_exercises
        st.rerun()

    selected: set[str] = set(st.session_state.selected)
    rendered: set[str] = set()

    for group in focus_groups:
        st.subheader(group)
        exercises = [ex for ex in EXERCISES.get(group, []) if ex not in rendered]
        rendered.update(exercises)
        for ex in exercises:
            if f"focus_{ex}" not in st.session_state:
                st.session_state[f"focus_{ex}"] = ex in selected
            if st.checkbox(ex, key=f"focus_{ex}"):
                selected.add(ex)
            else:
                selected.discard(ex)

    other_groups = [g for g in MUSCLE_GROUPS if g not in focus_groups]
    if other_groups:
        with st.expander("Add exercises from other groups"):
            for group in other_groups:
                st.markdown(f"**{group}**")
                exercises = [ex for ex in EXERCISES.get(group, []) if ex not in rendered]
                rendered.update(exercises)
                for ex in exercises:
                    if f"other_{ex}" not in st.session_state:
                        st.session_state[f"other_{ex}"] = ex in selected
                    if st.checkbox(ex, key=f"other_{ex}"):
                        selected.add(ex)
                    else:
                        selected.discard(ex)

    st.session_state.selected = list(selected)

    st.divider()
    col1, col2 = st.columns([3, 1])
    with col1:
        if st.button("Build Workout →", type="primary", disabled=len(selected) == 0):
            st.session_state.workout_mode = "muscle"
            st.session_state.workout      = ""
            st.session_state.variation    = 0
            st.session_state.stage        = "workout"
            st.rerun()
    with col2:
        if st.button("← Back"):
            st.session_state.stage = "preferences"
            st.rerun()


def render_equipment():
    st.header("Your Equipment")
    focus_groups = st.session_state.focus_groups
    restrictions = st.session_state.restrictions
    limits_part = f" · Limits: **{restrictions[:30]}{'…' if len(restrictions) > 30 else ''}**" if restrictions else ""
    caption = (
        f"Goal: **{st.session_state.goal}** · "
        f"Level: **{st.session_state.experience}** · "
        f"Duration: **{st.session_state.duration}**"
        f"{limits_part}"
    )
    if focus_groups:
        caption = f"Focus: **{', '.join(focus_groups)}** · " + caption
    st.caption(caption)

    all_selected = set(EQUIPMENT) <= set(st.session_state.equipment)
    if st.button("Clear all" if all_selected else "Select all", use_container_width=True):
        if all_selected:
            for item in EQUIPMENT:
                st.session_state[f"equip_{item}"] = False
            st.session_state.equipment = []
        else:
            for item in EQUIPMENT:
                st.session_state[f"equip_{item}"] = True
            st.session_state.equipment = list(EQUIPMENT)
        st.rerun()

    checked: set[str] = set(st.session_state.equipment)
    for item in EQUIPMENT:
        if f"equip_{item}" not in st.session_state:
            st.session_state[f"equip_{item}"] = item in checked
        if st.checkbox(item, key=f"equip_{item}"):
            checked.add(item)
        else:
            checked.discard(item)

    st.session_state.equipment = list(checked)

    st.divider()
    col1, col2 = st.columns([3, 1])
    with col1:
        if st.button("Build Workout →", type="primary", disabled=len(checked) == 0):
            st.session_state.workout_mode = "equipment"
            st.session_state.workout      = ""
            st.session_state.stage        = "workout"
            st.rerun()
    with col2:
        if st.button("← Back"):
            st.session_state.stage = "preferences"
            st.rerun()


def render_activity_type():
    st.header("What's Today's Session?")
    st.caption("Choose the type of training you want to do.")

    col1, col2 = st.columns(2)
    with col1:
        if st.button("Run", type="primary", use_container_width=True):
            st.session_state.activity_type = "run"
            st.session_state.run_plan      = ""
            st.session_state.variation     = 0
            st.session_state.stage         = "run"
            st.rerun()
    with col2:
        if st.button("Workout", type="primary", use_container_width=True):
            st.session_state.activity_type = "workout"
            mode         = st.session_state.mode
            focus_groups = st.session_state.focus_groups
            if mode == "By muscle group":
                seen: set[str] = set()
                preselected: list[str] = []
                for group in focus_groups:
                    for ex in EXERCISES.get(group, []):
                        if ex not in seen:
                            seen.add(ex)
                            preselected.append(ex)
                st.session_state.selected = preselected
                st.session_state.stage    = "selection"
            else:
                st.session_state.stage = "equipment"
            st.rerun()

    st.divider()
    if st.button("← Back"):
        st.session_state.stage = "preferences"
        st.rerun()


def render_run():
    st.markdown(PRINT_CSS, unsafe_allow_html=True)
    st.header("Your Run Plan")

    caption_parts = [
        f"Distance: **{st.session_state.run_distance}**",
        f"Type: **{st.session_state.run_type}**",
    ]
    if st.session_state.variation > 0:
        caption_parts.append(f"Variation **#{st.session_state.variation}**")
    st.caption(" · ".join(caption_parts))

    if not st.session_state.run_plan:
        components.html(
            """<script>
            const el = window.parent.document.querySelector('section[data-testid="stMain"]')
                     || window.parent.document.querySelector('.main');
            if (el) el.scrollTop = 0;
            </script>""",
            height=0,
        )
        profile = get_user_profile()
        if profile == "nia":
            run_context = get_run_context_garmin(st.session_state.garmin_activities)
        else:
            run_context = get_run_context_fitbit(st.session_state.fitbit_activities)
        full_text = st.write_stream(build_run_suggestion_stream(
            st.session_state.goal, st.session_state.experience,
            st.session_state.restrictions, st.session_state.run_distance,
            st.session_state.run_type, run_context, st.session_state.variation,
        ))
        st.session_state.run_plan = full_text
    else:
        st.markdown(st.session_state.run_plan)

    st.divider()
    if st.button("Regenerate", type="primary", use_container_width=True):
        st.session_state.variation += 1
        st.session_state.run_plan  = ""
        st.rerun()
    col1, col2 = st.columns(2)
    with col1:
        if st.button("← Change", use_container_width=True):
            st.session_state.stage    = "preferences"
            st.session_state.run_plan = ""
            st.rerun()
    with col2:
        if st.button("← Start Over", use_container_width=True):
            st.session_state.stage         = "activity"
            st.session_state.activity_type = None
            st.rerun()
    components.html(PRINT_BUTTON_HTML, height=40)


PRINT_CSS = """
<style>
@media print {
    header, footer, [data-testid="stToolbar"], [data-testid="stDecoration"],
    [data-testid="stStatusWidget"], #MainMenu, .stDeployButton { display: none !important; }
    .stButton, hr { display: none !important; }
    .block-container { padding: 1rem 2rem !important; }
}
</style>
"""

PRINT_BUTTON_HTML = """
<style>
button.print-btn {
    width: 100%; padding: 0.4rem 1rem; background: #f9fafb; border: 1px solid #e5e7eb;
    border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;
    color: #374151; font-family: 'Inter', sans-serif; font-weight: 500;
}
button.print-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
</style>
<button class="print-btn" onclick="window.parent.print()">Print / Save as PDF</button>
"""


def render_workout():
    st.markdown(PRINT_CSS, unsafe_allow_html=True)
    st.header("Your Workout")

    equipment_mode = st.session_state.workout_mode == "equipment"
    caption_parts = []
    if st.session_state.focus_groups:
        caption_parts.append(f"Focus: **{', '.join(st.session_state.focus_groups)}**")
    caption_parts += [
        f"Goal: **{st.session_state.goal}**",
        f"Experience: **{st.session_state.experience}**",
        f"Duration: **{st.session_state.duration}**",
    ]
    if st.session_state.variation > 0:
        caption_parts.append(f"Variation **#{st.session_state.variation}**")
    st.caption(" · ".join(caption_parts))

    if not st.session_state.workout:
        components.html(
            """<script>
            const el = window.parent.document.querySelector('section[data-testid="stMain"]')
                     || window.parent.document.querySelector('.main');
            if (el) el.scrollTop = 0;
            </script>""",
            height=0,
        )
        profile = get_user_profile()
        if profile == "nia":
            fitbit_context = garmin_activity_summary(st.session_state.garmin_activities)
        else:
            fitbit_context = fitbit_activity_summary(st.session_state.fitbit_activities)
        if equipment_mode:
            full_text = st.write_stream(build_equipment_workout_stream(
                st.session_state.goal, st.session_state.experience,
                st.session_state.restrictions, st.session_state.duration,
                st.session_state.equipment, st.session_state.focus_groups,
                st.session_state.variation, fitbit_context,
            ))
        else:
            full_text = st.write_stream(build_workout_stream(
                st.session_state.goal, st.session_state.experience,
                st.session_state.restrictions, st.session_state.duration,
                st.session_state.focus_groups, st.session_state.selected,
                st.session_state.variation, fitbit_context,
            ))
        st.session_state.workout = full_text
    else:
        st.markdown(st.session_state.workout)

    st.divider()
    if st.button("Regenerate", type="primary", use_container_width=True):
        st.session_state.variation += 1
        st.session_state.workout = ""
        st.rerun()
    nav_col, print_col = st.columns(2)
    with nav_col:
        edit_stage = "equipment" if equipment_mode else "selection"
        edit_label = "← Edit Equipment" if equipment_mode else "← Edit Exercises"
        if st.button(edit_label, use_container_width=True):
            st.session_state.stage = edit_stage
            st.rerun()
    with print_col:
        if st.button("← Start Over", use_container_width=True):
            st.session_state.stage         = "activity"
            st.session_state.activity_type = None
            st.rerun()
    components.html(PRINT_BUTTON_HTML, height=40)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

st.markdown(GLOBAL_CSS, unsafe_allow_html=True)
st.title("Fitness Chat")

init_state()

# Handle Fitbit OAuth callback — Fitbit redirects back with ?code=...
if "code" in st.query_params and not st.session_state.fitbit_token:
    try:
        token_data = exchange_fitbit_code(st.query_params["code"])
        if "access_token" in token_data:
            st.session_state.fitbit_token      = token_data["access_token"]
            st.session_state.fitbit_activities = fetch_fitbit_activities(token_data["access_token"])
        else:
            st.session_state.fitbit_error = token_data.get("errors", token_data)
    except Exception as e:
        st.session_state.fitbit_error = str(e)
    finally:
        try:
            st.query_params.clear()
        except Exception:
            pass
    st.rerun()

render_step_indicator()

stage = st.session_state.stage
if stage == "activity":
    render_activity()
elif stage == "preferences":
    render_preferences()
elif stage == "run":
    render_run()
elif stage == "selection":
    render_selection()
elif stage == "equipment":
    render_equipment()
elif stage == "workout":
    render_workout()
