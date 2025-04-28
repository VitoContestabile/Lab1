// main.js
import { initStartScreen } from "./screens/startScreen.js";
import { initGameOverScreen } from "./screens/gameOverScreen.js";
import "../sound/soundManager.js";

document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname;

    if (currentPage.includes('game.html')) {
        initStartScreen();
    } else if (currentPage.includes('gameover.html')) {
        initGameOverScreen();
    }
});
