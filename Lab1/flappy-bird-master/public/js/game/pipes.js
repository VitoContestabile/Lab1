// pipes.js
export let pipeArray = [];
export const pipeWidth = 64;
export const pipeHeight = 512;
export const openingSpace = 250;

import { boardWidth } from "./gameManager.js";

export function placePipes(topPipeImg, bottomPipeImg) {
    let randomPipeY = -pipeHeight / 4 - Math.random() * (pipeHeight / 2);

    pipeArray.push({
        img: topPipeImg,
        x: boardWidth,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    });

    pipeArray.push({
        img: bottomPipeImg,
        x: boardWidth,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    });
}
