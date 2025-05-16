// Play the versus animation sequence
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

            // Start the animation sequence
            setTimeout(() => {
                // Slide in player 1
                player1Container.style.transform = "translateX(0)";
                player1Container.style.opacity = "1";

                // Play "whoosh" sound effect
                playSound("whoosh-1");

                setTimeout(() => {
                    // Slide in player 2
                    player2Container.style.transform = "translateX(0)";
                    player2Container.style.opacity = "1";

                    // Play second "whoosh" sound effect
                    playSound("whoosh-2");

                    setTimeout(() => {
                        // Show VS text with explosion effect
                        versusText.style.opacity = "1";
                        versusText.style.transform = "scale(1.2)";

                        // Play explosion sound
                        playSound("explosion");

                        // Camera shake effect
                        let shakeCount = 0;
                        const shakeInterval = setInterval(() => {
                            versusContainer.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`;
                            shakeCount++;

                            if (shakeCount >= 10) {
                                clearInterval(shakeInterval);
                                versusContainer.style.transform = "translate(0, 0)";

                                // Final pause before starting the game
                                setTimeout(() => {
                                    // Fade out the versus screen
                                    versusContainer.style.opacity = "0";
                                    versusContainer.style.transition = "opacity 0.5s ease";

                                    setTimeout(() => {
                                        versusContainer.style.display = "none";
                                        versusContainer.style.opacity = "1";
                                        versusContainer.style.transition = "";

                                        // Reset animation elements for next time
                                        player1Container.style.transform = "translateX(-200px)";
                                        player1Container.style.opacity = "0";
                                        player2Container.style.transform = "translateX(200px)";
                                        player2Container.style.opacity = "0";
                                        versusText.style.opacity = "0";
                                        versusText.style.transform = "scale(0.5)";

                                        // Execute callback to start the game
                                        if (callback) callback();
                                    }, 500);
                                }, 1000);
                            }
                        }, 50);
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
}function drawBoundaries() {
    if (gameMode === "multiplayer") {
        const halfWidth = boardWidth / 2;

        // Draw strong divider line
        ctx.fillStyle = "white";
        ctx.fillRect(halfWidth - 2, 0, 4, boardHeight);

        // Draw player labels
        ctx.font = "20px sans-serif";
        ctx.fillText("Player 1", 10, 20);
        ctx.fillText("Player 2", halfWidth + 10, 20);

        // Add horizontal markers to make the boundary more visible
        const markerCount = 20;
        const markerSize = 10;
        for (let i = 0; i < markerCount; i++) {
            const y = (boardHeight / markerCount) * i;
            ctx.fillRect(halfWidth - markerSize, y, markerSize * 2, 2);
        }
    }
}document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-button");
    const startScreen = document.getElementById("start-screen");
    const canvas = document.getElementById("board");
    const modeSelector = document.createElement("div");

    // Add mode selection to start screen
    modeSelector.className = "mode-selector";
    modeSelector.innerHTML = `
        <h3>Select Mode:</h3>
        <button id="single-player">Single Player</button>
        <button id="split-screen">Split Screen Multiplayer</button>
    `;
    startScreen.appendChild(modeSelector);

    // Add versus animation container (hidden initially)
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
    versusContainer.style.display = "none";

    versusContainer.innerHTML = `
        <div id="versus-animation" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div style="display: flex; width: 100%; justify-content: space-between; padding: 0 50px;">
                <div id="player1-container" style="transform: translateX(-200px); opacity: 0; transition: all 1s ease;">
                    <img id="player1-img" src="./flappybird.png" alt="Player 1" style="width: 150px; height: 150px;">
                    <h2 style="color: #ff5555; text-align: center; font-size: 24px; margin-top: 10px;">PLAYER 1</h2>
                </div>
                <div id="player2-container" style="transform: translateX(200px); opacity: 0; transition: all 1s ease;">
                    <img id="player2-img" src="./flappybird.png" alt="Player 2" style="width: 150px; height: 150px;">
                    <h2 style="color: #5555ff; text-align: center; font-size: 24px; margin-top: 10px;">PLAYER 2</h2>
                </div>
            </div>
            <div id="versus-text" style="font-size: 72px; font-weight: bold; color: white; margin-top: 40px; opacity: 0; transform: scale(0.5); transition: all 0.5s ease;">VS</div>
        </div>
    `;

    document.body.appendChild(versusContainer);

    // Mode selection handlers
    let gameMode = "single"; // Default mode

    document.getElementById("single-player").addEventListener("click", () => {
        gameMode = "single";
        startButton.innerText = "Start Single Player";
    });

    document.getElementById("split-screen").addEventListener("click", () => {
        gameMode = "multiplayer";
        startButton.innerText = "Start Multiplayer";
    });

    // Check if auto-start is enabled
    const autoStart = localStorage.getItem('autoStart');

    if (autoStart === 'true') {
        // Remove the auto-start flag
        localStorage.removeItem('autoStart');

        // Automatically start the game
        startScreen.style.display = "none";
        canvas.style.display = "block";
        startGame(gameMode);
    } else {
        // Normal start button behavior
        startButton.addEventListener("click", () => {
            if (gameMode === "multiplayer") {
                // Show versus animation
                playVersusAnimation(() => {
                    startScreen.style.display = "none";
                    canvas.style.display = "block";
                    startGame(gameMode);
                });
            } else {
                // Start single player directly
                startScreen.style.display = "none";
                canvas.style.display = "block";
                startGame(gameMode);
            }
        });
    }
});

// Variables globales
let board, ctx;
let boardWidth = 360, boardHeight = 640;

// Birds for both players
let birds = [
    { x: 0, y: 0, width: 45, height: 45, velocityY: 0, score: 0, keyCode: "KeyX" }, // Player 1 (left)
    { x: 0, y: 0, width: 45, height: 45, velocityY: 0, score: 0, keyCode: "ArrowUp" }  // Player 2 (right)
];

let gravity = 0.3;  // Ajusta la caída del pájaro

// Pipes - separate arrays for each player in multiplayer
let pipeArrays = [[], []];
let pipeWidth = 64, pipeHeight = 512;
let openingSpace = 250;

// Imágenes
let birdImgs = [new Image(), new Image()];
let topPipeImg = new Image(), bottomPipeImg = new Image();

// Juego
let velocityX = -10;  // Velocidad reducida para que arranque más despacio
let gameOver = false;
let pipeIntervals = [];  // Array to store pipe intervals for both players
let gameMode = "single"; // Default to single player

// Animation variables
let versusAnimationPlayed = false;

// Get user token
const token = localStorage.getItem("token");
const userId = token ? parseJwt(token).userId : null;

async function loadBirdSkin(userId, playerIndex) {
    try {
        if (!userId && playerIndex === 0) {
            // Default skin for player 1
            return "./flappybird.png";
        } else if (playerIndex === 1) {
            // Different skin for player 2
            return "./flappybird.png";
        }

        const res = await fetch("http://localhost:3000/get-current-skin-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId: userId })
        });

        const data = await res.json();
        return data.image_url || "./flappybird.png";
    } catch (error) {
        console.error("Error loading bird skin:", error);
        return "./fappybird.png"; // Fallback to default
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
        birdImgs[0].src = "./flappybird.png";
        birdImgs[1].src = "./flappybird.png";
    });
}

// Load bird images when the script loads
loadBirdImages();

topPipeImg.src = "./toppipe.png";
bottomPipeImg.src = "./bottompipe.png";

function startGame(mode) {
    gameMode = mode || "single";

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

    // Set up intervals for each player's pipes
    if (gameMode === "multiplayer") {
        // For multiplayer, set up pipes for both sides
        pipeIntervals.push(setInterval(() => placePipes(0), 1800)); // Left side
        pipeIntervals.push(setInterval(() => placePipes(1), 1800)); // Right side
    } else {
        // For single player, only set up pipes for player 1
        pipeIntervals.push(setInterval(() => placePipes(0), 1800));
    }

    // Add keyboard event listeners
    document.addEventListener("keydown", moveBird);

    // Start the game loop
    requestAnimationFrame(update);
}

function resetGameState() {
    // Reset birds positions and velocities
    if (gameMode === "multiplayer") {
        // Split screen placement for multiplayer
        const halfWidth = boardWidth / 2;

        birds[0].x = halfWidth / 8; // Player 1 on left side
        birds[0].y = boardHeight / 2;
        birds[0].velocityY = 0;
        birds[0].score = 0;

        birds[1].x = halfWidth + (halfWidth / 8); // Player 2 on right side
        birds[1].y = boardHeight / 2;
        birds[1].velocityY = 0;
        birds[1].score = 0;
    } else {
        // Single player mode
        birds[0].x = boardWidth / 8;
        birds[0].y = boardHeight / 2;
        birds[0].velocityY = 0;
        birds[0].score = 0;
    }

    // Reset pipes
    pipeArrays = [[], []];

    // Reset game state
    gameOver = false;
    velocityX = -10;
}

function update() {
    if (gameOver) {
        // Guarda la puntuación en localStorage
        if (gameMode === "multiplayer") {
            localStorage.setItem('lastScore', Math.floor(Math.max(birds[0].score, birds[1].score)));
            localStorage.setItem('player1Score', Math.floor(birds[0].score));
            localStorage.setItem('player2Score', Math.floor(birds[1].score));
        } else {
            localStorage.setItem('lastScore', Math.floor(birds[0].score));
        }

        // Redirige a la página de Game Over
        window.location.href = 'GameOver.html';
        return;
    }

    ctx.clearRect(0, 0, board.width, board.height);

    // Fondo
    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, board.width, board.height);

    // Draw divider for multiplayer mode
    if (gameMode === "multiplayer") {
        drawBoundaries();
    }

    // Update and draw each active bird
    let activePlayers = gameMode === "multiplayer" ? 2 : 1;
    let playersAlive = 0;

    for (let i = 0; i < activePlayers; i++) {
        const bird = birds[i];

        // Skip processing if this side is not being used
        if (gameMode === "single" && i > 0) continue;

        // Apply gravity and update position
        bird.velocityY += gravity;
        bird.y = Math.max(bird.y + bird.velocityY, 0);

        // Check if bird hit the ground
        if (bird.y + bird.height > boardHeight) {
            bird.y = boardHeight - bird.height; // Place on ground
            bird.velocityY = 0;
        } else {
            playersAlive++;
        }

        // Draw the bird
        ctx.drawImage(birdImgs[i], bird.x, bird.y, bird.width, bird.height);

        // Process pipes for this player
        processPipes(i);

        // Draw score
        ctx.fillStyle = "white";
        ctx.font = "45px sans-serif";
        if (gameMode === "multiplayer") {
            const halfWidth = boardWidth / 2;
            ctx.fillText(Math.floor(bird.score), i * halfWidth + 5, 45);
        } else {
            ctx.fillText(Math.floor(bird.score), 5, 45);
        }
    }

    // Check if all players have crashed
    if (playersAlive === 0) {
        gameOver = true;
    }

    // Gradually increase difficulty
    velocityX -= 0.005;


    requestAnimationFrame(update);
}

function processPipes(playerIndex) {
    const pipes = pipeArrays[playerIndex];
    const bird = birds[playerIndex];

    // Get screen boundaries for this player
    let leftBoundary = 0;
    let rightBoundary = boardWidth;

    if (gameMode === "multiplayer") {
        const halfWidth = boardWidth / 2;
        if (playerIndex === 0) {
            // Player 1 (left side)
            leftBoundary = 0;
            rightBoundary = halfWidth;
        } else {
            // Player 2 (right side)
            leftBoundary = halfWidth;
            rightBoundary = boardWidth;
        }
    }

    // Update and draw pipes
    for (let i = 0; i < pipes.length; i++) {
        let pipe = pipes[i];
        pipe.x += velocityX;

        // For player 2, check if pipe touched the middle line
        if (gameMode === "multiplayer" && playerIndex === 1 && pipe.x <= leftBoundary) {
            // Mark pipe for removal - it touched the divider
            pipe.remove = true;
            continue;
        }

        // Only draw pipes within this player's boundary
        if (pipe.x + pipe.width >= leftBoundary && pipe.x <= rightBoundary) {
            ctx.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        }

        // Score when passing a pipe
        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            bird.score += 0.5;
            pipe.passed = true;
        }

        // Check for collision
        if (detectCollision(bird, pipe)) {
            // In multiplayer, individual players can crash
            if (gameMode === "multiplayer") {
                gameOver= true; // Put bird on ground
            } else {
                gameOver = true;
            }
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
    let pipeX;
    let randomPipeY;

    if (gameMode === "multiplayer") {
        const halfWidth = boardWidth / 2;
        if (playerIndex === 0) {
            // Player 1 (left side) - pipes enter from left boundary
            pipeX = halfWidth;
        } else {
            // Player 2 (right side) - pipes enter from right boundary
            pipeX = boardWidth;
        }
        randomPipeY = -pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    } else {
        pipeX = boardWidth;
        randomPipeY = -pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    }

    // Add top pipe
    pipeArrays[playerIndex].push({
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    });

    // Add bottom pipe
    pipeArrays[playerIndex].push({
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    });
}

function moveBird(e) {
    // In multiplayer, each player has their own key
    if (gameMode === "multiplayer") {
        // Player 1 uses Space or X
        if (e.code === "Space" || e.code === "KeyX") {
            birds[0].velocityY = -6; // Slightly weaker jump for fairness
        }
        // Player 2 uses Arrow Up
        else if (e.code === "ArrowUp") {
            birds[1].velocityY = -6;
        }
    } else {
        // Single player mode - any of the keys works
        if (["Space", "ArrowUp", "KeyX"].includes(e.code)) {
            birds[0].velocityY = -7;
        }
    }
}

function detectCollision(a, b) {
    // Get the player's boundaries
    let leftBoundary = 0;
    let rightBoundary = boardWidth;

    if (gameMode === "multiplayer") {
        const halfWidth = boardWidth / 2;
        // Determine which player based on x position
        if (a.x < halfWidth) {
            // Player 1
            leftBoundary = 0;
            rightBoundary = halfWidth;
        } else {
            // Player 2
            leftBoundary = halfWidth;
            rightBoundary = boardWidth;
        }
    }

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
            if (gameMode === "multiplayer") {
                const halfWidth = boardWidth / 2;
                birds[0].x = halfWidth / 8;
                birds[1].x = halfWidth + (halfWidth / 8);
            } else {
                birds[0].x = boardWidth / 8;
            }
        }
    }
});