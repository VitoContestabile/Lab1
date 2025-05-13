import * as express from "express";
import app from "express/lib/application";

app.use(express.static('public'));// soundManager.js
(function () {
    if (window.soundManager) return; // Evitar múltiples instancias

    let sound = new Audio('./assets/flappybird-sound.mp3');
    sound.loop = true;

    // Comprobar si el sonido estaba activado antes
    if (localStorage.getItem("soundEnabled") === "true") {
        sound.play();
    }

    // Guardar en `window` para que sea accesible desde cualquier página
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
