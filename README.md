# Pure Math Chess Engine (TUI)

A complete, standalone, terminal-based chess application written in pure Python. Play against a custom-built, math-based chess engine with a professional-grade text interface.

## 🚀 Features

-   **Professional TUI**:
    -   Unicode chess symbols (♔, ♚, ♘, ♞ etc.) for a sleek look.
    -   ANSI color-coded board with highlight support for the last move.
    -   Perspective-aware rendering (board flips when playing as Black).
    -   Real-time captured pieces display.
    -   Live engine thinking stats including Depth, NPS (Nodes Per Second), and PV (Principal Variation).
-   **Strong Chess Engine**:
    -   **Minimax Search**: Explores the game tree to find optimal moves.
    -   **Alpha-Beta Pruning**: Drastically reduces the search tree by discarding irrelevant branches.
    -   **Quiescence Search**: Prevents tactical "horizon effect" by extending searches during captures.
    -   **Iterative Deepening**: Progressively increases search depth for better time management.
    -   **Tapered Evaluation**: Sophisticated evaluation function using Piece-Square Tables (PST) that interpolate between midgame and endgame phases.
    -   **Move Ordering**: Optimizes search efficiency using MVV-LVA (Most Valuable Victim - Least Valuable Attacker) and promotion/check scoring.
    -   **Transposition Table**: Caches evaluated positions using FEN keys to avoid redundant computations.
-   **Game Management**:
    -   Supports **SAN** (Algebraic Notation like `e4`, `Nf3`) and **UCI** (`e2e4`) input.
    -   Undo functionality, resignation, and draw offers.
    -   Rematch system and PGN export.

## 🛠️ Technical Documentation

### Evaluation Function
The engine uses a combination of piece values and positional bonuses. 
-   **Piece Values**: P=100, N=320, B=330, R=500, Q=900, K=20000.
-   **PST Bonuses**: Different tables for each piece type encourage development toward the center, king safety in the midgame, and king activity in the endgame.
-   **Game Phase**: The engine calculates the remaining non-pawn material to determine if it is in the "Midgame" or "Endgame," adjusting the King's PST accordingly.

### Search Algorithm
The search is based on the **Minimax** principle with **Alpha-Beta pruning**.
1.  **Iterative Deepening**: The engine starts at depth 1 and increases until it reaches the target depth or the time limit expires.
2.  **Move Ordering**: To make Alpha-Beta pruning most effective, the engine sorts moves by potential value (captures of high-value pieces first).
3.  **Transposition Table**: Every evaluated position is stored in a dictionary. If the engine encounters the same position through a different move order, it retrieves the stored score immediately.

## 🎮 How to Play

### Prerequisites
-   Python 3.9+
-   `python-chess` library

```bash
pip install chess
```

### Running the Game
Simply run the main script:
```bash
python3 chess_tui_engine.py
```

### Controls
-   **Move**: Type standard algebraic notation (e.g., `e4`, `Nf3`, `O-O`) or UCI (e.g., `e2e4`).
-   **? / help**: Show all legal moves in the current position.
-   **undo**: Revert your last move (and the engine's response).
-   **resign**: Concede the game.
-   **draw**: Offer a draw to the engine.

## 📜 License
This project is for educational purposes. Feel free to modify and expand upon it!
