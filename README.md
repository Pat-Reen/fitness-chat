# fitness-chat

A personalized AI fitness companion that generates tailored workout plans based on your goals, experience level, and available equipment.

## Features

- **Preference-based setup** — configure your fitness goal, experience level, session duration, and any injuries or limitations
- **Two workout modes:**
  - **By muscle group** — select focus areas, then pick specific exercises from a curated list
  - **By equipment** — select what equipment you have available and let Claude design the session
- **Structured workout generation** — workouts are organized into blocks of 3–4 alternating exercises, defaulting to 20 reps per set
- **Generate Different Workout** — get a meaningfully varied alternative without changing your settings

## Technologies

- **Python**
- **Anthropic Claude** (`claude-sonnet-4-6`) — workout generation
- **Streamlit** — web UI

## How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Pat-Reen/fitness-chat.git
   cd fitness-chat
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your API key:**

   Create a `.env` file in the project root:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. **Run the app:**
   ```bash
   python -m streamlit run app.py
   ```

   The app will be available at `http://localhost:8501`.

## License

MIT
