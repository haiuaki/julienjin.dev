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

    const screenCenterX = layoutWidth() / 2;
    const screenCenterY = layoutHeight() / 2;

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

    placeHomeLabel();

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

/* --- FIT THE SYSTEM ON SCREEN --- */
/* The orbits are sized in vmin, then the whole system is scaled. Fixed
   screen-size steps (style.css) picked that scale, but zooming changes the
   page's pixel size and unusual proportions fall between the steps, so the
   outer orbits could run off the screen and take their astres (the
   navigation) with them. Here the four main orbits are measured, with the real
   3D perspective, and the system keeps the step's scale (the approved look
   for each screen) unless that would put them outside the free area of the
   screen; then it shrinks just enough. The decorative comet orbits may still
   run off the edges. The CSS steps stay as the first-paint value (and
   without JavaScript). */
const ORBIT_SIDE_ROOM = 8;      /* orbits may reach nearly the screen's sides (labels are kept on screen) */
const ORBIT_LABEL_ROOM = 26;    /* above and below: room for an astre's label */
const PHONE_MENU_ROOM = 84;     /* phones: the collapsed home menu at the bottom (16px + its bar), and a gap */

/* Invisible points around each main orbit, read for its on-screen extent */
const orbitProbes = [];
document.querySelectorAll('#main-nav .orbit-ring:not([class*="comet-"])').forEach(ring => {
    for (let i = 0; i < 24; i++) {
        const probe = document.createElement('i');
        probe.className = 'orbit-probe';
        const a = (i / 24) * Math.PI * 2;
        probe.style.left = `${50 + 50 * Math.cos(a)}%`;
        probe.style.top = `${50 + 50 * Math.sin(a)}%`;
        ring.appendChild(probe);
    }
    orbitProbes.push(...ring.querySelectorAll('.orbit-probe'));
});

/* The free area for the orbits, in the page's own coordinates */
function orbitRoom() {
    const w = layoutWidth(), h = document.getElementById('space-container').offsetHeight;
    const top = (compactLayout.matches ? 46 : 12) + ORBIT_LABEL_ROOM;            /* below the phone time switch */
    const bottom = h - (compactLayout.matches ? PHONE_MENU_ROOM : 40) - ORBIT_LABEL_ROOM; /* above the menu / switch */
    return { left: ORBIT_SIDE_ROOM, right: w - ORBIT_SIDE_ROOM, top, bottom };
}

function fitSystem() {
    const root = document.documentElement;
    const container = document.getElementById('space-container');
    const styles = getComputedStyle(root);
    /* The system's centre, from the layout (unaffected by the camera's pan) */
    const cx = container.offsetWidth * parseFloat(styles.getPropertyValue('--system-x')) / 100;
    const cy = container.offsetHeight * parseFloat(styles.getPropertyValue('--system-y')) / 100;
    const room = orbitRoom();
    /* The step's scale for this screen (style.css), as the starting point and the limit */
    root.style.removeProperty('--system-scale');
    const stepScale = parseFloat(getComputedStyle(root).getPropertyValue('--system-scale'));
    /* Three passes: the perspective makes the extent not quite proportional to the scale */
    for (let pass = 0; pass < 3; pass++) {
        const scale = parseFloat(getComputedStyle(root).getPropertyValue('--system-scale'));
        const sun = sunBtn.getBoundingClientRect();
        const sx = sun.x + sun.width / 2, sy = sun.y + sun.height / 2;
        let left = 0, right = 0, up = 0, down = 0;
        orbitProbes.forEach(probe => {
            const p = probe.getBoundingClientRect();
            left = Math.max(left, sx - p.x);
            right = Math.max(right, p.x - sx);
            up = Math.max(up, sy - p.y);
            down = Math.max(down, p.y - sy);
        });
        if (!left || !up) return; /* not laid out yet */
        const fit = Math.min((cx - room.left) / left, (room.right - cx) / right, (cy - room.top) / up, (room.bottom - cy) / down);
        root.style.setProperty('--system-scale', Math.min(stepScale, scale * fit).toFixed(3));
    }
    /* When it had to shrink, 1.5% spare: the probes spin with their orbit,
       so the measured extreme shifts slightly from one moment to the next */
    const fitted = parseFloat(root.style.getPropertyValue('--system-scale'));
    if (fitted < stepScale) root.style.setProperty('--system-scale', (fitted * 0.985).toFixed(3));
}

fitSystem();

/* Registered here rather than with the starfield's resize handler
   (js/canvas.js), which can fire before this script has loaded. The system
   is refitted first, then the camera follows it. */
onLayoutResize(() => {
    fitSystem();
    recalculateCameraFocus();
});
