/* --- 0. PREVENT NATIVE ZOOM & GESTURES --- */
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

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


/* --- 2. TYPEWRITER EFFECT --- */
const brandLogo = document.getElementById('brand-logo');
if (brandLogo) {
    const textToType = brandLogo.getAttribute('data-text');
    const cursorChar = brandLogo.getAttribute('data-cursor') || '_';
    
    if (textToType) {
        let typeIndex = 0;
        
        /* Initialize empty bracket state with cursor */
        brandLogo.innerHTML = `[<span class="terminal-cursor">${cursorChar}</span>]`;
        
        /* Delay typing to align with initial load transition */
        setTimeout(() => {
            const typingInterval = setInterval(() => {
                if (typeIndex < textToType.length) {
                    /* Slice string and append cursor within brackets */
                    brandLogo.innerHTML = `[${textToType.substring(0, typeIndex + 1)}<span class="terminal-cursor">${cursorChar}</span>]`;
                    typeIndex++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 60); /* Keystroke interval */
        }, 1500); /* Initial delay */
    }
}


/* --- 3. BACKGROUND CANVAS --- */
const canvas = document.createElement('canvas');
canvas.id = 'starfield';
document.body.insertBefore(canvas, document.body.firstChild);

/* Generate static pixel noise tile */
const noiseCanvas = document.createElement('canvas');
noiseCanvas.width = 256; 
noiseCanvas.height = 256;
const noiseCtx = noiseCanvas.getContext('2d');
const idata = noiseCtx.createImageData(256, 256);
const buffer32 = new Uint32Array(idata.data.buffer);
for (let i = 0; i < buffer32.length; i++) {
    /* Pixel rendering probability condition */
    if (Math.random() < 0.25) {
        /* Constrain grayscale bounds to background color delta */
        const gray = 20 + (Math.random() * 12) | 0;
        /* Assign ABGR buffer value */
        buffer32[i] = (255 << 24) | (gray << 16) | (gray << 8) | gray;
    } else {
        buffer32[i] = 0; /* Fully transparent */
    }
}
noiseCtx.putImageData(idata, 0, 0);

/* Generate organic low-frequency grayscale SVG nebula clouds */
const svgNebula = `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.005' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.10'/%3E%3C/svg%3E")`;

/* Assign composite background rendering properties */
canvas.style.backgroundImage = `url(${noiseCanvas.toDataURL()}), ${svgNebula}`;
canvas.style.backgroundBlendMode = 'normal, overlay';
canvas.style.backgroundSize = 'auto, cover';

const ctx = canvas.getContext('2d');
let stars = [];
let mouseX = -1000;
let mouseY = -1000;

function initStars() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = [];
    /* Calculate coordinate density */
    const numStars = Math.floor((canvas.width * canvas.height) / 6000); 
    
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            baseAlpha: Math.random() * 0.3 + 0.20
        });
    }
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        let dx = mouseX - star.x;
        let dy = mouseY - star.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        let alpha = star.baseAlpha;
        const radius = 150;
        
        if (dist < radius) {
            let intensity = 1 - (dist / radius);
            alpha = star.baseAlpha + intensity * (1 - star.baseAlpha);
        }
        
        ctx.fillStyle = `rgba(250, 250, 250, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    requestAnimationFrame(drawStars);
}

window.addEventListener('resize', initStars);
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
window.addEventListener('mouseout', () => {
    mouseX = -1000;
    mouseY = -1000;
});

initStars();
drawStars();


/* --- 4. PROGRESSIVE BRAKING ENGINE (WAAPI) --- */
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
    
    /* Reset camera pan if a planet was focused */
    document.body.classList.remove('planet-focused');
    document.querySelectorAll('.active-planet').forEach(el => el.classList.remove('active-planet'));
    
    if (window.transitionTimer) clearTimeout(window.transitionTimer);
    document.querySelectorAll('.void-transition').forEach(el => el.classList.remove('void-transition'));
    
    solarSystem.style.transition = 'margin 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
    solarSystem.style.marginLeft = '0px';
    solarSystem.style.marginTop = '0px';

    const spaceContainer = document.getElementById('space-container');
    spaceContainer.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
    spaceContainer.style.transform = 'scale(1)';

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


/* --- 5. DYNAMIC LABEL POSITIONING --- */
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

    
/* --- 6. CAMERA FOCUS ENGINE --- */
    planet.addEventListener('click', (e) => {
        e.preventDefault();
        if (document.body.classList.contains('planet-focused')) return;

        /* Isolate this specific planet and label for the CSS dimming effect */
        planet.classList.add('active-planet');
        floatingLabel.classList.add('active-planet');

        /* Trigger the void transition state after camera panning completes (1.5s) */
        window.transitionTimer = setTimeout(() => {
            planet.classList.add('void-transition');
        }, 1500);

        /* Instantly freeze the system to prevent orbital drift during focus */
        isManuallyPaused = true;
        sessionStorage.setItem('isManuallyPaused', 'true');
        isPhysicsPaused = true;
        solarSystem.classList.add('paused');
        document.getAnimations().forEach(anim => {
            if (anim.animationName === 'master-spin' || anim.animationName === 'master-anti-spin') {
                anim.playbackRate = 0;
            }
        });

        /* Calculate spatial translation offset to center the target element */
        const rect = planet.getBoundingClientRect();
        const planetX = rect.x + rect.width / 2;
        const planetY = rect.y + rect.height / 2;
        
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        
        const dx = screenCenterX - planetX;
        const dy = screenCenterY - planetY;
        
        /* Apply 2D margin translation to the 3D container */
        solarSystem.style.transition = 'margin 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
        
        const currentMarginLeft = parseFloat(getComputedStyle(solarSystem).marginLeft) || 0;
        const currentMarginTop = parseFloat(getComputedStyle(solarSystem).marginTop) || 0;
        
        solarSystem.style.marginLeft = (currentMarginLeft + dx) + 'px';
        solarSystem.style.marginTop = (currentMarginTop + dy) + 'px';

        /* Apply a scale transformation to the root container */
        const spaceContainer = document.getElementById('space-container');
        spaceContainer.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
        spaceContainer.style.transform = 'scale(1.3)';

        /* Update UI state for SPA content injection */
        document.body.classList.add('planet-focused');
    });
});
