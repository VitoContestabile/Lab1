document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-button");
    const startScreen = document.getElementById("start-screen");
    const canvas = document.getElementById("board");

    // Check if auto-start is enabled
    const autoStart = localStorage.getItem('autoStart');

    if (autoStart === 'true') {
        // Remove the auto-start flag
        localStorage.removeItem('autoStart');

        // Automatically start the game
        startScreen.style.display = "none";
        canvas.style.display = "block";
        startGame();
    } else {
        // Normal start button behavior
        startButton.addEventListener("click", () => {
            startScreen.style.display = "none";
            canvas.style.display = "block";
            startGame();
        });
    }
});

// Rest of the code remains the same as in the previous version
// (The entire previous flappybird.js code stays unchanged)

// Variables globales
let board, ctx;
let boardWidth = 360, boardHeight = 640;

// Bird
let bird = { x: 0, y: 0, width: 45, height: 45 }; // x e y se actualizarán en startGame()
let velocityY = 0;
let gravity = 0.23;  // Ajusta la caída del pájaro

// Pipes
let pipeArray = [];
let pipeWidth = 64, pipeHeight = 512;
let pipeX = 0; // Se actualizará en startGame()
let pipeY = 0;
let openingSpace = 250;

// Imágenes
let birdImg = new Image(), topPipeImg = new Image(), bottomPipeImg = new Image();
if (localStorage.getItem("equipped_skin_img")) {
    birdImg.src = localStorage.getItem("equipped_skin_img");
} else {
    birdImg.src = "./flappybird.png"; // cambia esta ruta según tu estructura
}
topPipeImg.src = "./toppipe.png";
bottomPipeImg.src = "./bottompipe.png";

// Juego
let velocityX = -2;  // Velocidad reducida para que arranque más despacio
let gameOver = false, score = 0;
let pipeInterval;  // Variable para almacenar el intervalo

function startGame() {
    board = document.getElementById("board");
    // Actualiza las dimensiones para ocupar toda la pantalla
    boardWidth = window.innerWidth;
    boardHeight = window.innerHeight;
    board.width = boardWidth;
    board.height = boardHeight;
    ctx = board.getContext("2d");

    // Actualiza la posición del pájaro y las tuberías según el nuevo tamaño
    bird.x = boardWidth / 8;
    bird.y = boardHeight / 2;
    velocityY = 0;
    pipeArray = [];
    score = 0;
    gameOver = false;
    velocityX = -10;  // Velocidad más lenta
    pipeX = boardWidth; // Las tuberías salen desde el borde derecho

    // Se agrega el listener para mover el pájaro
    document.addEventListener("keydown", moveBird);
    requestAnimationFrame(update);

    clearInterval(pipeInterval); // Limpia el intervalo anterior (si existe)
    pipeInterval = setInterval(placePipes, 1800);
}

function update() {
    if (gameOver) {
        // Guarda la puntuación en localStorage
        localStorage.setItem('lastScore', Math.floor(score));

        // Redirige a la página de Game Over
        window.location.href = 'GameOver.html';
        return;
    }

    ctx.clearRect(0, 0, board.width, board.height);

    // Fondo
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, board.width, board.height);

    // Gravedad y movimiento del pájaro
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0);
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) gameOver = true;

    // Movimiento y dibujo de tuberías
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        ctx.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5;
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) gameOver = true;
    }

    // Ajuste muy sutil de aceleración (opcional)
    if (velocityX > -2.5) {
        velocityX -= 0.0003;
    }

    // Elimina tuberías que han salido de la pantalla
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }

    // Dibuja el score
    ctx.fillStyle = "white";
    ctx.font = "45px sans-serif";
    ctx.fillText(Math.floor(score), 5, 45);

    requestAnimationFrame(update);
}

function placePipes() {
    if (gameOver) return;

    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    pipeArray.push({
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    });
    pipeArray.push({
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    });
}

function moveBird(e) {
    if (["Space", "ArrowUp", "KeyX"].includes(e.code)) {
        velocityY = -7;  // Impulso para mover el pájaro hacia arriba
    }
}

function detectCollision(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}