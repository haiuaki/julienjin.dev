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

/* Leave a focused planet: close the window and pan the camera back home */
function resetCamera() {
    document.body.classList.remove('planet-focused');
    document.body.classList.remove('panel-opening');

    /* Clear sequence timers */
    uiTimeouts.forEach(clearTimeout);
    uiTimeouts = [];
    uiIntervals.forEach(clearInterval);
    uiIntervals = [];
    
    /* Clear the header text */
    const windowHeader = document.getElementById('window-header');
    if (windowHeader) windowHeader.innerHTML = '';

    document.querySelectorAll('.active-planet').forEach(el => el.classList.remove('active-planet'));

    /* Let the focused planet's orbit rejoin the others, unless time is halted */
    const releasedOrbit = focusedOrbitAnims;
    focusedOrbitAnims = [];
    if (!isPhysicsPaused) animateSpeed(1, null, releasedOrbit);

    setStarDrift(false);
    
    solarSystem.style.transition = 'margin 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
    solarSystem.style.marginLeft = '0px';
    solarSystem.style.marginTop = '0px';

    const spaceContainer = document.getElementById('space-container');
    spaceContainer.style.transform = 'translate(0px, 0px) scale(1)';

    const starfield = document.getElementById('starfield');
    if (starfield) {
        starfield.style.transform = 'translate(0px, 0px) scale(1)';
    }

    /* Clear hover states to avoid interfering with return animations */
    document.querySelectorAll('.is-hovered').forEach(el => el.classList.remove('is-hovered'));
    document.body.classList.remove('crosshairs-active');

    /* Sweep crosshairs back to origin */
    const crossX = document.getElementById('crosshair-x');
    const crossY = document.getElementById('crosshair-y');
    if (crossX && crossY && crossX.dataset.originY && crossY.dataset.originX) {
        /* Use a 1s delay on opacity so it fades out exactly as it arrives */
        crossX.style.transition = 'transform 1.0s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease-out 1s';
        crossY.style.transition = 'transform 1.0s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease-out 1s';
        
        crossX.style.transform = `translate3d(0, ${crosshairPos(+crossX.dataset.originY)}px, 0)`;
        crossY.style.transform = `translate3d(${crosshairPos(+crossY.dataset.originX)}px, 0, 0)`;
    }
}

/* Restore previous state on page load */
if (isPhysicsPaused) {
    let runningTimeMs = pauseTimestamp - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
    solarSystem.classList.add('paused');
    document.body.classList.add('time-halted');
    
    /* Force 0 playback rate if DOM parses in paused state */
    clockAnimations().forEach(anim => { anim.playbackRate = 0; });
} else {
    let runningTimeMs = Date.now() - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
}
