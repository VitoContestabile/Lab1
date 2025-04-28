// localStorageUtil.js
export function saveScore(score) {
    localStorage.setItem('lastScore', Math.floor(score));
}
