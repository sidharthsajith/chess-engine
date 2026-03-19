// ============================================================================
// APP.JS — UI Controller for chess-mathengine
// ============================================================================

(function () {
    'use strict';

    // --- State ---
    let board = new Chess.Board();
    let engine = new Chess.Engine(4, 5.0);
    let humanColor = Chess.WHITE;
    let perspective = Chess.WHITE;
    let selectedSquare = null;
    let legalMovesForSelected = [];
    let lastMove = null;
    let gameActive = true;
    let engineThinking = false;
    let moveHistory = [];
    let dragState = null;
    let pendingPromotion = null;
    let moveTimer = { white: 0, black: 0, interval: null, lastTick: null };

    // Settings
    let selectedColor = 'white';
    let selectedDepth = 4;

    // --- DOM ---
    const boardEl = document.getElementById('chess-board');
    const statusBar = document.getElementById('status-bar');
    const moveHistoryEl = document.getElementById('move-history');
    const moveCountEl = document.getElementById('move-count');
    const thinkingEl = document.getElementById('thinking-indicator');

    const newGameModal = document.getElementById('modal-new-game');
    const promotionModal = document.getElementById('modal-promotion');
    const gameOverModal = document.getElementById('modal-game-over');

    // Buttons
    document.getElementById('btn-new-game').addEventListener('click', showNewGameModal);
    document.getElementById('btn-undo').addEventListener('click', undoMove);
    document.getElementById('btn-flip').addEventListener('click', flipBoard);
    document.getElementById('btn-resign').addEventListener('click', resign);
    document.getElementById('btn-cancel-new-game').addEventListener('click', () => newGameModal.classList.remove('active'));
    document.getElementById('btn-start-game').addEventListener('click', startNewGame);
    document.getElementById('btn-play-again').addEventListener('click', () => {
        gameOverModal.classList.remove('active');
        showNewGameModal();
    });
    document.getElementById('btn-close-game-over').addEventListener('click', () => gameOverModal.classList.remove('active'));

    // Option buttons
    document.querySelectorAll('[data-color]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-color]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedColor = btn.dataset.color;
        });
    });
    document.querySelectorAll('[data-depth]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-depth]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDepth = parseInt(btn.dataset.depth);
        });
    });

    // --- Timer ---
    function startTimer() {
        stopTimer();
        moveTimer.lastTick = Date.now();
        moveTimer.interval = setInterval(() => {
            const now = Date.now();
            const delta = (now - moveTimer.lastTick) / 1000;
            moveTimer.lastTick = now;
            if (board.turn === Chess.WHITE) {
                moveTimer.white += delta;
            } else {
                moveTimer.black += delta;
            }
            updateTimerDisplay();
        }, 100);
    }

    function stopTimer() {
        if (moveTimer.interval) {
            clearInterval(moveTimer.interval);
            moveTimer.interval = null;
        }
    }

    function resetTimer() {
        stopTimer();
        moveTimer.white = 0;
        moveTimer.black = 0;
        updateTimerDisplay();
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        // Top player is opponent, bottom player is human
        const topColor = humanColor === Chess.WHITE ? Chess.BLACK : Chess.WHITE;
        const bottomColor = humanColor;
        const topTime = topColor === Chess.WHITE ? moveTimer.white : moveTimer.black;
        const bottomTime = bottomColor === Chess.WHITE ? moveTimer.white : moveTimer.black;

        document.getElementById('top-timer').textContent = formatTime(topTime);
        document.getElementById('bottom-timer').textContent = formatTime(bottomTime);
    }

    // --- Board Rendering ---
    function renderBoard() {
        boardEl.innerHTML = '';

        const ranks = perspective === Chess.WHITE ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
        const files = perspective === Chess.WHITE ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];

        const isCheck = board.isInCheck(board.turn);
        const checkKingPos = isCheck ? board.kingPos[board.turn] : null;

        for (const r of ranks) {
            for (const c of files) {
                const sq = document.createElement('div');
                const isLight = (r + c) % 2 !== 0;
                sq.className = 'square ' + (isLight ? 'light' : 'dark');
                sq.dataset.r = r;
                sq.dataset.c = c;

                if (lastMove) {
                    if ((lastMove.from[0] === r && lastMove.from[1] === c) ||
                        (lastMove.to[0] === r && lastMove.to[1] === c)) {
                        sq.classList.add('last-move');
                    }
                }

                if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
                    sq.classList.add('selected');
                }

                if (checkKingPos && checkKingPos[0] === r && checkKingPos[1] === c) {
                    sq.classList.add('check');
                }

                const legalMove = legalMovesForSelected.find(m => m.to[0] === r && m.to[1] === c);
                if (legalMove) {
                    const piece = board.pieceAt(r, c);
                    if (piece || legalMove.enPassant) {
                        const ring = document.createElement('div');
                        ring.className = 'legal-capture-ring';
                        sq.appendChild(ring);
                    } else {
                        const dot = document.createElement('div');
                        dot.className = 'legal-dot';
                        sq.appendChild(dot);
                    }
                }

                const piece = board.pieceAt(r, c);
                if (piece) {
                    const pieceEl = document.createElement('span');
                    pieceEl.className = 'piece ' + (piece.color === Chess.WHITE ? 'white-piece' : 'black-piece');
                    pieceEl.textContent = Chess.PIECE_CHARS[piece.type][piece.color];
                    pieceEl.draggable = true;
                    pieceEl.addEventListener('dragstart', (e) => onDragStart(e, r, c));
                    pieceEl.addEventListener('dragend', onDragEnd);
                    sq.appendChild(pieceEl);
                }

                sq.addEventListener('click', () => onSquareClick(r, c));
                sq.addEventListener('dragover', (e) => e.preventDefault());
                sq.addEventListener('drop', (e) => onDrop(e, r, c));

                boardEl.appendChild(sq);
            }
        }

        updateLabels();
        updateCapturedPieces();
        updateStatus();
        updatePlayerCards();
    }

    function updateLabels() {
        const fileChars = perspective === Chess.WHITE
            ? ['a','b','c','d','e','f','g','h']
            : ['h','g','f','e','d','c','b','a'];
        const rankNums = perspective === Chess.WHITE
            ? ['8','7','6','5','4','3','2','1']
            : ['1','2','3','4','5','6','7','8'];

        ['file-labels-top','file-labels-bottom'].forEach(id => {
            document.getElementById(id).innerHTML = fileChars.map(f => `<span>${f}</span>`).join('');
        });
        ['rank-labels-left','rank-labels-right'].forEach(id => {
            document.getElementById(id).innerHTML = rankNums.map(r => `<span>${r}</span>`).join('');
        });
    }

    function updateCapturedPieces() {
        const cap = board.getCapturedPieces();
        // Top is opponent, bottom is human
        if (humanColor === Chess.WHITE) {
            document.getElementById('top-captured').textContent = cap.blackCaptured.join(' ');
            document.getElementById('bottom-captured').textContent = cap.whiteCaptured.join(' ');
        } else {
            document.getElementById('top-captured').textContent = cap.whiteCaptured.join(' ');
            document.getElementById('bottom-captured').textContent = cap.blackCaptured.join(' ');
        }
    }

    function updateStatus() {
        if (!gameActive) return;

        if (board.isCheckmate()) {
            const winner = board.turn === Chess.WHITE ? 'Black' : 'White';
            statusBar.innerHTML = `<span class="check-alert">Checkmate! ${winner} wins!</span>`;
        } else if (board.isStalemate()) {
            statusBar.textContent = 'Stalemate — Draw';
        } else if (board.isDraw()) {
            statusBar.textContent = 'Draw';
        } else if (board.isInCheck(board.turn)) {
            const turn = board.turn === Chess.WHITE ? 'White' : 'Black';
            statusBar.innerHTML = `${turn} to move — <span class="check-alert">Check!</span>`;
        } else {
            const turn = board.turn === Chess.WHITE ? 'White' : 'Black';
            statusBar.textContent = `${turn} to move`;
        }
    }

    function updatePlayerCards() {
        const topColor = humanColor === Chess.WHITE ? Chess.BLACK : Chess.WHITE;
        const topCard = document.getElementById('player-top');
        const bottomCard = document.getElementById('player-bottom');
        topCard.classList.toggle('active', board.turn === topColor && gameActive);
        bottomCard.classList.toggle('active', board.turn === humanColor && gameActive);
    }

    function updateEvalBar(score) {
        // Convert centipawn score to percentage (sigmoid-like)
        const s = score / 100;
        const pct = Math.max(5, Math.min(95, 50 + s * 8));
        document.getElementById('eval-bar-fill').style.width = pct + '%';
        const sign = s >= 0 ? '+' : '';
        document.getElementById('eval-bar-label').textContent = sign + s.toFixed(2);
    }

    function updateMoveHistory(san) {
        const totalMoves = board.moveStack.length;
        const moveNum = Math.ceil(totalMoves / 2);

        if (board.turn === Chess.BLACK) {
            moveHistory.push({ num: moveNum, white: san, black: '' });
        } else {
            if (moveHistory.length > 0) {
                moveHistory[moveHistory.length - 1].black = san;
            }
        }
        renderMoveHistory();
    }

    function renderMoveHistory() {
        if (moveHistory.length === 0) {
            moveHistoryEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 24px 0;">No moves yet</div>';
            moveCountEl.textContent = '0 moves';
            return;
        }

        let html = '';
        for (const entry of moveHistory) {
            html += `<div class="move-row">
                <span class="move-number">${entry.num}.</span>
                <span class="move-san${entry.black === '' && board.turn === Chess.BLACK ? ' latest' : ''}">${entry.white}</span>
                <span class="move-san${entry.black !== '' && board.turn === Chess.WHITE ? ' latest' : ''}">${entry.black}</span>
            </div>`;
        }
        moveHistoryEl.innerHTML = html;
        moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;

        const total = moveHistory.reduce((acc, e) => acc + (e.white ? 1 : 0) + (e.black ? 1 : 0), 0);
        moveCountEl.textContent = `${total} move${total !== 1 ? 's' : ''}`;
    }

    function updateEngineInfo(score) {
        if (!engine.searchInfo || engine.searchInfo.length === 0) return;
        const last = engine.searchInfo[engine.searchInfo.length - 1];

        document.getElementById('info-depth').textContent = last.depth;
        const evalVal = (last.score / 100).toFixed(2);
        document.getElementById('info-eval').textContent = (last.score >= 0 ? '+' : '') + evalVal;
        document.getElementById('info-nodes').textContent = last.nodes.toLocaleString();
        document.getElementById('info-nps').textContent = last.nps.toLocaleString() + '/s';
        document.getElementById('info-time').textContent = last.time + 's';

        updateEvalBar(last.score);
    }

    // --- Interaction ---
    function onSquareClick(r, c) {
        if (!gameActive || engineThinking) return;
        if (board.turn !== humanColor) return;

        const piece = board.pieceAt(r, c);

        if (selectedSquare) {
            const legalMove = legalMovesForSelected.find(m => m.to[0] === r && m.to[1] === c);
            if (legalMove) {
                const promoMoves = legalMovesForSelected.filter(m => m.to[0] === r && m.to[1] === c && m.promotion);
                if (promoMoves.length > 0) {
                    showPromotionModal(promoMoves);
                    return;
                }
                makeHumanMove(legalMove);
                return;
            }
            if (piece && piece.color === humanColor) {
                selectSquare(r, c);
                return;
            }
            deselectSquare();
            return;
        }

        if (piece && piece.color === humanColor) {
            selectSquare(r, c);
        }
    }

    function selectSquare(r, c) {
        selectedSquare = [r, c];
        legalMovesForSelected = board.legalMoves().filter(m => m.from[0] === r && m.from[1] === c);
        renderBoard();
    }

    function deselectSquare() {
        selectedSquare = null;
        legalMovesForSelected = [];
        renderBoard();
    }

    function onDragStart(e, r, c) {
        if (!gameActive || engineThinking) { e.preventDefault(); return; }
        const piece = board.pieceAt(r, c);
        if (!piece || piece.color !== humanColor || board.turn !== humanColor) { e.preventDefault(); return; }

        selectSquare(r, c);

        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.effectAllowed = 'move';

        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.textContent = Chess.PIECE_CHARS[piece.type][piece.color];
        ghost.id = 'drag-ghost';
        document.body.appendChild(ghost);

        dragState = { r, c, ghost };
        updateGhostPosition(e);
        document.addEventListener('dragover', updateGhostPosition);
    }

    function updateGhostPosition(e) {
        const ghost = document.getElementById('drag-ghost');
        if (ghost) {
            ghost.style.left = e.clientX + 'px';
            ghost.style.top = e.clientY + 'px';
        }
    }

    function onDragEnd() {
        const ghost = document.getElementById('drag-ghost');
        if (ghost) ghost.remove();
        document.removeEventListener('dragover', updateGhostPosition);
        dragState = null;
    }

    function onDrop(e, r, c) {
        e.preventDefault();
        onDragEnd();

        if (!gameActive || engineThinking || !selectedSquare) return;

        const legalMove = legalMovesForSelected.find(m => m.to[0] === r && m.to[1] === c);
        if (legalMove) {
            const promoMoves = legalMovesForSelected.filter(m => m.to[0] === r && m.to[1] === c && m.promotion);
            if (promoMoves.length > 0) {
                showPromotionModal(promoMoves);
                return;
            }
            makeHumanMove(legalMove);
        } else {
            deselectSquare();
        }
    }

    // --- Move execution ---
    function makeHumanMove(move) {
        const san = board.moveToSan(move);
        board.makeMove(move);
        lastMove = { from: move.from, to: move.to };
        updateMoveHistory(san);
        deselectSquare();

        if (board.isGameOver()) {
            gameActive = false;
            stopTimer();
            renderBoard();
            showGameOverModal();
            return;
        }

        // Engine's turn
        if (board.turn !== humanColor) {
            engineThinking = true;
            thinkingEl.classList.add('active');
            renderBoard();

            setTimeout(() => {
                const engineMove = engine.getBestMove(board);
                if (engineMove) {
                    const san = board.moveToSan(engineMove);
                    board.makeMove(engineMove);
                    lastMove = { from: engineMove.from, to: engineMove.to };
                    updateMoveHistory(san);
                    updateEngineInfo();
                }

                engineThinking = false;
                thinkingEl.classList.remove('active');
                renderBoard();

                if (board.isGameOver()) {
                    gameActive = false;
                    stopTimer();
                    renderBoard();
                    showGameOverModal();
                }
            }, 50);
        }
    }

    // --- Promotion ---
    function showPromotionModal(promoMoves) {
        pendingPromotion = promoMoves;
        const grid = document.getElementById('promotion-grid');
        const color = humanColor;
        grid.innerHTML = '';

        [Chess.QUEEN, Chess.ROOK, Chess.BISHOP, Chess.KNIGHT].forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'promotion-btn';
            btn.textContent = Chess.PIECE_CHARS[type][color];
            btn.addEventListener('click', () => {
                const move = pendingPromotion.find(m => m.promotion === type);
                if (move) {
                    promotionModal.classList.remove('active');
                    makeHumanMove(move);
                }
            });
            grid.appendChild(btn);
        });

        promotionModal.classList.add('active');
    }

    // --- Modals ---
    function showNewGameModal() {
        newGameModal.classList.add('active');
    }

    function startNewGame() {
        newGameModal.classList.remove('active');

        if (selectedColor === 'white') humanColor = Chess.WHITE;
        else if (selectedColor === 'black') humanColor = Chess.BLACK;
        else humanColor = Math.random() < 0.5 ? Chess.WHITE : Chess.BLACK;

        perspective = humanColor;

        // Update player cards
        const topName = document.getElementById('top-name');
        const topSub = document.getElementById('top-subtitle');
        const topIcon = document.getElementById('top-icon');
        const bottomName = document.getElementById('bottom-name');
        const bottomSub = document.getElementById('bottom-subtitle');
        const bottomIcon = document.getElementById('bottom-icon');

        topName.textContent = 'Engine';
        topSub.textContent = 'AI · Depth ' + selectedDepth;
        topSub.className = 'player-subtitle';
        topIcon.className = 'player-icon engine';
        topIcon.innerHTML = '<span class="material-symbols-outlined">smart_toy</span>';

        bottomName.textContent = 'You';
        bottomSub.textContent = 'Human';
        bottomSub.className = 'player-subtitle highlight';
        bottomIcon.className = 'player-icon human';
        bottomIcon.textContent = humanColor === Chess.WHITE ? '♔' : '♚';

        const timeLimits = { 2: 1.0, 3: 2.0, 4: 5.0, 5: 10.0, 6: 15.0 };
        engine = new Chess.Engine(selectedDepth, timeLimits[selectedDepth] || 5.0);

        board = new Chess.Board();
        selectedSquare = null;
        legalMovesForSelected = [];
        lastMove = null;
        moveHistory = [];
        gameActive = true;
        engineThinking = false;

        // Reset info
        document.getElementById('info-depth').textContent = '—';
        document.getElementById('info-eval').textContent = '—';
        document.getElementById('info-nodes').textContent = '—';
        document.getElementById('info-nps').textContent = '—';
        document.getElementById('info-time').textContent = '—';
        document.getElementById('eval-bar-fill').style.width = '50%';
        document.getElementById('eval-bar-label').textContent = '0.00';

        resetTimer();
        renderBoard();
        startTimer();

        // If human is black, engine moves first
        if (humanColor === Chess.BLACK) {
            engineThinking = true;
            thinkingEl.classList.add('active');
            renderBoard();

            setTimeout(() => {
                const engineMove = engine.getBestMove(board);
                if (engineMove) {
                    const san = board.moveToSan(engineMove);
                    board.makeMove(engineMove);
                    lastMove = { from: engineMove.from, to: engineMove.to };
                    updateMoveHistory(san);
                    updateEngineInfo();
                }
                engineThinking = false;
                thinkingEl.classList.remove('active');
                renderBoard();
            }, 50);
        }
    }

    function showGameOverModal() {
        stopTimer();
        const resultEl = document.getElementById('game-over-result');
        const reasonEl = document.getElementById('game-over-reason');

        if (board.isCheckmate()) {
            const winner = board.turn === Chess.WHITE ? 'Black' : 'White';
            const isHumanWin = (winner === 'White' && humanColor === Chess.WHITE) ||
                               (winner === 'Black' && humanColor === Chess.BLACK);
            resultEl.textContent = isHumanWin ? '🎉 You Win!' : '💀 You Lose';
            reasonEl.textContent = 'Checkmate';
        } else if (board.isStalemate()) {
            resultEl.textContent = '🤝 Draw';
            reasonEl.textContent = 'Stalemate — no legal moves';
        } else if (board.isDraw()) {
            resultEl.textContent = '🤝 Draw';
            if (board.halfmoveClock >= 100) reasonEl.textContent = '50-move rule';
            else if (board.isInsufficientMaterial()) reasonEl.textContent = 'Insufficient material';
            else reasonEl.textContent = 'Draw';
        }

        gameOverModal.classList.add('active');
    }

    // --- Controls ---
    function undoMove() {
        if (!gameActive || engineThinking) return;
        if (board.moveStack.length < 2) return;

        board.unmakeMove();
        board.unmakeMove();

        lastMove = board.moveStack.length > 0
            ? { from: board.moveStack[board.moveStack.length - 1].from, to: board.moveStack[board.moveStack.length - 1].to }
            : null;

        // Rebuild move history
        if (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].black !== '') {
            moveHistory[moveHistory.length - 1].black = '';
        } else if (moveHistory.length > 0) {
            moveHistory.pop();
        }

        renderMoveHistory();
        deselectSquare();
    }

    function flipBoard() {
        perspective = perspective === Chess.WHITE ? Chess.BLACK : Chess.WHITE;
        const boardContainer = document.querySelector('.board-container');
        boardContainer.querySelector('.board').classList.add('flipping');
        setTimeout(() => {
            renderBoard();
            boardContainer.querySelector('.board').classList.remove('flipping');
        }, 250);
    }

    function resign() {
        if (!gameActive || engineThinking) return;
        if (!confirm('Are you sure you want to resign?')) return;

        gameActive = false;
        stopTimer();
        const winner = humanColor === Chess.WHITE ? 'Black' : 'White';
        statusBar.innerHTML = `<span class="check-alert">You resigned. ${winner} wins!</span>`;

        const resultEl = document.getElementById('game-over-result');
        const reasonEl = document.getElementById('game-over-reason');
        resultEl.textContent = '🏳️ Resigned';
        reasonEl.textContent = `${winner} wins by resignation`;
        gameOverModal.classList.add('active');
    }

    // --- Init ---
    renderBoard();
    setTimeout(() => showNewGameModal(), 300);

})();
