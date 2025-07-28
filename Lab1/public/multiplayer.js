// Variables globales
let board, ctx;
let boardWidth = 360, boardHeight = 640;

// Birds for both players
let birds = [
    { x: 0, y: 0, width: 45, height: 45, velocityY: 0, score: 0, keyCode: "KeyX", alive: true }, // Player 1 (left)
    { x: 0, y: 0, width: 45, height: 45, velocityY: 0, score: 0, keyCode: "ArrowUp", alive: true }  // Player 2 (right)
];

let gravity = 0.23;  // Mantener la misma gravedad del juego solo

// Pipes - separate arrays for each player
let pipeArrays = [[], []];
let pipeWidth = 64, pipeHeight = 512;
let openingSpace = 250;

// Imágenes
let birdImgs = [new Image(), new Image()];
let bottomPipeImg = new Image(); // Usar solo una imagen de tubería como en el juego solo
let backgroundImg = new Image();

// Background
let background = "skyblue"; // Puede ser un color o una imagen
let backgroundX = 0; // Posición X del fondo para el scrolling

// Juego
let velocityX = -2;  // Velocidad inicial como en el juego solo
let gameOver = false;
let pipeIntervals = [];  // Array to store pipe intervals for both players

// Get user token
const token = localStorage.getItem("token");
const userId = token ? parseJwt(token).userId : null;

// Play versus animation sequence
function playVersusAnimation(callback) {
    const versusContainer = document.getElementById("versus-container");
    const player1Container = document.getElementById("player1-container");
    const player2Container = document.getElementById("player2-container");
    const versusText = document.getElementById("versus-text");
    const player1Img = document.getElementById("player1-img");
    const player2Img = document.getElementById("player2-img");

    // Update player images with actual bird skins if available
    if (birdImgs[0].complete && birdImgs[0].src) {
        player1Img.src = birdImgs[0].src;
    }
    if (birdImgs[1].complete && birdImgs[1].src) {
        player2Img.src = birdImgs[1].src;
    }

    // Show the container
    versusContainer.style.display = "block";

    // Create background flash effect
    let flashCount = 0;
    const maxFlashes = 3;
    let flashInterval = setInterval(() => {
        versusContainer.style.backgroundColor = flashCount % 2 === 0 ? "#fff" : "#000";
        flashCount++;

        if (flashCount >= maxFlashes * 2) {
            clearInterval(flashInterval);
            versusContainer.style.backgroundColor = "#000";

            // Add a dramatic background pattern
            versusContainer.style.backgroundImage = "radial-gradient(circle, rgba(40, 40, 40, 0.8) 0%, rgba(0, 0, 0, 1) 70%)";

            // Start the animation sequence
            setTimeout(() => {
                // Slide in player 1 with bounce effect
                player1Container.style.transform = "translateX(0)";
                player1Container.style.opacity = "1";
                player1Container.style.transition = "transform 1s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.8s ease";

                // Play "whoosh" sound effect
                playSound("whoosh-1");

                setTimeout(() => {
                    // Slide in player 2 with bounce effect
                    player2Container.style.transform = "translateX(0)";
                    player2Container.style.opacity = "1";
                    player2Container.style.transition = "transform 1s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.8s ease";

                    // Play second "whoosh" sound effect
                    playSound("whoosh-2");

                    setTimeout(() => {
                        // Show VS text with explosion effect
                        versusText.style.opacity = "1";
                        versusText.style.transform = "scale(1.5)";
                        versusText.style.transition = "all 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.5)";

                        // Add flashing light effect to VS text
                        let vsFlashCount = 0;
                        const vsFlash = setInterval(() => {
                            versusText.style.textShadow = vsFlashCount % 2 === 0
                                ? "0 0 20px #fff, 0 0 30px #fff, 0 0 40px #fff"
                                : "0 0 10px #fff, 0 0 20px #ff0, 0 0 30px #ff0";
                            vsFlashCount++;

                            if (vsFlashCount >= 6) {
                                clearInterval(vsFlash);
                            }
                        }, 100);

                        // Play explosion sound
                        playSound("explosion");

                        // Camera shake effect with more intensity
                        let shakeCount = 0;
                        const shakeInterval = setInterval(() => {
                            const shakeX = Math.random() * 16 - 8;
                            const shakeY = Math.random() * 16 - 8;
                            versusContainer.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
                            shakeCount++;

                            if (shakeCount >= 15) {
                                clearInterval(shakeInterval);
                                versusContainer.style.transform = "translate(0, 0)";

                                // Final pause before starting the game
                                setTimeout(() => {
                                    // Fade out the versus screen
                                    versusContainer.style.opacity = "0";
                                    versusContainer.style.transition = "opacity 0.8s ease";

                                    setTimeout(() => {
                                        versusContainer.style.display = "none";
                                        versusContainer.style.opacity = "1";
                                        versusContainer.style.transition = "";
                                        versusContainer.style.backgroundImage = "";

                                        // Reset animation elements for next time
                                        player1Container.style.transform = "translateX(-300px)";
                                        player1Container.style.opacity = "0";
                                        player1Container.style.transition = "";

                                        player2Container.style.transform = "translateX(300px)";
                                        player2Container.style.opacity = "0";
                                        player2Container.style.transition = "";

                                        versusText.style.opacity = "0";
                                        versusText.style.transform = "scale(0.5)";
                                        versusText.style.transition = "";

                                        // Execute callback to start the game
                                        if (callback) callback();
                                    }, 800);
                                }, 1200);
                            }
                        }, 40);
                    }, 700);
                }, 700);
            }, 300);
        }
    }, 150);
}

// Play sound effects (if available)
function playSound(soundName) {
    // Check if we have the sound effects available
    const soundEffects = {
        "whoosh-1": "./sounds/whoosh1.mp3",
        "whoosh-2": "./sounds/whoosh2.mp3",
        "explosion": "./sounds/explosion.mp3"
    };

    try {
        if (soundEffects[soundName]) {
            const sound = new Audio(soundEffects[soundName]);
            sound.volume = 0.5;
            sound.play().catch(e => console.log("Sound play prevented:", e));
        }
    } catch (error) {
        console.log("Sound not available:", error);
    }
}

function drawBoundaries() {
    const halfWidth = boardWidth / 2;

    // Draw a cleaner, more distinct divider line
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);  // Solid line
    ctx.moveTo(halfWidth, 0);
    ctx.lineTo(halfWidth, boardHeight);
    ctx.stroke();

    // Create header area with player labels
    const headerHeight = 50;

    // Player 1 header (left side)
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, halfWidth, headerHeight);

    // Player 2 header (right side)
    ctx.fillRect(halfWidth, 0, halfWidth, headerHeight);

    // Draw player labels with status
    ctx.font = "bold 20px sans-serif";

    // Player 1 status
    if (birds[0].alive) {
        ctx.fillStyle = "#ff5555";  // Red for Player 1
        ctx.textAlign = "center";
        ctx.fillText("Player 1", halfWidth / 2, 30);
    } else {
        ctx.fillStyle = "#888888";  // Gray for dead Player 1
        ctx.textAlign = "center";
        ctx.fillText("Player 1 (OUT)", halfWidth / 2, 30);
    }

    // Player 2 status
    if (birds[1].alive) {
        ctx.fillStyle = "#5555ff";  // Blue for Player 2
        ctx.fillText("Player 2", halfWidth + (halfWidth / 2), 30);
    } else {
        ctx.fillStyle = "#888888";  // Gray for dead Player 2
        ctx.fillText("Player 2 (OUT)", halfWidth + (halfWidth / 2), 30);
    }

    // Reset text alignment for other text
    ctx.textAlign = "left";
}

// Función para dibujar el fondo con scrolling (adaptada del juego solo)
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

// Función para dibujar tuberías con rotación (adaptada del juego solo)
function drawPipe(ctx, pipe) {
    ctx.save();
    ctx.translate(pipe.x + pipe.width / 2, pipe.y + pipe.height / 2);

    if (pipe.rotated) {
        ctx.rotate(Math.PI); // 180 grados en radianes
    }

    ctx.drawImage(pipe.img, -pipe.width / 2, -pipe.height / 2, pipe.width, pipe.height);
    ctx.restore();
}

async function loadBirdSkin(userId, playerIndex) {
    try {
        if (!userId && playerIndex === 0) {
            // Default skin for player 1
            return "./assets/flappybird.png";
        } else if (playerIndex === 1) {
            // Different skin for player 2
            return "./assets/flappybird.png";
        }

        const res = await fetch(`${BASE_URL}/shop/get-current-skin-image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId: userId })
        });

        const data = await res.json();
        return data.image_url || "./assets/flappybird.png";
    } catch (error) {
        console.error("Error loading bird skin:", error);
        return "./assets/flappybird.png"; // Fallback to default
    }
}

async function loadPipeSkin(userId) {
    try {
        if (!userId) {
            return "./assets/bottompipe.png";
        }

        const res = await fetch(`${BASE_URL}/shop/get-current-pipe-image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId: userId })
        });

        const data = await res.json();
        return data.image_url || "./assets/bottompipe.png";
    } catch (error) {
        console.error("Error loading pipe skin:", error);
        return "./assets/bottompipe.png";
    }
}

// Nueva función para cargar el background
async function loadBackgroundSkin(userId) {
    try {
        if (!userId) {
            return null; // Sin imagen de fondo por defecto
        }

        const res = await fetch(`${BASE_URL}/shop/get-current-background-image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId: userId })
        });

        const data = await res.json();
        return data.image_url;
    } catch (error) {
        console.error("Error loading background skin:", error);
        return null;
    }
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

// Load bird images
function loadBirdImages() {
    return Promise.all([
        loadBirdSkin(userId, 0),
        loadBirdSkin(userId, 1)
    ]).then(imageUrls => {
        imageUrls.forEach((url, index) => {
            if (url) {
                birdImgs[index].src = url;
                birdImgs[index].onload = () => {
                    console.log(`Player ${index + 1} bird image loaded`);
                };
            }
        });
    }).catch(error => {
        console.error("Error loading bird images:", error);
        // Set default images as fallback
        birdImgs[0].src = "./assets/flappybird.png";
        birdImgs[1].src = "./assets/flappybird.png";
    });
}

// Load pipe and background images
async function loadGameAssets() {
    try {
        // Load pipe skin
        const pipeUrl = await loadPipeSkin(userId);
        if (pipeUrl) {
            bottomPipeImg.src = pipeUrl;
            bottomPipeImg.onload = () => {
                console.log("Pipe image loaded");
            };
        } else {
            bottomPipeImg.src = "./assets/bottompipe.png";
        }

        // Load background skin
        const backgroundUrl = await loadBackgroundSkin(userId);
        if (backgroundUrl) {
            backgroundImg.src = backgroundUrl;
            background = backgroundImg; // Cambiar de color a imagen
            backgroundImg.onload = () => {
                console.log("Background image loaded");
            };
        } else {
            console.log("No background image, using default color");
            background = "skyblue"; // Mantener color por defecto
        }
    } catch (error) {
        console.error("Error loading game assets:", error);
        // Set fallback assets
        bottomPipeImg.src = "./assets/bottompipe.png";
        background = "skyblue";
    }
}

// Initialize game
function initGame() {
    console.log("Initializing multiplayer game");

    // Create versus animation container
    const versusContainer = document.createElement("div");
    versusContainer.id = "versus-container";
    versusContainer.style.display = "none";
    versusContainer.style.position = "fixed";
    versusContainer.style.top = "0";
    versusContainer.style.left = "0";
    versusContainer.style.width = "100%";
    versusContainer.style.height = "100%";
    versusContainer.style.backgroundColor = "black";
    versusContainer.style.zIndex = "1000";

    versusContainer.innerHTML = `
        <div id="versus-animation" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: sans-serif;">
            <div style="display: flex; width: 100%; justify-content: space-between; padding: 0 80px;">
                <div id="player1-container" style="transform: translateX(-300px); opacity: 0; transition: all 1s ease; text-align: center;">
                    <div style="background-color: rgba(255, 85, 85, 0.3); border-radius: 50%; width: 180px; height: 180px; display: flex; justify-content: center; align-items: center; border: 4px solid #ff5555; box-shadow: 0 0 20px rgba(255, 85, 85, 0.7);">
                        <img id="player1-img" src="./assets/flappybird.png" alt="Player 1" style="width: 150px; height: 150px;">
                    </div>
                    <h2 style="color: #ff5555; text-align: center; font-size: 24px; margin-top: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">PLAYER 1</h2>
                </div>
                <div id="player2-container" style="transform: translateX(300px); opacity: 0; transition: all 1s ease; text-align: center;">
                    <div style="background-color: rgba(85, 85, 255, 0.3); border-radius: 50%; width: 180px; height: 180px; display: flex; justify-content: center; align-items: center; border: 4px solid #5555ff; box-shadow: 0 0 20px rgba(85, 85, 255, 0.7);">
                        <img id="player2-img" src="./assets/flappybird.png" alt="Player 2" style="width: 150px; height: 150px;">
                    </div>
                    <h2 style="color: #5555ff; text-align: center; font-size: 24px; margin-top: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">PLAYER 2</h2>
                </div>
            </div>
            <div id="versus-text" style="font-size: 92px; font-weight: bold; color: white; margin-top: 40px; opacity: 0; transform: scale(0.5); transition: all 0.5s ease; text-shadow: 0 0 15px #fff, 0 0 25px #ff0; position: relative;">
                <span style="color: #ff5555; text-shadow: 0 0 15px #ff5555;">V</span><span style="color: #5555ff; text-shadow: 0 0 15px #5555ff;">S</span>
            </div>
        </div>
    `;

    document.body.appendChild(versusContainer);

    // Load all game assets
    Promise.all([
        loadBirdImages(),
        loadGameAssets()
    ]).then(() => {
        // Show versus animation and then start the game
        playVersusAnimation(() => {
            startGame();
        });
    });
}

function startGame() {
    board = document.getElementById("board");
    // Actualiza las dimensiones para ocupar toda la pantalla
    boardWidth = window.innerWidth;
    boardHeight = window.innerHeight;
    board.width = boardWidth;
    board.height = boardHeight;
    ctx = board.getContext("2d");

    // Reset game state
    resetGameState();

    // Clear any existing intervals and set up new ones
    pipeIntervals.forEach(interval => clearInterval(interval));
    pipeIntervals = [];

    // Set up intervals for each player's pipes (mismo timing que el juego solo)
    pipeIntervals.push(setInterval(() => placePipes(0), 1800)); // Left side
    pipeIntervals.push(setInterval(() => placePipes(1), 1800)); // Right side

    // Add keyboard event listeners
    document.addEventListener("keydown", moveBird);

    // Start the game loop
    requestAnimationFrame(update);
}

function resetGameState() {
    // Reset birds positions and velocities
    const halfWidth = boardWidth / 2;

    birds[0].x = halfWidth / 8; // Player 1 on left side
    birds[0].y = boardHeight / 2;
    birds[0].velocityY = 0;
    birds[0].score = 0;
    birds[0].alive = true;

    birds[1].x = halfWidth + (halfWidth / 8); // Player 2 on right side
    birds[1].y = boardHeight / 2;
    birds[1].velocityY = 0;
    birds[1].score = 0;
    birds[1].alive = true;

    // Reset pipes
    pipeArrays = [[], []];

    // Reset game state
    gameOver = false;
    velocityX = -10; // Velocidad inicial más rápida para multiplayer
    backgroundX = 0; // Reinicia la posición del fondo
}

function update() {
    // Verificar si ambos jugadores están muertos
    if (gameOver) {
        // Guarda la puntuación de ambos jugadores
        localStorage.setItem('player1Score', Math.floor(birds[0].score));
        localStorage.setItem('player2Score', Math.floor(birds[1].score));
        localStorage.setItem("playingStatus", "true");

        // Determinar el ganador basado en los puntajes
        let winner;
        let player1Score = Math.floor(birds[0].score);
        let player2Score = Math.floor(birds[1].score);

        if (player1Score > player2Score) {
            winner = "Player 1 Wins!!";
        } else if (player2Score > player1Score) {
            winner = "Player 2 Wins!!";
        } else {
            winner = "Its a Tie!!"; // En caso de empate
        }

        // Guardar el ganador en localStorage
        localStorage.setItem('winner', winner);

        // Redirige a la página de Game Over
        window.location.href = 'GameOverMultiplayer.html';
        return;
    }

    ctx.clearRect(0, 0, board.width, board.height);

    // Actualiza la posición del fondo para el scrolling
    backgroundX += velocityX;

    // Fondo usando la nueva función con scrolling
    drawBackground();

    // Draw divider and headers
    drawBoundaries();

    // Update and draw each bird
    let playersAlive = 0;

    for (let i = 0; i < 2; i++) {
        const bird = birds[i];

        if (bird.alive) {
            // Apply gravity and update position
            bird.velocityY += gravity;
            bird.y = Math.max(bird.y + bird.velocityY, 0);

            // Check if bird hit the ground
            if (bird.y + bird.height > boardHeight) {
                bird.y = boardHeight - bird.height; // Place on ground
                bird.velocityY = 0;
                bird.alive = false; // El pájaro muere si toca el suelo
            } else {
                playersAlive++;
            }

            // Process pipes for this player when alive
            processPipes(i);
        }

        // Draw the bird (con transparencia si está muerto)
        if (bird.alive) {
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalAlpha = 0.5; // Semi-transparente si está muerto
        }
        ctx.drawImage(birdImgs[i], bird.x, bird.y, bird.width, bird.height);
        ctx.globalAlpha = 1.0; // Restaurar opacidad

        // Draw score in a nice score display
        const halfWidth = boardWidth / 2;
        const scoreX = i === 0 ? halfWidth / 2 : halfWidth + (halfWidth / 2);

        // Create score bubbles
        ctx.beginPath();
        ctx.fillStyle = i === 0 ? "rgba(255, 85, 85, 0.8)" : "rgba(85, 85, 255, 0.8)";
        if (!bird.alive) {
            ctx.fillStyle = i === 0 ? "rgba(255, 85, 85, 0.4)" : "rgba(85, 85, 255, 0.4)"; // Más transparente si está muerto
        }
        ctx.arc(scoreX, 80, 30, 0, Math.PI * 2);
        ctx.fill();

        // Draw score text
        ctx.font = "bold 26px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(Math.floor(bird.score), scoreX, 90);
        ctx.textAlign = "left"; // Reset alignment
    }

    // Check if all players have crashed
    if (playersAlive === 0) {
        gameOver = true;
    }

    // Ajuste muy sutil de aceleración (como en el juego solo)
    if (velocityX > -2.5) {
        velocityX -= 0.0003;
    }

    requestAnimationFrame(update);
}

function processPipes(playerIndex) {
    const pipes = pipeArrays[playerIndex];
    const bird = birds[playerIndex];

    // Si el pájaro ya está muerto, no procesar colisiones
    if (!bird.alive) return;

    // Get screen boundaries for this player
    const halfWidth = boardWidth / 2;
    let leftBoundary = playerIndex === 0 ? 0 : halfWidth;
    let rightBoundary = playerIndex === 0 ? halfWidth : boardWidth;

    // Update and draw pipes
    for (let i = 0; i < pipes.length; i++) {
        let pipe = pipes[i];
        pipe.x += velocityX;

        // For player 2, check if pipe touched the middle line
        if (playerIndex === 1 && pipe.x <= leftBoundary) {
            // Mark pipe for removal - it touched the divider
            pipe.remove = true;
            continue;
        }

        // Only draw pipes within this player's boundary
        if (pipe.x + pipe.width >= leftBoundary && pipe.x <= rightBoundary) {
            drawPipe(ctx, pipe); // Usar la función de dibujo con rotación
        }

        // Score when passing a pipe (solo si está vivo)
        if (bird.alive && !pipe.passed && bird.x > pipe.x + pipe.width) {
            bird.score += 0.5;
            pipe.passed = true;
        }

        // Check for collision
        if (bird.alive && detectCollision(bird, pipe)) {
            bird.alive = false; // Solo marcar este pájaro como muerto
        }
    }

    // Remove off-screen pipes or pipes marked for removal
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        if (pipe.remove || pipe.x + pipe.width < leftBoundary) {
            pipes.splice(i, 1);
        }
    }
}

function placePipes(playerIndex) {
    if (gameOver) return;

    // Calculate pipe position based on player side
    const halfWidth = boardWidth / 2;
    let pipeX;

    if (playerIndex === 0) {
        // Player 1 (left side) - pipes enter from left boundary
        pipeX = halfWidth;
    } else {
        // Player 2 (right side) - pipes enter from right boundary
        pipeX = boardWidth;
    }

    let randomPipeY = -pipeHeight / 4 - Math.random() * (pipeHeight / 2);

    // Tubería superior (rotada 180°, como en el juego solo)
    pipeArrays[playerIndex].push({
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false,
        rotated: false // Tubería superior normal
    });

    // Tubería inferior (normal, como en el juego solo)
    pipeArrays[playerIndex].push({
        img: bottomPipeImg, // Misma imagen
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false,
        rotated: true // Tubería inferior rotada 180°
    });
}

function moveBird(e) {
    // Player 1 uses Space or X
    if ((e.code === "Space" || e.code === "KeyX") && birds[0].alive) {
        birds[0].velocityY = -7; // Mismo impulso que en el juego solo
    }
    // Player 2 uses Arrow Up
    else if (e.code === "ArrowUp" && birds[1].alive) {
        birds[1].velocityY = -7;
    }
}

function detectCollision(a, b) {
    // Get the player's boundaries
    const halfWidth = boardWidth / 2;
    // Determine which player based on x position
    let leftBoundary = a.x < halfWidth ? 0 : halfWidth;
    let rightBoundary = a.x < halfWidth ? halfWidth : boardWidth;

    // Only detect collisions within the player's boundary
    if (b.x + b.width < leftBoundary || b.x > rightBoundary) {
        return false;
    }

    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// Add resize handler for responsive gameplay
window.addEventListener("resize", () => {
    if (board) {
        // Preserve the aspect ratio but update dimensions
        boardWidth = window.innerWidth;
        boardHeight = window.innerHeight;
        board.width = boardWidth;
        board.height = boardHeight;

        // Update bird positions if game is in progress
        if (!gameOver) {
            const halfWidth = boardWidth / 2;
            birds[0].x = halfWidth / 8;
            birds[1].x = halfWidth + (halfWidth / 8);
        }
    }
});

// Export the initialization function
initGame();