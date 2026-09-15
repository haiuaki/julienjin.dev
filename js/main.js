const startButton = document.getElementById('start-btn');
const solarSystem = document.getElementById('solar-system');

let isPaused = sessionStorage.getItem('isPaused') === 'true';
let systemEpoch = parseInt(sessionStorage.getItem('systemEpoch'), 10);
let pauseTimestamp = parseInt(sessionStorage.getItem('pauseTimestamp'), 10);

// Initialize system epoch on first load
if (isNaN(systemEpoch)) {
    systemEpoch = Date.now();
    sessionStorage.setItem('systemEpoch', systemEpoch);
}

// Restore previous running or paused state
if (isPaused) {
    let runningTimeMs = pauseTimestamp - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
    solarSystem.classList.add('paused');
} else {
    let runningTimeMs = Date.now() - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
}

// Handle play/pause toggle
startButton.addEventListener('click', function() {
    isPaused = !isPaused;

    if (isPaused) {
        pauseTimestamp = Date.now();
        sessionStorage.setItem('pauseTimestamp', pauseTimestamp);
        solarSystem.classList.add('paused');
    } else {
        let pauseDuration = Date.now() - pauseTimestamp;
        systemEpoch += pauseDuration;
        sessionStorage.setItem('systemEpoch', systemEpoch);
        solarSystem.classList.remove('paused');
    }

    sessionStorage.setItem('isPaused', isPaused);
});
