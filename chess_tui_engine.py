import chess
import chess.pgn
import os
import sys
import time
from typing import Optional, List, Union, Tuple

# Piece mapping to Unicode symbols
PIECE_SYMBOLS = {
    chess.PAWN: ("♙", "♟"),
    chess.KNIGHT: ("♘", "♞"),
    chess.BISHOP: ("♗", "♝"),
    chess.ROOK: ("♖", "♜"),
    chess.QUEEN: ("♕", "♛"),
    chess.KING: ("♔", "♚"),
}

# ANSI Colors
COLOR_RESET = "\033[0m"
BG_LIGHT = "\033[48;5;251m"  # Light gray
BG_DARK = "\033[48;5;238m"   # Dark gray
BG_LAST_MOVE = "\033[48;5;226m" # Yellow highlight
FG_BLACK = "\033[38;5;232m"  # Deep black
FG_WHITE = "\033[38;5;255m"  # Bright white
BOLD = "\033[1m"

def clear_screen() -> None:
    os.system('cls' if os.name == 'nt' else 'clear')

def get_piece_symbol(piece: chess.Piece) -> str:
    symbol = PIECE_SYMBOLS[piece.piece_type][1 if piece.color == chess.BLACK else 0]
    color = FG_WHITE if piece.color == chess.WHITE else FG_BLACK
    return f"{BOLD}{color}{symbol}{COLOR_RESET}"

def display_board(board: chess.Board, perspective: chess.Color = chess.WHITE, last_move: Optional[chess.Move] = None) -> None:
    clear_screen()
    print(f"\n{BOLD}   === PURE MATH CHESS ENGINE ==={COLOR_RESET}")
    
    ranks = range(8) if perspective == chess.BLACK else range(7, -1, -1)
    files = range(7, -1, -1) if perspective == chess.BLACK else range(8)
    
    file_labels = "     a b c d e f g h" if perspective == chess.WHITE else "     h g f e d c b a"
    
    print("\n" + file_labels)
    
    highlight_squares = []
    if last_move:
        highlight_squares = [last_move.from_square, last_move.to_square]

    for r in ranks:
        line = f"  {r+1}  "
        for f in files:
            square = chess.square(f, r)
            piece = board.piece_at(square)
            
            is_light = (r + f) % 2 != 0
            bg = BG_LIGHT if is_light else BG_DARK
            if square in highlight_squares:
                bg = BG_LAST_MOVE
            
            if piece:
                symbol = get_piece_symbol(piece)
                line += f"{bg} {symbol} {COLOR_RESET}"
            else:
                line += f"{bg}   {COLOR_RESET}"
        
        # Add captured pieces on the side
        if r == 7:
            w_cap, b_cap = get_captured_pieces(board)
            line += f"   Captured by White: {' '.join(w_cap[:8])}"
        elif r == 6:
            w_cap, b_cap = get_captured_pieces(board)
            if len(w_cap) > 8: line += f"                      {' '.join(w_cap[8:])}"
        elif r == 1:
            w_cap, b_cap = get_captured_pieces(board)
            line += f"   Captured by Black: {' '.join(b_cap[:8])}"
        elif r == 0:
            w_cap, b_cap = get_captured_pieces(board)
            if len(b_cap) > 8: line += f"                      {' '.join(b_cap[8:])}"
            
        line += f"  {r+1}  "
        print(line)
        
    print(file_labels + "\n")
    
    # Status bar
    turn_str = f"{BOLD}WHITE{COLOR_RESET}" if board.turn == chess.WHITE else f"{BOLD}BLACK{COLOR_RESET}"
    move_number = (len(board.move_stack) // 2) + 1
    check_status = f" | {BOLD}CHECK!{COLOR_RESET}" if board.is_check() else ""
    
    print(f" Turn: {turn_str} | Move: {move_number}{check_status}")
    
    if board.is_game_over():
        print(f"\n {BOLD}GAME OVER: {board.result()}{COLOR_RESET}")
        outcome = board.outcome()
        if outcome:
            print(f" Reason: {outcome.termination.name}")

def get_captured_pieces(board: chess.Board) -> Tuple[List[str], List[str]]:
    white_captured = []
    black_captured = []
    
    # Standard starting pieces
    start_pieces = {
        chess.PAWN: 8, chess.KNIGHT: 2, chess.BISHOP: 2, chess.ROOK: 2, chess.QUEEN: 1
    }
    
    current_pieces_white = {pt: 0 for pt in start_pieces}
    current_pieces_black = {pt: 0 for pt in start_pieces}
    
    for square in chess.SQUARES:
        p = board.piece_at(square)
        if p and p.piece_type != chess.KING:
            if p.color == chess.WHITE:
                current_pieces_white[p.piece_type] += 1
            else:
                current_pieces_black[p.piece_type] += 1
                
    for pt, count in start_pieces.items():
        # If white has fewer than starting, black captured them
        for _ in range(count - current_pieces_white[pt]):
            black_captured.append(PIECE_SYMBOLS[pt][0])
        # If black has fewer than starting, white captured them
        for _ in range(count - current_pieces_black[pt]):
            white_captured.append(PIECE_SYMBOLS[pt][1])
            
    return white_captured, black_captured

def get_human_move(board: chess.Board) -> Optional[chess.Move]:
    while True:
        try:
            move_input = input("\n Your move (SAN or UCI, '?' for help, 'undo'): ").strip()
            
            if not move_input:
                continue
                
            if move_input.lower() in ["?", "help", "moves"]:
                legal_moves = [board.san(m) for m in board.legal_moves]
                print(f" Legal moves: {', '.join(legal_moves)}")
                continue
                
            if move_input.lower() == "undo":
                return "undo"

            if move_input.lower() == "resign":
                return "resign"

            if move_input.lower() == "draw":
                return "draw"

            # Try SAN first
            try:
                move = board.parse_san(move_input)
                return move
            except ValueError:
                # Try UCI
                try:
                    move = board.parse_uci(move_input)
                    if move in board.legal_moves:
                        return move
                    else:
                        print(" Illegal move!")
                except ValueError:
                    print(" Invalid notation. Use SAN (e.g., e4, Nf3) or UCI (e2e4).")
        except KeyboardInterrupt:
            print("\n Game terminated.")
            sys.exit(0)

def get_game_settings() -> Tuple[chess.Color, int, float]:
    clear_screen()
    print(f"\n{BOLD}   === PURE MATH CHESS ENGINE ==={COLOR_RESET}")
    print("\n Welcome! Please choose your settings:")
    
    # Color
    color_choice = input("\n Play as (W)hite, (B)lack, or (R)andom? [W]: ").strip().lower()
    if color_choice == 'b':
        human_color = chess.BLACK
    elif color_choice == 'r':
        import random
        human_color = random.choice([chess.WHITE, chess.BLACK])
    else:
        human_color = chess.WHITE
        
    # Strength
    print("\n Choose difficulty:")
    print(" 1. Easy   (Depth 3, ~1200 Elo)")
    print(" 2. Medium (Depth 5, ~1500 Elo)")
    print(" 3. Hard   (Depth 7, ~1800 Elo)")
    print(" 4. Custom (You specify depth and time limit)")
    
    diff_choice = input("\n Selection [2]: ").strip()
    if diff_choice == '1':
        depth, time_limit = 3, 2.0
    elif diff_choice == '3':
        depth, time_limit = 7, 15.0
    elif diff_choice == '4':
        try:
            depth = int(input(" Enter max depth [6]: ") or 6)
            time_limit = float(input(" Enter time limit per move (sec) [10]: ") or 10.0)
        except ValueError:
            depth, time_limit = 6, 10.0
    else:
        depth, time_limit = 5, 5.0
        
    return human_color, depth, time_limit

# --- ENGINE EVALUATION CONSTANTS ---

# Piece values (centipawns)
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

# Piece-Square Tables (PSTs) - Simplified versions for White
# For Black, we flip the index.
# Higher value = better position.

PST_PAWN = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
]

PST_KNIGHT = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
]

PST_BISHOP = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
]

PST_ROOK = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
]

PST_QUEEN = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
]

PST_KING_MID = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
]

PST_KING_END = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
]

PSTS = {
    chess.PAWN: PST_PAWN,
    chess.KNIGHT: PST_KNIGHT,
    chess.BISHOP: PST_BISHOP,
    chess.ROOK: PST_ROOK,
    chess.QUEEN: PST_QUEEN,
    chess.KING: (PST_KING_MID, PST_KING_END)
}

class MathChessEngine:
    def __init__(self, max_depth: int = 4, time_limit: float = 10.0):
        self.max_depth = max_depth
        self.time_limit = time_limit
        self.nodes = 0
        self.tt = {} # Transposition Table

    def evaluate(self, board: chess.Board) -> int:
        if board.is_checkmate():
            return -2000000 if board.turn == chess.WHITE else 2000000
        if board.is_stalemate() or board.is_insufficient_material():
            return 0
            
        score = 0
        
        # Determine phase (midgame vs endgame)
        # Total material: 2*Q + 4*R + 4*B + 4*N = 2*900 + 4*500 + 4*330 + 4*320 = 1800 + 2000 + 1320 + 1280 = 6400
        # We'll use a simple non-pawn material count
        white_material = 0
        black_material = 0
        
        for square, piece in board.piece_map().items():
            val = PIECE_VALUES[piece.piece_type]
            if piece.color == chess.WHITE:
                score += val
                if piece.piece_type != chess.PAWN and piece.piece_type != chess.KING:
                    white_material += val
                
                # PST bonus
                idx = chess.square_mirror(square) if piece.color == chess.WHITE else square # PSTs are for white (rank 1 at bottom)
                # Wait, python-chess square 0 is A1. PST[0] is typically A8 top-left in 1D array.
                # Let's fix indexing. 
                pst_idx = (7 - chess.square_rank(square)) * 8 + chess.square_file(square)
                
                if piece.piece_type == chess.KING:
                    # Tapered king eval
                    mid_pst = PSTS[chess.KING][0][pst_idx]
                    end_pst = PSTS[chess.KING][1][pst_idx]
                    phase = min(1.0, (white_material + black_material) / 5000)
                    score += int(mid_pst * phase + end_pst * (1 - phase))
                else:
                    score += PSTS[piece.piece_type][pst_idx]
                    
            else:
                score -= val
                if piece.piece_type != chess.PAWN and piece.piece_type != chess.KING:
                    black_material += val
                
                # PST bonus (flipped for black)
                pst_idx = chess.square_rank(square) * 8 + chess.square_file(square)
                
                if piece.piece_type == chess.KING:
                    mid_pst = PSTS[chess.KING][0][pst_idx]
                    end_pst = PSTS[chess.KING][1][pst_idx]
                    phase = min(1.0, (white_material + black_material) / 5000)
                    score -= int(mid_pst * phase + end_pst * (1 - phase))
                else:
                    score -= PSTS[piece.piece_type][pst_idx]

        # Mobility bonus
        # (Be careful, this is expensive during search, maybe keep it simple)
        # score += (board.legal_moves.count() * 2) if board.turn == chess.WHITE else -(board.legal_moves.count() * 2)
        
        return score

    def get_move_score(self, board: chess.Board, move: chess.Move) -> int:
        """Simple move ordering: MVV-LVA, promotions, checks."""
        if board.is_capture(move):
            victim = board.piece_at(move.to_square)
            attacker = board.piece_at(move.from_square)
            if victim and attacker:
                # MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
                return 10 * PIECE_VALUES[victim.piece_type] - PIECE_VALUES[attacker.piece_type]
            return 1000
        
        if move.promotion:
            return 900
            
        if board.gives_check(move):
            return 500
            
        return 0

    def quiescence(self, board: chess.Board, alpha: int, beta: int) -> int:
        self.nodes += 1
        stand_pat = self.evaluate(board)
        
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat
            
        # Search only captures
        moves = sorted(
            [m for m in board.legal_moves if board.is_capture(m)],
            key=lambda m: self.get_move_score(board, m),
            reverse=True
        )
        
        for move in moves:
            board.push(move)
            score = -self.quiescence(board, -beta, -alpha)
            board.pop()
            
            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
                
        return alpha

    def search(self, board: chess.Board, depth: int, alpha: int, beta: int) -> Tuple[int, List[chess.Move]]:
        self.nodes += 1
        
        board_key = board.fen()
        if board_key in self.tt:
            tt_depth, tt_score, tt_pv = self.tt[board_key]
            if tt_depth >= depth:
                return tt_score, tt_pv

        if depth == 0:
            return self.quiescence(board, alpha, beta), []
            
        if board.is_game_over():
            return self.evaluate(board), []

        moves = sorted(
            board.legal_moves,
            key=lambda m: self.get_move_score(board, m),
            reverse=True
        )
        
        best_score = -float('inf')
        best_pv = []
        
        for move in moves:
            board.push(move)
            score, pv = self.search(board, depth - 1, -beta, -alpha)
            score = -score
            board.pop()
            
            if score >= beta:
                self.tt[board_key] = (depth, beta, [move] + pv)
                return beta, [move] + pv
            if score > alpha:
                alpha = score
                best_score = score
                best_pv = [move] + pv
        
        self.tt[board_key] = (depth, alpha, best_pv)
        return alpha, best_pv

    def get_best_move(self, board: chess.Board, max_depth: Optional[int] = None) -> Tuple[Optional[chess.Move], List[chess.Move]]:
        self.nodes = 0
        depth = 1
        best_move = None
        best_pv = []
        start_time = time.time()
        
        target_depth = max_depth or self.max_depth
        
        while depth <= target_depth:
            alpha = -float('inf')
            beta = float('inf')
            
            score, pv = self.search(board, depth, alpha, beta)
            
            if pv:
                best_move = pv[0]
                best_pv = pv
            
            elapsed = time.time() - start_time
            nps = int(self.nodes / elapsed) if elapsed > 0 else 0
            pv_str = " ".join([board.san(m) for m in best_pv[:5]])
            print(f" depth {depth} | score {score} | nodes {self.nodes} | nps {nps} | pv {pv_str}")
            
            if elapsed > self.time_limit:
                break
            depth += 1
            
        return best_move, best_pv

def main():
    while True:
        human_color, depth, time_limit = get_game_settings()
        engine = MathChessEngine(max_depth=depth, time_limit=time_limit)
        board = chess.Board()
        last_move = None
        
        while not board.is_game_over():
            display_board(board, perspective=human_color, last_move=last_move)
            
            if board.turn == human_color:
                move = get_human_move(board)
                
                if move == "undo":
                    if len(board.move_stack) >= 2:
                        board.pop() # Engine move
                        board.pop() # Player move
                        last_move = board.peek() if board.move_stack else None
                    continue
                
                if move == "resign":
                    print(f"\n {BOLD}You resigned. Engine wins!{COLOR_RESET}")
                    break
                
                if move == "draw":
                    eval_score = engine.evaluate(board)
                    # Basic draw acceptance: if eval is close to 0
                    if abs(eval_score) < 50:
                        print(f"\n {BOLD}Engine accepts the draw offer!{COLOR_RESET}")
                        break
                    else:
                        print(f"\n {BOLD}Engine refuses the draw offer.{COLOR_RESET}")
                        continue

                if move:
                    board.push(move)
                    last_move = move
            else:
                print(f"\n {BOLD} Engine is thinking...{COLOR_RESET}")
                move, pv = engine.get_best_move(board)
                if move:
                    print(f" Engine move: {BOLD}{board.san(move)}{COLOR_RESET}")
                    time.sleep(1) # Small delay for readability
                    board.push(move)
                    last_move = move
                else:
                    print(" Engine could not find a legal move!")
                    break

        display_board(board, perspective=human_color, last_move=last_move)
        
        # Save PGN
        pgn_choice = input("\n Save PGN to file? (y/n) [n]: ").strip().lower()
        if pgn_choice == 'y':
            filename = f"game_{int(time.time())}.pgn"
            game = chess.pgn.Game.from_board(board)
            with open(filename, "w") as f:
                f.write(str(game))
            print(f" Saved to {filename}")
            
        rematch = input("\n Play again? (y/n) [y]: ").strip().lower()
        if rematch == 'n':
            print("\n Thanks for playing!")
            break

if __name__ == "__main__":
    main()
