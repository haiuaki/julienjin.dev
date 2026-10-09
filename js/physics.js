let speedTransition;

/* Every animation driven by the orbit clock: rings and planets */
const CLOCK_ANIMATIONS = ['master-spin', 'master-anti-spin'];

function clockAnimations() {
    return document.getAnimations().filter(anim =>
        CLOCK_ANIMATIONS.includes(anim.animationName) && !focusedOrbitAnims.includes(anim)
    );
}

/* Ease clock animations (all by default) to targetSpeed, then call onDone.
   Time-based (7% of the remaining gap per 60Hz frame) so it feels the same
   on 60Hz and 120Hz displays. */
function animateSpeed(targetSpeed, onDone, animations = clockAnimations()) {
    cancelAnimationFrame(speedTransition);
    let last = performance.now();
    
    function step(now = last) {
        const ease = 1 - Math.pow(1 - 0.07, (now - last) / (1000 / 60));
        last = now;
        let allDone = true;
        animations.forEach(anim => {
            const currentSpeed = anim.playbackRate;
            const diff = targetSpeed - currentSpeed;
            
            /* Snap to target if delta is within threshold */
            if (Math.abs(diff) < 0.05) {
                anim.playbackRate = targetSpeed;
            } else {
                /* Apply ease-out deceleration to target speed */
                anim.playbackRate = currentSpeed + (diff * ease);
                allDone = false;
            }
        });
        
        if (!allDone) {
            speedTransition = requestAnimationFrame(step);
        } else if (onDone) {
            onDone();
        }
    }
    step();
}

/* Abstracted Physics Controls */
/* dramatic: time lurches backwards for a moment before locking still */
function pausePhysics(dramatic = false) {
    if (isPhysicsPaused) return;
    pauseTimestamp = Date.now();
    sessionStorage.setItem('pauseTimestamp', pauseTimestamp);
    solarSystem.classList.add('paused');
    isPhysicsPaused = true;

    if (dramatic) {
        cancelAnimationFrame(speedTransition);
        clockAnimations().forEach(anim => { anim.playbackRate = -0.5; });
    }

    /* Trigger WAAPI deceleration */
    animateSpeed(0);
}

/* dramatic: time surges past full speed before settling */
function resumePhysics(dramatic = false) {
    if (!isPhysicsPaused) return;
    let pauseDuration = Date.now() - pauseTimestamp;
    systemEpoch += pauseDuration;
    sessionStorage.setItem('systemEpoch', systemEpoch);
    solarSystem.classList.remove('paused');
    isPhysicsPaused = false;

    /* Trigger WAAPI acceleration */
    if (dramatic) animateSpeed(1.6, () => animateSpeed(1));
    else animateSpeed(1);
}

/* Astre labels wait for the camera to settle on the way home: during the pan
   their astres come in from off-screen, and the labels (kept on screen) would
   gather at the edge before catching up. Not needed when the camera cuts. */
let labelSettleTimer = null;

/* Leave a focused planet: close the window and pan the camera back home */
function resetCamera() {
    syncRoute(null, null);
    const returningPlanet = document.querySelector('.astre-btn.active-planet');

    /* Keep the crosshairs locked on the astre as it travels home: the tracking
       loop in js/ui.js drives their position each frame, so only opacity
       transitions here (holding, then fading out as it arrives). Set before
       leaving the focused state: any style update in between would otherwise
       start their fade-out with the quick hover fade (seen on phones). */
    const crossX = document.getElementById('crosshair-x');
    const crossY = document.getElementById('crosshair-y');
    if (crossX && crossY && returningPlanet) {
        crossX.style.transition = 'opacity 0.35s ease-out 0.6s';
        crossY.style.transition = 'opacity 0.35s ease-out 0.6s';
    }

    document.body.classList.remove('planet-focused');
    closeAllWindows();
    closeMenu();

    /* Clear sequence timers */
    uiTimeouts.forEach(clearTimeout);
    uiTimeouts = [];

    document.querySelectorAll('.active-planet').forEach(el => el.classList.remove('active-planet'));

    /* Astres back in the tab order; keyboard users land back on the astre */
    const fromHomeLabel = document.activeElement === document.getElementById('home-label');
    setAstresHidden(false);
    breakCrosshair(false);
    if (fromHomeLabel && returningPlanet) returningPlanet.focus({ preventScroll: true });

    /* Let the focused planet's orbit rejoin the others, unless time is halted */
    const releasedOrbit = focusedOrbitAnims;
    focusedOrbitAnims = [];
    if (!isPhysicsPaused) animateSpeed(1, null, releasedOrbit);

    setStarDrift(false);

    /* The home window fades back in as the camera finishes its return */
    uiTimeouts.push(setTimeout(openHome, HOME_RETURN_MS));
    
    /* Reduced motion: a cut instead of the pan (js/camera.js) */
    const panMs = panDuration(RETURN_PAN_MS);
    cutScene(false);
    clearTimeout(labelSettleTimer);
    if (panMs) {
        document.body.classList.add('labels-settling');
        labelSettleTimer = setTimeout(() => document.body.classList.remove('labels-settling'), HOME_RETURN_MS);
    }
    solarSystem.style.transition = `margin ${panMs}ms ${CAMERA_EASE}`;
    solarSystem.style.marginLeft = '0px';
    solarSystem.style.marginTop = '0px';

    const spaceContainer = document.getElementById('space-container');
    spaceContainer.style.transition = `transform ${panMs}ms ${CAMERA_EASE}`;
    spaceContainer.style.transform = 'translate(0px, 0px) scale(1)';

    const starfield = document.getElementById('starfield');
    if (starfield) {
        starfield.style.transition = `transform ${panMs}ms ${CAMERA_EASE}`;
        starfield.style.transform = 'translate(0px, 0px) scale(1)';
    }

    /* Clear hover states to avoid interfering with return animations */
    document.querySelectorAll('.is-hovered').forEach(el => el.classList.remove('is-hovered'));
    document.body.classList.remove('crosshairs-active');

    if (crossX && crossY && returningPlanet) startReturnSweep(returningPlanet);
}

/* Restore previous state on page load */
if (isPhysicsPaused) {
    let runningTimeMs = pauseTimestamp - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
    solarSystem.classList.add('paused');
    document.body.classList.add('time-halted');
    
    /* Force 0 playback rate if DOM parses in paused state */
    clockAnimations().forEach(anim => { anim.playbackRate = 0; });
} else if (!document.documentElement.style.getPropertyValue('--system-time')) {
    /* Usually already set before the first paint (index.html <head>); setting
       it again now would push every orbit ahead by the page's load time */
    let runningTimeMs = Date.now() - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
}
/* The orbits were held still by CSS until now (index.html <head>); the
   playback rate holds them from here */
document.documentElement.classList.remove('halted-at-load');
