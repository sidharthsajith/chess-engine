# ♔ chess-mathengine

A powerful chess engine with a premium web UI, built entirely with **pure JavaScript** — no frameworks, no dependencies. Play against an AI powered by minimax search with alpha-beta pruning.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## ✨ Features

### Web Interface
- **Premium Dark UI** — Navy & gold color palette with glassmorphism effects
- **Drag & Drop** — Click or drag pieces to make moves
- **Legal Move Hints** — Gold dots for moves, red rings for captures
- **Player Cards** — Live timers, captured pieces display
- **Engine Analysis Panel** — Real-time eval, depth, nodes/sec, search time
- **Move History** — Full SAN notation with move-by-move scrolling
- **Evaluation Bar** — Visual position advantage indicator
- **Responsive Design** — Works on desktop & mobile screens

### Chess Engine
- **Minimax Search** with alpha-beta pruning
- **Iterative Deepening** with time-limited search
- **Quiescence Search** — extends captures to avoid the horizon effect
- **Transposition Table** — caches evaluated positions via FEN keys
- **Move Ordering** — MVV-LVA + promotion/check scoring
- **Tapered Evaluation** — piece-square tables that interpolate between midgame & endgame phases

### Game Management
- **4 Difficulty Levels** — Easy (depth 2) → Brutal (depth 6)
- **Play as White, Black, or Random**
- **Undo, Flip Board, Resign**
- **Promotion Picker** modal
- **Game Over Detection** — checkmate, stalemate, draws, insufficient material

## 🚀 Quick Start

No build tools or dependencies required. Just a browser.

```bash
# Clone the repo
git clone https://github.com/sidharthsajith/chess-mathengine.git
cd chess-mathengine

# Serve locally (any static server works)
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

## 📁 Project Structure

```
chess-mathengine/
├── index.html          # Main page structure
├── style.css           # Premium dark-mode UI styles
├── app.js              # UI controller (rendering, interactions, game flow)
├── chess-engine.js     # Core chess engine (move gen, AI, evaluation)
├── chess_tui_engine.py # Original Python TUI engine
└── README.md
```

## 🎮 Terminal Version (Python)

The original TUI engine is also included:

```bash
pip install chess
python3 chess_tui_engine.py
```

**TUI Controls:** `e4`, `Nf3`, `O-O` (algebraic notation) or `e2e4` (UCI) · `undo` · `resign` · `draw` · `? / help`

## 🛠️ Technical Details

| Component | Details |
|---|---|
| **Piece Values** | P=100, N=320, B=330, R=500, Q=900, K=20000 |
| **Search** | Iterative deepening + alpha-beta + quiescence |
| **Eval** | Tapered midgame/endgame PST interpolation |
| **Move Ordering** | MVV-LVA, promotions, checks |
| **Time Control** | Per-depth time limits (1s–15s) |

## 📜 License

This project is for educational purposes. Feel free to modify and expand upon it!
