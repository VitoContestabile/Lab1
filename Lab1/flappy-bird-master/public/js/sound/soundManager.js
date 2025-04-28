// soundManager.js
(function () {
    if (window.soundManager) return;

    let sound = new Audio('./assets/sounds/flappybird-sound.mp3');
    sound.loop = true;

    if (localStorage.getItem("soundEnabled") === "true") {
        sound.play();
    }

    window.soundManager = {
        play: function () {
            sound.play();
            localStorage.setItem("soundEnabled", "true");
        },
        pause: function () {
            sound.pause();
            localStorage.setItem("soundEnabled", "false");
        }
    };
})();
