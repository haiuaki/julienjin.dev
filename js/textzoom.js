/* --- TEXT ZOOM (touch screens) --- */
/* Pinch-zooming a phone magnifies the whole page, and redrawing the 3D scene
   at that scale takes more graphics memory than phones have (Safari crashes
   the page). On touch screens, a pinch on a window enlarges its text instead
   (100–200%, WCAG 1.4.4), the windows keep their place and the scene stays
   as it is; a pinch on the sky does nothing. Desktop zoom is left alone.
   The size holds for the visit. */
const TEXT_ZOOM_KEY = 'textZoom';
const TEXT_ZOOM_MIN = 1;
const TEXT_ZOOM_MAX = 2;
const touchScreen = window.matchMedia('(pointer: coarse)');

let textZoom = 1;
let textZoomFrame = 0;

const clampZoom = (z) => Math.min(TEXT_ZOOM_MAX, Math.max(TEXT_ZOOM_MIN, z));

/* Applied once per frame while pinching (css --text-zoom scales the windows' fonts) */
function setTextZoom(z) {
    textZoom = clampZoom(z);
    if (textZoomFrame) return;
    textZoomFrame = requestAnimationFrame(() => {
        textZoomFrame = 0;
        document.documentElement.style.setProperty('--text-zoom', textZoom.toFixed(3));
        /* Enlarged: index rows may wrap (css .text-zoomed) */
        document.documentElement.classList.toggle('text-zoomed', textZoom > 1.15);
        checkLeaders(); /* leaders follow which rows wrap (js/menu.js) */
    });
}

function saveTextZoom() {
    sessionStorage.setItem(TEXT_ZOOM_KEY, textZoom);
}

setTextZoom(parseFloat(sessionStorage.getItem(TEXT_ZOOM_KEY)) || 1);

const inWindow = (target) => !!(target && target.closest && target.closest('.term-window'));
let pinch = null; /* the gesture in progress: { zoom at its start, finger distance } */

if ('ongesturestart' in window) {
    /* Safari: its own gesture events carry the pinch's scale. Cancelling them
       on a touch screen keeps the page itself from zooming. (On a Mac they
       come from the trackpad: left alone, that stays the page zoom.) */
    document.addEventListener('gesturestart', (e) => {
        if (!touchScreen.matches) return;
        e.preventDefault();
        pinch = inWindow(e.target) ? { zoom: textZoom } : null;
    });
    document.addEventListener('gesturechange', (e) => {
        if (!touchScreen.matches) return;
        e.preventDefault();
        if (pinch) setTextZoom(pinch.zoom * e.scale);
    });
    document.addEventListener('gestureend', (e) => {
        if (!touchScreen.matches) return;
        e.preventDefault();
        if (pinch) saveTextZoom();
        pinch = null;
    });
} else {
    /* Other browsers: the distance between two fingers. The page's own
       pinch-zoom is already off on touch (touch-action in style.css). */
    const distance = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2 && inWindow(e.target)) pinch = { zoom: textZoom, d: distance(e.touches) };
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (pinch && e.touches.length === 2) setTextZoom(pinch.zoom * distance(e.touches) / pinch.d);
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        if (pinch && e.touches.length < 2) {
            saveTextZoom();
            pinch = null;
        }
    }, { passive: true });
}
