document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

/* The site owner's name, used by the scripts (home window title, tab titles,
   profile). Pages that work without JavaScript (the <head> tags, the no-JS
   window, 404.html) write it out themselves, since crawlers and link
   previews don't run scripts. */
const SITE_NAME = 'Julien Jin';

const sunBtn = document.getElementById('sun-btn');
const solarSystem = document.getElementById('solar-system');

/* Track if time was halted on purpose. Visitors who asked their system for
   reduced motion arrive with time already halted (the orbits are the page's
   one continuous motion); a choice made earlier in the visit always wins. */
const storedPause = sessionStorage.getItem('isManuallyPaused');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let isManuallyPaused = storedPause === null ? prefersReducedMotion : storedPause === 'true';
/* Track actual physics state (could be paused by hover or click) */
let isPhysicsPaused = isManuallyPaused;

let systemEpoch = parseInt(sessionStorage.getItem('systemEpoch'), 10);
let pauseTimestamp = parseInt(sessionStorage.getItem('pauseTimestamp'), 10);
if (isManuallyPaused && isNaN(pauseTimestamp)) pauseTimestamp = Date.now();

/* Initialize system epoch on first load */
if (isNaN(systemEpoch)) {
    systemEpoch = Date.now();
    sessionStorage.setItem('systemEpoch', systemEpoch);
}

/* Focus target for the active planet. Pixel centers (x.5) rather than pixel
   boundaries, so a 1px crosshair line can sit exactly on the planet's center.
   Compact screens (matches the 900px layout in style.css) use a tighter corner
   to leave more room for reading. Read at use time, so it follows resizes. */
const compactLayout = window.matchMedia('(max-width: 900px)');
function focusTarget() {
    return compactLayout.matches ? { x: 28.5, y: 30.5 } : { x: 64.5, y: 58.5 };
}

/* Crosshairs are 1px lines drawn from their translate value, so their visual
   center sits half a line past it. Offset by half a line and snap to the device
   pixel grid so the line is both centered on the target and crisp (1x and 2x). */
function crosshairPos(center) {
    const dpr = window.devicePixelRatio || 1;
    return Math.round((center - 0.5) * dpr) / dpr;
}

/* --- MOTION TIMINGS --- */
/* One place for the camera choreography. Entering a planet is a deliberate
   move; leaving is ~15% quicker. Each step starts while the previous one is
   settling (the ease-out curve is ~90% done at 60% of its time), so nothing
   waits on a motion the eye already reads as finished. */
const CAMERA_EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';
const FOCUS_PAN_MS = 800;   /* planet + system slide to the corner */
const WINDOW_OPEN_MS = 500; /* windows start opening as the pan settles */
const RETURN_PAN_MS = 700;  /* back home */
const HOME_RETURN_MS = 420; /* home window fades in as the return settles */

/* UI Animation Trackers */
let uiTimeouts = [];

/* Orbit animations of the focused planet: frozen so it holds still in the
   corner, and left out of every speed change until the planet is released */
let focusedOrbitAnims = [];
