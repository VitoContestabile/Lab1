// Variables globales
window.board = document.getElementById("board");
window.ctx = board.getContext("2d");
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
let birdImg = new Image(), bottomPipeImg = new Image(), backgroundImg = new Image();

// Background
let background = "skyblue"; // Puede ser un color o una imagen
let backgroundX = 0; // Posición X del fondo para el scrolling

const token = localStorage.getItem("token");
const userId = parseJwt(token).userId;
console.log(userId)

async function loadBirdSkin(userId) {
    const res = await fetch(`${BASE_URL}/shop/get-current-skin-image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: userId })
    });

    const data = await res.json();
    return data.image_url;
}

async function loadPipeSkin(userId) {
    const res = await fetch(`${BASE_URL}/shop/get-current-pipe-image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: userId })
    });

    const data = await res.json();
    return data.image_url;
}

// Nueva función para cargar el background
async function loadBackgroundSkin(userId) {
    const res = await fetch(`${BASE_URL}/shop/get-current-background-image`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: userId })
    });

    const data = await res.json();
    return data.image_url;
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

loadBirdSkin(userId).then(imageUrl => {
    if (imageUrl) {
        birdImg.src = imageUrl;
        birdImg.onload = () => {
            console.log("Imagen del pájaro cargada:");
        };
    } else {
        console.error("No se recibió image_url del pájaro");
    }
});

loadPipeSkin(userId).then(imageUrl => {
    if (imageUrl) {
        bottomPipeImg.src = imageUrl;
        bottomPipeImg.onload = () => {
            console.log("Imagen de tubería cargada:");
        };
    } else {
        console.error("No se recibió image_url de tubería");
    }
});

// Cargar el background
loadBackgroundSkin(userId).then(imageUrl => {
    if (imageUrl) {
        backgroundImg.src = imageUrl;
        background = backgroundImg; // Cambiar de color a imagen
        backgroundImg.onload = () => {
            console.log("Imagen de fondo cargada:");
        };
    } else {
        console.log("No se recibió image_url de fondo, usando color por defecto");
        background = "skyblue"; // Mantener color por defecto
    }
});

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
    backgroundX = 0; // Reinicia la posición del fondo

    // Se agrega el listener para mover el pájaro
    document.addEventListener("keydown", moveBird);
    requestAnimationFrame(update);

    clearInterval(pipeInterval); // Limpia el intervalo anterior (si existe)
    pipeInterval = setInterval(placePipes, 1800);
}

function drawBackground() {
    if (background instanceof Image && background.complete) {
        // Si es una imagen y está cargada, dibujarla con scrolling infinito
        let imgWidth = board.width;
        let imgHeight = board.height;

        // Dibuja la primera imagen
        ctx.drawImage(background, backgroundX, 0, imgWidth, imgHeight);

        // Dibuja la segunda imagen para crear el efecto infinito
        ctx.drawImage(background, backgroundX + imgWidth, 0, imgWidth, imgHeight);

        // Si la primera imagen se ha movido completamente fuera de la pantalla, reinicia la posición
        if (backgroundX <= -imgWidth) {
            backgroundX = 0;
        }
    } else if (typeof background === 'string') {
        // Si es un color, rellenar con ese color (los colores no necesitan scrolling)
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, board.width, board.height);
    } else {
        // Fallback: color por defecto
        ctx.fillStyle = "skyblue";
        ctx.fillRect(0, 0, board.width, board.height);
    }
}

function update() {
    if (gameOver) {
        // Guarda la puntuación en localStorage
        localStorage.setItem('lastScore', Math.floor(score));
        localStorage.setItem("playingStatus", "true")

        // Redirige a la página de Game Over
        window.location.href = 'GameOver.html';
        return;
    }

    ctx.clearRect(0, 0, board.width, board.height);

    // Actualiza la posición del fondo para el scrolling
    backgroundX += velocityX;

    // Fondo usando la nueva función
    drawBackground();

    // Gravedad y movimiento del pájaro
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0);
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) gameOver = true;

    // Movimiento y dibujo de tuberías
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        drawPipe(ctx, pipe);

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

    // Tubería superior (normal)
    pipeArray.push({
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false,
        rotated: false
    });

    // Tubería inferior (rotada 180°)
    pipeArray.push({
        img: bottomPipeImg, // Misma imagen
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false,
        rotated: true
    });
}

function drawPipe(ctx, pipe) {
    ctx.save();
    ctx.translate(pipe.x + pipe.width / 2, pipe.y + pipe.height / 2);

    if (pipe.rotated) {
        ctx.rotate(Math.PI); // 180 grados en radianes
    }

    ctx.drawImage(pipe.img, -pipe.width / 2, -pipe.height / 2, pipe.width, pipe.height);
    ctx.restore();
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

startGame();