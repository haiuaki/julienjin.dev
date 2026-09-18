let speedTransition;
function animateSpeed(targetSpeed) {
    cancelAnimationFrame(speedTransition);
    
    /* Filter active animations to orbital physics only */
    const animations = document.getAnimations().filter(anim => 
        anim.animationName === 'master-spin' || anim.animationName === 'master-anti-spin'
    );
    
    function step() {
        let allDone = true;
        animations.forEach(anim => {
            const currentSpeed = anim.playbackRate;
            const diff = targetSpeed - currentSpeed;
            
            /* Snap to target if delta is within threshold */
            if (Math.abs(diff) < 0.05) {
                anim.playbackRate = targetSpeed;
            } else {
                /* Apply ease-out deceleration to target speed */
                anim.playbackRate = currentSpeed + (diff * 0.07);
                allDone = false;
            }
        });
        
        if (!allDone) {
            speedTransition = requestAnimationFrame(step);
        }
    }
    step();
}

/* Abstracted Physics Controls */
function pausePhysics() {
    if (isPhysicsPaused) return;
    pauseTimestamp = Date.now();
    sessionStorage.setItem('pauseTimestamp', pauseTimestamp);
    solarSystem.classList.add('paused');
    isPhysicsPaused = true;
    
    /* Trigger WAAPI deceleration */
    animateSpeed(0);
}

function resetCamera() {
    /* Reset camera pan if a planet was focused */
    document.body.classList.remove('planet-focused');
    document.querySelectorAll('.active-planet').forEach(el => el.classList.remove('active-planet'));
    
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
        crossX.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease-out 1s';
        crossY.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease-out 1s';
        
        crossX.style.transform = `translate3d(0, ${crossX.dataset.originY}px, 0)`;
        crossY.style.transform = `translate3d(${crossY.dataset.originX}px, 0, 0)`;
    }
}

function resumePhysics() {
    if (!isPhysicsPaused) return;
    let pauseDuration = Date.now() - pauseTimestamp;
    systemEpoch += pauseDuration;
    sessionStorage.setItem('systemEpoch', systemEpoch);
    solarSystem.classList.remove('paused');
    isPhysicsPaused = false;
    
    resetCamera();

    /* Trigger WAAPI acceleration */
    animateSpeed(1);
}

/* Restore previous state on page load */
if (isPhysicsPaused) {
    let runningTimeMs = pauseTimestamp - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
    solarSystem.classList.add('paused');
    
    /* Force 0 playback rate if DOM parses in paused state */
    document.getAnimations().forEach(anim => {
        if (anim.animationName === 'master-spin' || anim.animationName === 'master-anti-spin') {
            anim.playbackRate = 0;
        }
    });
} else {
    let runningTimeMs = Date.now() - systemEpoch;
    document.documentElement.style.setProperty('--system-time', `-${runningTimeMs}ms`);
}

/* Manual Sun Button Toggle */
sunBtn.addEventListener('click', function() {
    isManuallyPaused = !isManuallyPaused;
    sessionStorage.setItem('isManuallyPaused', isManuallyPaused);
    
    if (isManuallyPaused) pausePhysics();
    else resumePhysics();
});


