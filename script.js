document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris-board');
    const context = canvas.getContext('2d');
    const starfieldCanvas = document.getElementById('starfield-canvas');
    const starfieldContext = starfieldCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const gameOverElement = document.getElementById('game-over');

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 25;

    let board = createBoard();
    let score = 0;
    let level = 1;
    let linesCleared = 0;
    let dropStart = Date.now();
    let gameOver = false;
    let animationFrameId;

    const STAR_COUNT = 100;
    let stars = [];

    const lockSound = new Audio('sounds/lock.mp3');
    const clearSound = new Audio('sounds/clear.mp3');
    const backgroundMusic = new Audio('sounds/background.mp3');
    backgroundMusic.loop = true;

    setupCanvas();
    setupStarfield();
    animateStars();


    const TETROMINOES = {
        'I': [[1, 1, 1, 1]],
        'J': [[1, 0, 0], [1, 1, 1]],
        'L': [[0, 0, 1], [1, 1, 1]],
        'O': [[1, 1], [1, 1]],
        'S': [[0, 1, 1], [1, 1, 0]],
        'T': [[0, 1, 0], [1, 1, 1]],
        'Z': [[1, 1, 0], [0, 1, 1]]
    };

    let piece = {
        x: 0,
        y: 0,
        shape: null
    };

    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function setupCanvas() {
        context.canvas.width = COLS * BLOCK_SIZE;
        context.canvas.height = ROWS * BLOCK_SIZE;
        context.scale(BLOCK_SIZE, BLOCK_SIZE);
    }

    function setupStarfield() {
        starfieldCanvas.width = window.innerWidth;
        starfieldCanvas.height = window.innerHeight;
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * starfieldCanvas.width,
                y: Math.random() * starfieldCanvas.height,
                opacity: Math.random() * 0.8 + 0.2,
                velocity: (Math.random() - 0.5) * 0.2
            });
        }
    }

    function drawAndAnimateStars() {
        starfieldContext.clearRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);
        stars.forEach(star => {
            starfieldContext.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            starfieldContext.fillRect(star.x, star.y, 1, 1);

            star.opacity += star.velocity;
            if (star.opacity > 1 || star.opacity < 0) {
                star.velocity = -star.velocity;
            }
        });
    }

    function animateStars() {
        drawAndAnimateStars();
        requestAnimationFrame(animateStars);
    }

    window.addEventListener('resize', () => {
        let timeout;
        clearTimeout(timeout);
        timeout = setTimeout(setupStarfield, 250);
    });

    function draw() {
        context.fillStyle = '#000';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
        drawBoard();
        drawPiece();
    }

    function drawBoard() {
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    context.fillStyle = '#fff';
                    context.fillRect(x, y, 1, 1);
                }
            });
        });
    }

    function drawPiece() {
        context.fillStyle = '#fff';
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    context.fillRect(piece.x + x, piece.y + y, 1, 1);
                }
            });
        });
    }

    function spawnPiece() {
        const types = 'IOTSZJL';
        const type = types[Math.floor(Math.random() * types.length)];
        piece.shape = TETROMINOES[type];
        piece.x = Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2);
        piece.y = 0;

        if (collision()) {
            gameOver = true;
            gameOverElement.classList.remove('hidden');
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
            cancelAnimationFrame(animationFrameId);
        }
    }

    function drop() {
        piece.y++;
        if (collision()) {
            piece.y--;
            lockPiece();
            clearLines();
            spawnPiece();
        }
    }

    function collision() {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (
                    piece.shape[y][x] &&
                    (board[piece.y + y] && board[piece.y + y][piece.x + x]) !== 0
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    function lockPiece() {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    board[piece.y + y][piece.x + x] = 1;
                }
            });
        });
        lockSound.play();
    }

    function rotate() {
        const originalShape = piece.shape;
        const newShape = originalShape[0].map((_, colIndex) =>
            originalShape.map(row => row[colIndex]).reverse()
        );
        piece.shape = newShape;

        if (collision()) {
            piece.shape = originalShape;
        }
    }
    
    function clearLines() {
        let lines = 0;
        outer: for (let y = ROWS - 1; y > 0; --y) {
            for (let x = 0; x < COLS; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }

            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            lines++;
        }
        
        if (lines > 0) {
            score += lines * 10 * level;
            linesCleared += lines;
            scoreElement.innerText = score;
            if (linesCleared >= level * 10) {
                level++;
                levelElement.innerText = level;
            }
            clearSound.play();
        }
    }

    function gameLoop() {
        if (gameOver) return;

        let now = Date.now();
        let delta = now - dropStart;
        let dropInterval = 1000 / level;

        if (delta > dropInterval) {
            drop();
            dropStart = Date.now();
        }

        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', event => {
        if (gameOver) return;

        if (event.key === 'ArrowLeft') {
            piece.x--;
            if (collision()) piece.x++;
        } else if (event.key === 'ArrowRight') {
            piece.x++;
            if (collision()) piece.x--;
        } else if (event.key === 'ArrowDown') {
            drop();
        } else if (event.key === 'ArrowUp') {
            rotate();
        } else if (event.key === ' ') {
            while (!collision()) {
                piece.y++;
            }
            piece.y--;
            lockPiece();
            clearLines();
            spawnPiece();
        }
    });

    function startGame() {
        board = createBoard();
        score = 0;
        level = 1;
        linesCleared = 0;
        gameOver = false;
        scoreElement.innerText = score;
        levelElement.innerText = level;
        gameOverElement.classList.add('hidden');
        spawnPiece();
        dropStart = Date.now();
        backgroundMusic.play();
        gameLoop();
    }

    startButton.addEventListener('click', () => {
        startButton.style.display = 'none';
        startGame();
    });

    restartButton.addEventListener('click', () => {
        startGame();
    });
});
