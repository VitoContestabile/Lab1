// gameOverScreen.js
export function initGameOverScreen() {
    const lastScore = localStorage.getItem('lastScore');
    const scoreDisplay = document.getElementById('score-display');

    if (scoreDisplay && lastScore !== null) {
        scoreDisplay.textContent = `Puntaje: ${lastScore}`;
    }
}
