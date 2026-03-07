import anthropic
import os
from dotenv import load_dotenv
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
# Claude helpers
# ---------------------------------------------------------------------------

def build_workout_stream(goal, experience, restrictions, duration, focus_groups, exercises, variation):
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
    prompt = (
        f"You are an expert personal trainer. Write a structured {duration} gym workout "
        f"using ONLY the exercises listed below. The session focuses on: {', '.join(focus_groups)}.\n\n"
        f"User profile:\n- Goal: {goal}\n- Experience: {experience}\n- {restriction_line}\n"
        f"{variation_line}\n\n"
        f"Exercises to include:\n{exercise_list}\n\n"
        f"IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — "
        f"must fit within {duration}. Choose an appropriate number of sets per exercise so the "
        f"timing works out. Do not over-program.\n\n"
        f"Format the plan in markdown with:\n"
        f"1. Warm-up: 10–20 minutes on the rowing machine or stationary/spin bike "
        f"(the user runs on non-gym days so do NOT suggest treadmill/running as a warm-up)\n"
        f"2. Main workout — order exercises logically for a real gym session:\n"
        f"   - Lead with the most demanding compound movements\n"
        f"   - Group exercises by area of the gym to minimise equipment changes and walking\n"
        f"   - Finish with isolation or machine work, then mat/core exercises last\n"
        f"   - You may superset antagonist muscle groups (e.g. chest + back) where it makes sense\n"
        f"   - For each exercise: sets × reps (or duration), rest period\n"
        f"3. A brief cool-down note"
    )
    with client.messages.stream(
        model="claude-sonnet-4-6", max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            yield text


def build_equipment_workout_stream(goal, experience, restrictions, duration, equipment, focus_groups, variation):
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
    prompt = (
        f"You are an expert personal trainer. Write a structured {duration} workout "
        f"using ONLY the equipment listed below. Do not reference any equipment not in the list.\n\n"
        f"Available equipment:\n" + "\n".join(f"- {e}" for e in equipment) + "\n\n"
        f"User profile:\n- Goal: {goal}\n- Experience: {experience}\n- {restriction_line}\n"
        f"{variation_line}\n\n"
        f"Focus: {focus_line}\n\n"
        f"Sets and reps:\n"
        f"- Default to 4 sets × 20 reps for most exercises unless the movement type demands otherwise\n"
        f"  (e.g. heavy compound lifts or timed holds are fine to adjust)\n"
        f"- Keep sets and reps consistent across all exercises within the same workout block\n\n"
        f"IMPORTANT: The entire session — warm-up, all sets, all rest periods, and cool-down — "
        f"must fit within {duration}. Do not over-program.\n\n"
        f"Format the plan in markdown with:\n"
        f"1. Warm-up: 5–15 min using available cardio equipment (rowing machine or skipping rope "
        f"if available; otherwise light bodyweight movement). Do NOT suggest running/treadmill.\n"
        f"2. Main workout — choose appropriate exercises for the equipment, ordered logically:\n"
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

# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

def init_state():
    defaults = {
        "stage": "preferences",
        "mode": "By muscle group",
        "workout_mode": "muscle",
        "focus_groups": [],
        "selected": [],
        "equipment": [],
        "workout": "",
        "variation": 0,
        "goal": "Muscle",
        "experience": "Intermediate",
        "restrictions": "",
        "duration": "60 min",
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


# ---------------------------------------------------------------------------
# Step indicator
# ---------------------------------------------------------------------------

def render_step_indicator():
    mode = st.session_state.mode or "By muscle group"
    stage = st.session_state.stage
    if mode == "By muscle group":
        steps  = ["preferences", "selection", "workout"]
        labels = ["Preferences",  "Exercises",  "Workout"]
    else:
        steps  = ["preferences", "equipment", "workout"]
        labels = ["Preferences",  "Equipment",  "Workout"]

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

def render_preferences():
    st.header("Your Preferences")

    st.segmented_control(
        "Fitness goal", ["Muscle", "Weight Loss", "Endurance", "General"],
        key="goal",
    )
    st.segmented_control(
        "Experience level", ["Beginner", "Intermediate", "Advanced"],
        key="experience",
    )
    st.segmented_control(
        "Session duration", ["30 min", "45 min", "60 min", "90 min"],
        key="duration",
    )
    restrictions = st.text_input(
        "Injuries or limitations",
        value=st.session_state.restrictions,
        placeholder="Leave blank if none",
    )
    st.segmented_control(
        "Workout mode", ["By muscle group", "By equipment"],
        key="mode",
    )

    mode = st.session_state.mode or "By muscle group"
    if mode == "By muscle group":
        focus_groups = st.multiselect(
            "Focus areas (pick 1–3)",
            options=MUSCLE_GROUPS,
            default=st.session_state.focus_groups or [],
        )
        btn_label    = "Select Exercises →"
        btn_disabled = len(focus_groups) == 0
    else:
        focus_groups = st.multiselect(
            "Focus areas (optional — leave blank to let Claude decide)",
            options=MUSCLE_GROUPS,
            default=st.session_state.focus_groups or [],
        )
        btn_label    = "Select Equipment →"
        btn_disabled = False

    if st.button(btn_label, type="primary", disabled=btn_disabled):
        st.session_state.restrictions = restrictions
        st.session_state.focus_groups = focus_groups
        st.session_state.workout      = ""

        if mode == "By muscle group":
            seen: set[str] = set()
            preselected: list[str] = []
            for group in focus_groups:
                for ex in EXERCISES.get(group, []):
                    if ex not in seen:
                        seen.add(ex)
                        preselected.append(ex)
            st.session_state.selected  = preselected
            st.session_state.variation = 0
            st.session_state.stage     = "selection"
        else:
            st.session_state.variation = 0
            st.session_state.stage     = "equipment"

        st.rerun()


def render_selection():
    focus_groups = st.session_state.focus_groups
    st.header("Choose Your Exercises")
    st.caption(
        f"Focus: **{', '.join(focus_groups)}** · "
        f"Goal: **{st.session_state.goal}** · "
        f"Duration: **{st.session_state.duration}**"
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
            if st.checkbox(ex, value=(ex in selected), key=f"focus_{ex}"):
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
                    if st.checkbox(ex, value=(ex in selected), key=f"other_{ex}"):
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
    caption = f"Goal: **{st.session_state.goal}** · Duration: **{st.session_state.duration}**"
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
        if st.checkbox(item, value=(item in checked), key=f"equip_{item}"):
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
        if equipment_mode:
            full_text = st.write_stream(build_equipment_workout_stream(
                st.session_state.goal, st.session_state.experience,
                st.session_state.restrictions, st.session_state.duration,
                st.session_state.equipment, st.session_state.focus_groups,
                st.session_state.variation,
            ))
        else:
            full_text = st.write_stream(build_workout_stream(
                st.session_state.goal, st.session_state.experience,
                st.session_state.restrictions, st.session_state.duration,
                st.session_state.focus_groups, st.session_state.selected,
                st.session_state.variation,
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
            st.session_state.stage = "preferences"
            st.rerun()
    components.html(PRINT_BUTTON_HTML, height=40)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

st.markdown(GLOBAL_CSS, unsafe_allow_html=True)
st.title("Fitness Chat")

init_state()
render_step_indicator()

stage = st.session_state.stage
if stage == "preferences":
    render_preferences()
elif stage == "selection":
    render_selection()
elif stage == "equipment":
    render_equipment()
elif stage == "workout":
    render_workout()
