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

planetBtns.forEach(planet => {
    /* Retrieve label string from dataset */
    const labelText = planet.getAttribute('data-label');
    if (!labelText) return;

    /* Generate a dedicated 2D screenspace label for this planet */
    const floatingLabel = document.createElement('div');
    floatingLabel.className = 'planet-label';
    floatingLabel.textContent = labelText;
    document.body.appendChild(floatingLabel);
    
    /* Sync 2D label coordinates with 3D planet bounding box */
    const trackPosition = () => {
        const rect = planet.getBoundingClientRect();
        const planetX = rect.x + rect.width / 2;
        const planetY = rect.y + rect.height / 2;
        
        /* Calculate true physical center of the solar system (The Sun) */
        const sunRect = sunBtn.getBoundingClientRect();
        const centerX = sunRect.x + sunRect.width / 2;
        const centerY = sunRect.y + sunRect.height / 2;

        /* Calculate normalized vector from Sun to Planet */
        let dx = planetX - centerX;
        let dy = planetY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            dx /= dist;
            dy /= dist;
        }

        /* Dynamically shift text bounding box anchor based on orbital vector to prevent collision */
        const xPercent = (dx * 50) - 50;
        const yPercent = (dy * 50) - 50;
        
        /* Push the label 15px outward along the vector */
        const LABEL_OFFSET = 15;
        floatingLabel.style.left = (planetX + dx * LABEL_OFFSET) + 'px';
        floatingLabel.style.top = (planetY + dy * LABEL_OFFSET) + 'px';
        floatingLabel.style.transform = `translate(${xPercent}%, ${yPercent}%)`;

        requestAnimationFrame(trackPosition);
    };
    
    /* Permanently lock the tracking engine for this label */
    trackPosition();
});
