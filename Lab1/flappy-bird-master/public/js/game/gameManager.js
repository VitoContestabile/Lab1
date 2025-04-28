// gameManager.js
import { bird, velocityY, gravity, resetBird, moveBird } from "./bird.js";
import { pipeArray, pipeWidth, placePipes } from "./pipes.js";
import { detectCollision } from "./collision.js";
import { saveScore } from "../utils/localStorageUtil.js";

export let board, ctx, boardWidth = 360, boardHeight = 640;
export let gameOver = false, score = 0;
export let velocityX = -2;
let pipeInterval;

let birdImg = new Image();
let topPipeImg = new Image();
let bottomPipeImg = new Image();
birdImg.src = "./assets/images/flappybird.png";
topPipeImg.src = "./assets/images/toppipe.png";
bottomPipeImg.src = "./assets/images/bottompipe.png";

export function startGame() {
    board = document.getElementById("board");
    boardWidth = window.innerWidth;
    boardHeight = window.innerHeight;
    board.width = boardWidth;
    board.height = boardHeight;
    ctx = board.getContext("2d");

    resetBird(boardWidth, boardHeight);
    velocityX = -10;
    pipeArray.length = 0;
    score = 0;
    gameOver = false;

    document.addEventListener("keydown", moveBird);
    requestAnimationFrame(update);

    clearInterval(pipeInterval);
    pipeInterval = setInterval(() => placePipes(topPipeImg, bottomPipeImg), 1800);
}

function update() {
    if (gameOver) {
        saveScore(score);
        window.location.href = 'gameover.html';
        return;
    }

    ctx.clearRect(0, 0, board.width, board.height);

    ctx.fillStyle = "skyblue";
    ctx.fillRect(0, 0, board.width, board.height);

    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0);
    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (bird.y > board.height) gameOver = true;

    for (let pipe of pipeArray) {
        pipe.x += velocityX;
        ctx.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5;
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) {
            gameOver = true;
        }
    }

    if (velocityX > -2.5) {
        velocityX -= 0.0003;
    }

    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }

    ctx.fillStyle = "white";
    ctx.font = "45px sans-serif";
    ctx.fillText(Math.floor(score), 5, 45);

    requestAnimationFrame(update);
}
