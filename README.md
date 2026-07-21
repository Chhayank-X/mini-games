# ⚡ Neon Runner - 3D Endless Runner Game

Welcome to **Neon Runner**, a premium 3D endless runner game (inspired by Subway Surfers) styled with a retro-futuristic cyberpunk aesthetic. The game runs within a sleek, responsive dashboard UI featuring glowing neon accents, an arcade-style HUD, custom shop integrations, and a dedicated ad/sponsor space.

---

## 🎮 Key Features

*   **Dynamic 3D Visuals (Three.js):** Custom perspective track rendering, neon gridlines, oncoming glowing trains, slide-under barriers, and volumetric fog fading into the darkness.
*   **Procedural Synth Audio (Web Audio API):** All background music and sound effects (jumping whoosh, sliding friction, coin chimes, and crash explosions) are synthesized in real-time. Zero external audio files required!
*   **Customization Shop:** Collect coins during your runs to buy and equip custom neon hoverboards (Neon Green, Cyber Purple, Magma Red, and Gold Edition) directly from the sidebar.
*   **Persistent High Scores:** Your top scores are automatically tracked and saved in `localStorage` so you can compete to beat your personal best.
*   **Sponsor Sidebar:** Integrated space for banner advertisements styled to match the dark cyberpunk theme.
*   **Autopilot AI (Unbeatable):** Toggle **Auto Play** from the HUD to watch a smart agent play for you. It automatically switches lanes to gather coins, dodges obstacles, and has built-in collision safeguards to ensure it never crashes.

---

## ⌨️ Controls

*   **Move Left:** `Left Arrow` / `A`
*   **Move Right:** `Right Arrow` / `D`
*   **Jump:** `Up Arrow` / `W` / `Spacebar` (allows running on top of trains)
*   **Slide / Fast-Fall:** `Down Arrow` / `S`
*   **Mobile Screens:** Swiping in the corresponding direction triggers moves, jumps, and slides.

---

## 🛠️ Technology Stack

*   **Core:** HTML5, CSS3 (Vanilla Grid & Flexbox)
*   **Bundler:** Vite
*   **3D Graphics:** Three.js
*   **Audio Synthesis:** Web Audio API

---

## 🚀 How to Run Locally

Follow these quick steps to get the game running on your local machine:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Chhayank-X/mini-games.git
    cd mini-games
    ```

2.  **Install Dependencies:**
    Make sure you have Node.js installed, then run:
    ```bash
    npm install
    ```

3.  **Launch Dev Server:**
    Start the local server:
    ```bash
    npm run dev
    ```

4.  **Play in Browser:**
    Open the local URL displayed in the terminal (usually `http://localhost:5173`) to start surfing the grid!
