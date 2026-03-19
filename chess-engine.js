// ============================================================================
// PURE MATH CHESS ENGINE — JavaScript Port
// Full chess logic: board, moves, validation, evaluation, minimax AI
// ============================================================================

const Chess = (() => {
    // --- Constants ---
    const WHITE = 0;
    const BLACK = 1;

    const PAWN = 1;
    const KNIGHT = 2;
    const BISHOP = 3;
    const ROOK = 4;
    const QUEEN = 5;
    const KING = 6;

    const PIECE_CHARS = {
        [PAWN]:   { [WHITE]: '♙', [BLACK]: '♟' },
        [KNIGHT]: { [WHITE]: '♘', [BLACK]: '♞' },
        [BISHOP]: { [WHITE]: '♗', [BLACK]: '♝' },
        [ROOK]:   { [WHITE]: '♖', [BLACK]: '♜' },
        [QUEEN]:  { [WHITE]: '♕', [BLACK]: '♛' },
        [KING]:   { [WHITE]: '♔', [BLACK]: '♚' },
    };

    const PIECE_NAMES = { [PAWN]: 'P', [KNIGHT]: 'N', [BISHOP]: 'B', [ROOK]: 'R', [QUEEN]: 'Q', [KING]: 'K' };
    const FEN_CHARS = { 'p': PAWN, 'n': KNIGHT, 'b': BISHOP, 'r': ROOK, 'q': QUEEN, 'k': KING };

    const FILES = 'abcdefgh';
    const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    // --- Piece-Square Tables (ported from Python) ---
    const PST_PAWN = [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ];
    const PST_KNIGHT = [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ];
    const PST_BISHOP = [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ];
    const PST_ROOK = [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0
    ];
    const PST_QUEEN = [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ];
    const PST_KING_MID = [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
    ];
    const PST_KING_END = [
        -50,-40,-30,-20,-20,-30,-40,-50,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-30,  0,  0,  0,  0,-30,-30,
        -50,-30,-30,-30,-30,-30,-30,-50
    ];

    const PSTS = {
        [PAWN]: PST_PAWN,
        [KNIGHT]: PST_KNIGHT,
        [BISHOP]: PST_BISHOP,
        [ROOK]: PST_ROOK,
        [QUEEN]: PST_QUEEN,
    };

    const PIECE_VALUES = {
        [PAWN]: 100,
        [KNIGHT]: 320,
        [BISHOP]: 330,
        [ROOK]: 500,
        [QUEEN]: 900,
        [KING]: 20000
    };

    // --- Utility ---
    function squareName(r, c) {
        return FILES[c] + (r + 1);
    }
    function parseSquare(s) {
        return [parseInt(s[1]) - 1, FILES.indexOf(s[0])];
    }
    function inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // --- Board class ---
    class Board {
        constructor(fen) {
            this.squares = Array.from({ length: 8 }, () => Array(8).fill(null));
            this.turn = WHITE;
            this.castling = { K: true, Q: true, k: true, q: true };
            this.enPassant = null; // [r, c] or null
            this.halfmoveClock = 0;
            this.fullmoveNumber = 1;
            this.moveStack = [];
            this.stateStack = [];
            this.kingPos = { [WHITE]: null, [BLACK]: null };

            this.loadFen(fen || STARTING_FEN);
        }

        clone() {
            const b = new Board();
            for (let r = 0; r < 8; r++)
                for (let c = 0; c < 8; c++)
                    b.squares[r][c] = this.squares[r][c] ? { ...this.squares[r][c] } : null;
            b.turn = this.turn;
            b.castling = { ...this.castling };
            b.enPassant = this.enPassant ? [...this.enPassant] : null;
            b.halfmoveClock = this.halfmoveClock;
            b.fullmoveNumber = this.fullmoveNumber;
            b.kingPos = { ...this.kingPos };
            b.moveStack = [...this.moveStack];
            b.stateStack = [...this.stateStack];
            return b;
        }

        loadFen(fen) {
            const parts = fen.split(' ');
            const rows = parts[0].split('/');
            for (let r = 7; r >= 0; r--) {
                let c = 0;
                for (const ch of rows[7 - r]) {
                    if (ch >= '1' && ch <= '8') {
                        for (let i = 0; i < parseInt(ch); i++) this.squares[r][c++] = null;
                    } else {
                        const color = ch === ch.toUpperCase() ? WHITE : BLACK;
                        const type = FEN_CHARS[ch.toLowerCase()];
                        this.squares[r][c] = { type, color };
                        if (type === KING) this.kingPos[color] = [r, c];
                        c++;
                    }
                }
            }
            this.turn = parts[1] === 'w' ? WHITE : BLACK;
            this.castling = { K: false, Q: false, k: false, q: false };
            if (parts[2] !== '-') {
                for (const ch of parts[2]) this.castling[ch] = true;
            }
            this.enPassant = parts[3] !== '-' ? parseSquare(parts[3]) : null;
            this.halfmoveClock = parseInt(parts[4]) || 0;
            this.fullmoveNumber = parseInt(parts[5]) || 1;
        }

        toFen() {
            let fen = '';
            for (let r = 7; r >= 0; r--) {
                let empty = 0;
                for (let c = 0; c < 8; c++) {
                    const p = this.squares[r][c];
                    if (!p) { empty++; continue; }
                    if (empty) { fen += empty; empty = 0; }
                    let ch = Object.entries(FEN_CHARS).find(([_, v]) => v === p.type)[0];
                    fen += p.color === WHITE ? ch.toUpperCase() : ch;
                }
                if (empty) fen += empty;
                if (r > 0) fen += '/';
            }
            fen += ' ' + (this.turn === WHITE ? 'w' : 'b');
            let castStr = '';
            if (this.castling.K) castStr += 'K';
            if (this.castling.Q) castStr += 'Q';
            if (this.castling.k) castStr += 'k';
            if (this.castling.q) castStr += 'q';
            fen += ' ' + (castStr || '-');
            fen += ' ' + (this.enPassant ? squareName(this.enPassant[0], this.enPassant[1]) : '-');
            fen += ' ' + this.halfmoveClock;
            fen += ' ' + this.fullmoveNumber;
            return fen;
        }

        pieceAt(r, c) {
            return this.squares[r][c];
        }

        // --- Move generation ---
        isSquareAttacked(r, c, byColor) {
            // Pawn attacks
            const pawnDir = byColor === WHITE ? 1 : -1;
            const pr = r - pawnDir;
            if (inBounds(pr, c - 1)) {
                const p = this.squares[pr][c - 1];
                if (p && p.type === PAWN && p.color === byColor) return true;
            }
            if (inBounds(pr, c + 1)) {
                const p = this.squares[pr][c + 1];
                if (p && p.type === PAWN && p.color === byColor) return true;
            }

            // Knight attacks
            const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for (const [dr, dc] of knightMoves) {
                const nr = r + dr, nc = c + dc;
                if (inBounds(nr, nc)) {
                    const p = this.squares[nr][nc];
                    if (p && p.type === KNIGHT && p.color === byColor) return true;
                }
            }

            // King attacks
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc)) {
                        const p = this.squares[nr][nc];
                        if (p && p.type === KING && p.color === byColor) return true;
                    }
                }
            }

            // Sliding: rook/queen (straight) and bishop/queen (diagonal)
            const straight = [[1,0],[-1,0],[0,1],[0,-1]];
            for (const [dr, dc] of straight) {
                let nr = r + dr, nc = c + dc;
                while (inBounds(nr, nc)) {
                    const p = this.squares[nr][nc];
                    if (p) {
                        if (p.color === byColor && (p.type === ROOK || p.type === QUEEN)) return true;
                        break;
                    }
                    nr += dr; nc += dc;
                }
            }
            const diagonal = [[1,1],[1,-1],[-1,1],[-1,-1]];
            for (const [dr, dc] of diagonal) {
                let nr = r + dr, nc = c + dc;
                while (inBounds(nr, nc)) {
                    const p = this.squares[nr][nc];
                    if (p) {
                        if (p.color === byColor && (p.type === BISHOP || p.type === QUEEN)) return true;
                        break;
                    }
                    nr += dr; nc += dc;
                }
            }
            return false;
        }

        isInCheck(color) {
            const kp = this.kingPos[color];
            if (!kp) return false;
            return this.isSquareAttacked(kp[0], kp[1], 1 - color);
        }

        _generatePseudoLegalMoves() {
            const moves = [];
            const color = this.turn;
            const opp = 1 - color;

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = this.squares[r][c];
                    if (!p || p.color !== color) continue;

                    if (p.type === PAWN) {
                        const dir = color === WHITE ? 1 : -1;
                        const startRank = color === WHITE ? 1 : 6;
                        const promoRank = color === WHITE ? 7 : 0;

                        // Forward
                        const nr = r + dir;
                        if (inBounds(nr, c) && !this.squares[nr][c]) {
                            if (nr === promoRank) {
                                [QUEEN, ROOK, BISHOP, KNIGHT].forEach(pr => moves.push({ from: [r, c], to: [nr, c], promotion: pr }));
                            } else {
                                moves.push({ from: [r, c], to: [nr, c] });
                                // Double push
                                if (r === startRank && !this.squares[r + 2 * dir][c]) {
                                    moves.push({ from: [r, c], to: [r + 2 * dir, c] });
                                }
                            }
                        }
                        // Captures
                        for (const dc of [-1, 1]) {
                            const nc = c + dc;
                            if (!inBounds(nr, nc)) continue;
                            const target = this.squares[nr][nc];
                            const isEp = this.enPassant && this.enPassant[0] === nr && this.enPassant[1] === nc;
                            if ((target && target.color === opp) || isEp) {
                                if (nr === promoRank) {
                                    [QUEEN, ROOK, BISHOP, KNIGHT].forEach(pr => moves.push({ from: [r, c], to: [nr, nc], promotion: pr, capture: true, enPassant: isEp }));
                                } else {
                                    moves.push({ from: [r, c], to: [nr, nc], capture: true, enPassant: isEp });
                                }
                            }
                        }
                    } else if (p.type === KNIGHT) {
                        const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                        for (const [dr, dc] of knightMoves) {
                            const nr = r + dr, nc = c + dc;
                            if (!inBounds(nr, nc)) continue;
                            const target = this.squares[nr][nc];
                            if (!target || target.color === opp) {
                                moves.push({ from: [r, c], to: [nr, nc], capture: !!target });
                            }
                        }
                    } else if (p.type === KING) {
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;
                                const nr = r + dr, nc = c + dc;
                                if (!inBounds(nr, nc)) continue;
                                const target = this.squares[nr][nc];
                                if (!target || target.color === opp) {
                                    moves.push({ from: [r, c], to: [nr, nc], capture: !!target });
                                }
                            }
                        }
                        // Castling
                        if (!this.isInCheck(color)) {
                            const rank = color === WHITE ? 0 : 7;
                            const kSide = color === WHITE ? 'K' : 'k';
                            const qSide = color === WHITE ? 'Q' : 'q';
                            if (this.castling[kSide] && r === rank && c === 4) {
                                if (!this.squares[rank][5] && !this.squares[rank][6] &&
                                    this.squares[rank][7] && this.squares[rank][7].type === ROOK && this.squares[rank][7].color === color &&
                                    !this.isSquareAttacked(rank, 5, opp) && !this.isSquareAttacked(rank, 6, opp)) {
                                    moves.push({ from: [r, c], to: [rank, 6], castling: 'K' });
                                }
                            }
                            if (this.castling[qSide] && r === rank && c === 4) {
                                if (!this.squares[rank][3] && !this.squares[rank][2] && !this.squares[rank][1] &&
                                    this.squares[rank][0] && this.squares[rank][0].type === ROOK && this.squares[rank][0].color === color &&
                                    !this.isSquareAttacked(rank, 3, opp) && !this.isSquareAttacked(rank, 2, opp)) {
                                    moves.push({ from: [r, c], to: [rank, 2], castling: 'Q' });
                                }
                            }
                        }
                    } else {
                        // Sliding pieces
                        let dirs = [];
                        if (p.type === BISHOP || p.type === QUEEN) dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
                        if (p.type === ROOK || p.type === QUEEN) dirs.push([1,0],[-1,0],[0,1],[0,-1]);
                        for (const [dr, dc] of dirs) {
                            let nr = r + dr, nc = c + dc;
                            while (inBounds(nr, nc)) {
                                const target = this.squares[nr][nc];
                                if (target) {
                                    if (target.color === opp) moves.push({ from: [r, c], to: [nr, nc], capture: true });
                                    break;
                                }
                                moves.push({ from: [r, c], to: [nr, nc] });
                                nr += dr; nc += dc;
                            }
                        }
                    }
                }
            }
            return moves;
        }

        legalMoves() {
            const pseudo = this._generatePseudoLegalMoves();
            const legal = [];
            for (const move of pseudo) {
                this.makeMove(move);
                if (!this.isInCheck(1 - this.turn)) {
                    legal.push(move);
                }
                this.unmakeMove();
            }
            return legal;
        }

        makeMove(move) {
            // Save state for unmake
            const state = {
                castling: { ...this.castling },
                enPassant: this.enPassant ? [...this.enPassant] : null,
                halfmoveClock: this.halfmoveClock,
                fullmoveNumber: this.fullmoveNumber,
                captured: null,
                kingPos: { ...this.kingPos },
            };

            const [fr, fc] = move.from;
            const [tr, tc] = move.to;
            const piece = this.squares[fr][fc];
            const target = this.squares[tr][tc];
            state.captured = target;

            // Handle en passant capture
            if (move.enPassant && piece.type === PAWN) {
                const epR = piece.color === WHITE ? tr - 1 : tr + 1;
                state.epCaptured = this.squares[epR][tc];
                state.epSquare = [epR, tc];
                this.squares[epR][tc] = null;
            }

            // Move piece
            this.squares[tr][tc] = piece;
            this.squares[fr][fc] = null;

            // Promotion
            if (move.promotion) {
                this.squares[tr][tc] = { type: move.promotion, color: piece.color };
            }

            // Castling - move rook
            if (move.castling) {
                const rank = fr;
                if (move.castling === 'K') {
                    this.squares[rank][5] = this.squares[rank][7];
                    this.squares[rank][7] = null;
                } else {
                    this.squares[rank][3] = this.squares[rank][0];
                    this.squares[rank][0] = null;
                }
            }

            // Update king position
            if (piece.type === KING) {
                this.kingPos[piece.color] = [tr, tc];
            }

            // Update castling rights
            if (piece.type === KING) {
                if (piece.color === WHITE) { this.castling.K = false; this.castling.Q = false; }
                else { this.castling.k = false; this.castling.q = false; }
            }
            if (piece.type === ROOK) {
                if (fr === 0 && fc === 0) this.castling.Q = false;
                if (fr === 0 && fc === 7) this.castling.K = false;
                if (fr === 7 && fc === 0) this.castling.q = false;
                if (fr === 7 && fc === 7) this.castling.k = false;
            }
            // If rook captured
            if (target && target.type === ROOK) {
                if (tr === 0 && tc === 0) this.castling.Q = false;
                if (tr === 0 && tc === 7) this.castling.K = false;
                if (tr === 7 && tc === 0) this.castling.q = false;
                if (tr === 7 && tc === 7) this.castling.k = false;
            }

            // En passant square
            if (piece.type === PAWN && Math.abs(tr - fr) === 2) {
                this.enPassant = [(fr + tr) / 2, fc];
            } else {
                this.enPassant = null;
            }

            // Halfmove clock
            if (piece.type === PAWN || target) {
                this.halfmoveClock = 0;
            } else {
                this.halfmoveClock++;
            }

            if (this.turn === BLACK) this.fullmoveNumber++;
            this.turn = 1 - this.turn;
            this.stateStack.push(state);
            this.moveStack.push(move);
        }

        unmakeMove() {
            const move = this.moveStack.pop();
            const state = this.stateStack.pop();
            if (!move || !state) return;

            const [fr, fc] = move.from;
            const [tr, tc] = move.to;

            this.turn = 1 - this.turn;

            let piece = this.squares[tr][tc];
            if (move.promotion) {
                piece = { type: PAWN, color: this.turn };
            }

            this.squares[fr][fc] = piece;
            this.squares[tr][tc] = state.captured;

            // Undo en passant
            if (state.epSquare) {
                this.squares[state.epSquare[0]][state.epSquare[1]] = state.epCaptured;
                this.squares[tr][tc] = null;
            }

            // Undo castling
            if (move.castling) {
                const rank = fr;
                if (move.castling === 'K') {
                    this.squares[rank][7] = this.squares[rank][5];
                    this.squares[rank][5] = null;
                } else {
                    this.squares[rank][0] = this.squares[rank][3];
                    this.squares[rank][3] = null;
                }
            }

            this.castling = state.castling;
            this.enPassant = state.enPassant;
            this.halfmoveClock = state.halfmoveClock;
            this.fullmoveNumber = state.fullmoveNumber;
            this.kingPos = state.kingPos;
        }

        // --- SAN (Standard Algebraic Notation) ---
        moveToSan(move) {
            const [fr, fc] = move.from;
            const [tr, tc] = move.to;
            const piece = this.squares[fr][fc];
            if (!piece) return '??';

            // Castling
            if (move.castling === 'K') return 'O-O';
            if (move.castling === 'Q') return 'O-O-O';

            let san = '';
            if (piece.type !== PAWN) {
                san += PIECE_NAMES[piece.type];
                // Disambiguation
                const legal = this.legalMoves().filter(m => {
                    const p = this.squares[m.from[0]][m.from[1]];
                    return p && p.type === piece.type && m.to[0] === tr && m.to[1] === tc &&
                        (m.from[0] !== fr || m.from[1] !== fc);
                });
                if (legal.length > 0) {
                    const sameFile = legal.some(m => m.from[1] === fc);
                    const sameRank = legal.some(m => m.from[0] === fr);
                    if (!sameFile) san += FILES[fc];
                    else if (!sameRank) san += (fr + 1);
                    else san += FILES[fc] + (fr + 1);
                }
            }

            if (move.capture || move.enPassant) {
                if (piece.type === PAWN) san += FILES[fc];
                san += 'x';
            }

            san += squareName(tr, tc);

            if (move.promotion) san += '=' + PIECE_NAMES[move.promotion];

            // Check/checkmate
            this.makeMove(move);
            if (this.isInCheck(this.turn)) {
                const hasLegal = this.legalMoves().length > 0;
                san += hasLegal ? '+' : '#';
            }
            this.unmakeMove();

            return san;
        }

        // --- Game state ---
        isCheckmate() {
            return this.isInCheck(this.turn) && this.legalMoves().length === 0;
        }
        isStalemate() {
            return !this.isInCheck(this.turn) && this.legalMoves().length === 0;
        }
        isDraw() {
            if (this.halfmoveClock >= 100) return true; // 50-move rule
            if (this.isStalemate()) return true;
            if (this.isInsufficientMaterial()) return true;
            return false;
        }
        isInsufficientMaterial() {
            const pieces = { [WHITE]: [], [BLACK]: [] };
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = this.squares[r][c];
                    if (p && p.type !== KING) pieces[p.color].push(p.type);
                }
            }
            const w = pieces[WHITE], b = pieces[BLACK];
            if (w.length === 0 && b.length === 0) return true; // K vs K
            if (w.length === 0 && b.length === 1 && (b[0] === KNIGHT || b[0] === BISHOP)) return true;
            if (b.length === 0 && w.length === 1 && (w[0] === KNIGHT || w[0] === BISHOP)) return true;
            return false;
        }
        isGameOver() {
            return this.isCheckmate() || this.isDraw();
        }
        result() {
            if (this.isCheckmate()) return this.turn === WHITE ? '0-1' : '1-0';
            if (this.isDraw()) return '½-½';
            return '*';
        }

        getCapturedPieces() {
            const start = { [PAWN]: 8, [KNIGHT]: 2, [BISHOP]: 2, [ROOK]: 2, [QUEEN]: 1 };
            const current = { [WHITE]: { ...start }, [BLACK]: { ...start } };

            // Reset to zero
            for (const color of [WHITE, BLACK])
                for (const pt of [PAWN, KNIGHT, BISHOP, ROOK, QUEEN])
                    current[color][pt] = 0;

            for (let r = 0; r < 8; r++)
                for (let c = 0; c < 8; c++) {
                    const p = this.squares[r][c];
                    if (p && p.type !== KING) current[p.color][p.type]++;
                }

            const whiteCaptured = []; // pieces white captured (black pieces gone)
            const blackCaptured = []; // pieces black captured (white pieces gone)
            for (const pt of [QUEEN, ROOK, BISHOP, KNIGHT, PAWN]) {
                for (let i = 0; i < start[pt] - current[BLACK][pt]; i++)
                    whiteCaptured.push(PIECE_CHARS[pt][BLACK]);
                for (let i = 0; i < start[pt] - current[WHITE][pt]; i++)
                    blackCaptured.push(PIECE_CHARS[pt][WHITE]);
            }
            return { whiteCaptured, blackCaptured };
        }
    }

    // --- Engine (AI) ---
    class Engine {
        constructor(maxDepth = 4, timeLimit = 5.0) {
            this.maxDepth = maxDepth;
            this.timeLimit = timeLimit;
            this.nodes = 0;
            this.tt = {};
            this.startTime = 0;
            this.searchInfo = null;
        }

        evaluate(board) {
            if (board.isCheckmate()) {
                return board.turn === WHITE ? -2000000 : 2000000;
            }
            if (board.isStalemate() || board.isInsufficientMaterial()) return 0;

            let score = 0;
            let whiteMaterial = 0, blackMaterial = 0;

            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = board.squares[r][c];
                    if (!p) continue;

                    const val = PIECE_VALUES[p.type];
                    const sign = p.color === WHITE ? 1 : -1;
                    score += sign * val;

                    if (p.type !== PAWN && p.type !== KING) {
                        if (p.color === WHITE) whiteMaterial += val;
                        else blackMaterial += val;
                    }

                    // PST index: for white, rank 7 is top (index 0); for black, rank 0 is top (index 0)
                    let pstIdx;
                    if (p.color === WHITE) {
                        pstIdx = (7 - r) * 8 + c;
                    } else {
                        pstIdx = r * 8 + c;
                    }

                    if (p.type === KING) {
                        const phase = Math.min(1.0, (whiteMaterial + blackMaterial) / 5000);
                        const mid = PST_KING_MID[pstIdx];
                        const end = PST_KING_END[pstIdx];
                        score += sign * Math.round(mid * phase + end * (1 - phase));
                    } else {
                        score += sign * PSTS[p.type][pstIdx];
                    }
                }
            }
            return score;
        }

        getMoveScore(board, move) {
            const [fr, fc] = move.from;
            const [tr, tc] = move.to;
            if (move.capture || move.enPassant) {
                const victim = board.squares[tr][tc];
                const attacker = board.squares[fr][fc];
                if (victim && attacker) {
                    return 10 * PIECE_VALUES[victim.type] - PIECE_VALUES[attacker.type];
                }
                return 1000;
            }
            if (move.promotion) return 900;
            // Check: expensive to compute, skip in move ordering for speed
            return 0;
        }

        quiescence(board, alpha, beta) {
            this.nodes++;
            const standPat = this.evaluate(board);
            if (standPat >= beta) return beta;
            if (alpha < standPat) alpha = standPat;

            const moves = board.legalMoves()
                .filter(m => m.capture || m.enPassant)
                .sort((a, b) => this.getMoveScore(board, b) - this.getMoveScore(board, a));

            for (const move of moves) {
                board.makeMove(move);
                const score = -this.quiescence(board, -beta, -alpha);
                board.unmakeMove();
                if (score >= beta) return beta;
                if (score > alpha) alpha = score;
            }
            return alpha;
        }

        search(board, depth, alpha, beta) {
            this.nodes++;

            const key = board.toFen();
            if (this.tt[key]) {
                const [ttDepth, ttScore, ttBestMove] = this.tt[key];
                if (ttDepth >= depth) return { score: ttScore, bestMove: ttBestMove };
            }

            if (depth === 0) return { score: this.quiescence(board, alpha, beta), bestMove: null };
            if (board.isGameOver()) return { score: this.evaluate(board), bestMove: null };

            const moves = board.legalMoves().sort((a, b) => this.getMoveScore(board, b) - this.getMoveScore(board, a));

            let bestScore = -Infinity;
            let bestMove = moves[0] || null;

            for (const move of moves) {
                board.makeMove(move);
                const result = this.search(board, depth - 1, -beta, -alpha);
                const score = -result.score;
                board.unmakeMove();

                if (score >= beta) {
                    this.tt[key] = [depth, beta, move];
                    return { score: beta, bestMove: move };
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
                if (score > alpha) {
                    alpha = score;
                }
            }

            this.tt[key] = [depth, alpha, bestMove];
            return { score: alpha, bestMove };
        }

        getBestMove(board, maxDepth) {
            this.nodes = 0;
            this.tt = {};
            this.startTime = performance.now();
            const targetDepth = maxDepth || this.maxDepth;
            let bestMove = null;
            let bestScore = 0;
            this.searchInfo = [];

            for (let depth = 1; depth <= targetDepth; depth++) {
                const result = this.search(board, depth, -Infinity, Infinity);
                if (result.bestMove) {
                    bestMove = result.bestMove;
                    bestScore = result.score;
                }
                const elapsed = (performance.now() - this.startTime) / 1000;
                const nps = elapsed > 0 ? Math.round(this.nodes / elapsed) : 0;
                this.searchInfo.push({
                    depth,
                    score: bestScore,
                    nodes: this.nodes,
                    nps,
                    time: elapsed.toFixed(2)
                });

                if (elapsed > this.timeLimit) break;
            }

            return bestMove;
        }
    }

    // Public API
    return {
        WHITE, BLACK,
        PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING,
        PIECE_CHARS, PIECE_NAMES, FILES,
        Board, Engine,
        squareName, parseSquare
    };
})();
