/* --- REDUCED MOTION: CAMERA CUTS --- */
/* With reduced motion, the camera cuts instead of panning (WCAG 2.3.3): the
   scene takes its new framing at once and fades in there, so nothing slides
   or zooms across the screen. Pans use panDuration() for their length. */
const cameraReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const panDuration = (ms) => (cameraReducedMotion.matches ? 0 : ms);
const CUT_FADE_MS = 220;

/* Fade the scene in at its new framing, with the astre labels (they live
   outside the scene; while hidden for a focused astre, their CSS keeps them
   hidden). Crosshairs too when entering an astre; on the way home they fade
   out on their own. */
function cutScene(withCrosshairs) {
    if (!cameraReducedMotion.matches) return;
    const els = [document.getElementById('space-container'), document.getElementById('starfield'),
        ...document.querySelectorAll('.planet-label')];
    if (withCrosshairs) els.push(document.getElementById('crosshair-x'), document.getElementById('crosshair-y'));
    els.forEach(el => el && el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CUT_FADE_MS, easing: 'ease-out' }));
}

function recalculateCameraFocus() {
    const activePlanet = document.querySelector('.active-planet');
    if (!activePlanet) return;
    
    const spaceContainer = document.getElementById('space-container');
    const starfield = document.getElementById('starfield');

    /* Disable transitions to apply styles immediately */
    spaceContainer.style.transition = 'none';
    if (starfield) starfield.style.transition = 'none';

    /* Remove camera transform to read raw element coordinates */
    spaceContainer.style.transform = 'none';
    void spaceContainer.offsetWidth; /* Force layout reflow */

    /* Read element coordinates relative to the viewport */
    const rect = activePlanet.getBoundingClientRect();
    const planetX = rect.x + rect.width / 2;
    const planetY = rect.y + rect.height / 2;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const { x: targetX, y: targetY } = focusTarget();

    const dx = targetX - planetX;
    const dy = targetY - planetY;

    /* Apply new translation coordinates without scaling */
    spaceContainer.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
    if (starfield) starfield.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px) scale(1)`;
    void spaceContainer.offsetWidth; /* Force reflow */

    /* Restore camera transition styles */
    spaceContainer.style.transition = `transform ${panDuration(FOCUS_PAN_MS)}ms ${CAMERA_EASE}`;
    if (starfield) starfield.style.transition = `transform ${panDuration(FOCUS_PAN_MS)}ms ${CAMERA_EASE}`;

    /* Keep the crosshairs locked on the focus target after the resize */
    const crossX = document.getElementById('crosshair-x');
    const crossY = document.getElementById('crosshair-y');
    if (crossX && crossY) {
        /* Snap crosshairs to the target position after camera recalculation */
        crossX.style.transform = `translate3d(0, ${crosshairPos(targetY)}px, 0)`;
        crossY.style.transform = `translate3d(${crosshairPos(targetX)}px, 0, 0)`;
    }
}
window.addEventListener('mousemove', (e) => {
    /* Store screen coordinates for render loop */
    clientMouseX = e.clientX;
    clientMouseY = e.clientY;
    starsDirty = true;
});
window.addEventListener('mouseout', () => {
    clientMouseX = -1000;
    clientMouseY = -1000;
    starsDirty = true;
});

initStars();
renderLoop();

/* Registered here rather than with the starfield's resize handler
   (js/canvas.js), which can fire before this script has loaded */
window.addEventListener('resize', recalculateCameraFocus);
