/* --- 1. PHYSICS ENGINE INITIALIZATION --- */
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

/* --- 2. PROGRESSIVE BRAKING ENGINE (WAAPI) --- */
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

function resumePhysics() {
    if (!isPhysicsPaused) return;
    let pauseDuration = Date.now() - pauseTimestamp;
    systemEpoch += pauseDuration;
    sessionStorage.setItem('systemEpoch', systemEpoch);
    solarSystem.classList.remove('paused');
    isPhysicsPaused = false;
    
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

/* --- 3. DYNAMIC LABEL POSITIONING --- */
const planetBtns = document.querySelectorAll('.planet-btn');
const floatingLabel = document.getElementById('floating-label');

planetBtns.forEach(planet => {
    let trackingFrame;

    planet.addEventListener('mouseenter', () => {
        /* Retrieve label string from dataset */
        const labelText = planet.getAttribute('data-label');
        if (!labelText) return;

        floatingLabel.textContent = labelText;
        
        /* Sync 2D label coordinates with 3D planet bounding box */
        const trackPosition = () => {
            const rect = planet.getBoundingClientRect();
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            /* Center anchor point */
            floatingLabel.style.left = (rect.x + rect.width / 2) + 'px';
            floatingLabel.style.top = (rect.y + rect.height / 2) + 'px';

            let quadrantClass = '';
            if (rect.y < centerY) {
                quadrantClass = (rect.x < centerX) ? 'top-left' : 'top-right';
            } else {
                quadrantClass = (rect.x < centerX) ? 'bottom-left' : 'bottom-right';
            }

            /* Inject quadrant class and render visibility */
            floatingLabel.className = `planet-label visible ${quadrantClass}`;

            trackingFrame = requestAnimationFrame(trackPosition);
        };
        trackPosition();
    });

    planet.addEventListener('mouseleave', () => {
        /* Terminate tracking loop and hide label */
        cancelAnimationFrame(trackingFrame);
        floatingLabel.classList.remove('visible');
    });
});
