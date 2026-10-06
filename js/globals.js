document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

const sunBtn = document.getElementById('sun-btn');
const solarSystem = document.getElementById('solar-system');

/* Track if user explicitly clicked the Sun */
let isManuallyPaused = sessionStorage.getItem('isManuallyPaused') === 'true';
/* Track actual physics state (could be paused by hover or click) */
let isPhysicsPaused = isManuallyPaused;

let systemEpoch = parseInt(sessionStorage.getItem('systemEpoch'), 10);
let pauseTimestamp = parseInt(sessionStorage.getItem('pauseTimestamp'), 10);

/* Initialize system epoch on first load */
if (isNaN(systemEpoch)) {
    systemEpoch = Date.now();
    sessionStorage.setItem('systemEpoch', systemEpoch);
}

/* Focus target for the active planet. Pixel centers (x.5) rather than pixel
   boundaries, so a 1px crosshair line can sit exactly on the planet's center. */
const FOCUS_TARGET_X = 64.5;
const FOCUS_TARGET_Y = 58.5;

/* Crosshairs are 1px lines drawn from their translate value, so their visual
   center sits half a line past it. Offset by half a line and snap to the device
   pixel grid so the line is both centered on the target and crisp (1x and 2x). */
function crosshairPos(center) {
    const dpr = window.devicePixelRatio || 1;
    return Math.round((center - 0.5) * dpr) / dpr;
}

/* UI Animation Trackers */
let uiTimeouts = [];

/* Orbit animations of the focused planet: frozen so it holds still in the
   corner, and left out of every speed change until the planet is released */
let focusedOrbitAnims = [];
let uiIntervals = [];
