// bird.js
export let bird = { x: 0, y: 0, width: 34, height: 24 };
export let velocityY = 0;
export const gravity = 0.23;

export function resetBird(boardWidth, boardHeight) {
    bird.x = boardWidth / 8;
    bird.y = boardHeight / 2;
    velocityY = 0;
}

export function moveBird(e) {
    if (["Space", "ArrowUp", "KeyX"].includes(e.code)) {
        velocityY = -7;
    }
}
