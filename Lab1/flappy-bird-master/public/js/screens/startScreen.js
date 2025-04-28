// startScreen.js
import { startGame } from "../game/gameManager.js";

export function initStartScreen() {
    const startButton = document.getElementById("start-button");
    const startScreen = document.getElementById("start-screen");
    const canvas = document.getElementById("board");

    const autoStart = localStorage.getItem('autoStart');

    if (autoStart === 'true') {
        localStorage.removeItem('autoStart');
        startScreen.style.display = "none";
        canvas.style.display = "block";
        startGame();
    } else {
        startButton.addEventListener("click", () => {
            startScreen.style.display = "none";
            canvas.style.display = "block";
            startGame();
        });
    }
}
