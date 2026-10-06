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
/* Apply composite background to document body to prevent canvas repaint recalculations */
document.body.style.backgroundImage = `url(${noiseCanvas.toDataURL()}), ${svgNebula}`;
document.body.style.backgroundBlendMode = 'normal, overlay';
document.body.style.backgroundSize = 'auto, cover';
document.body.style.backgroundAttachment = 'fixed';

const ctx = canvas.getContext('2d');
let stars = [];
let clientMouseX = -1000;
let clientMouseY = -1000;

function initStars() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = [];
    /* Calculate coordinate density */
    const numStars = Math.floor((canvas.width * canvas.height) / 4500); 
    
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5,
            baseAlpha: Math.random() * 0.3 + 0.20,
            /* Drift speed and twinkle phase, used while a planet is focused */
            depth: Math.random(),
            phase: Math.random() * Math.PI * 2
        });
    }
}

/* Redraw only when something visible changed: mouse moved, resize, the
   camera parallax is shifting the canvas under a stationary cursor, the
   stars are drifting, or a time-stop distortion is rippling through. */
let starsDirty = true;
let starfieldMoving = false;
canvas.addEventListener('transitionrun', (e) => {
    if (e.propertyName === 'transform') starfieldMoving = true;
});
const stopStarfieldMotion = (e) => {
    if (e.propertyName !== 'transform') return;
    starfieldMoving = false;
    starsDirty = true;
};
canvas.addEventListener('transitionend', stopStarfieldMotion);
canvas.addEventListener('transitioncancel', stopStarfieldMotion);

/* --- STAR DRIFT --- */
/* While a planet is focused, the field drifts slowly sideways and twinkles,
   like a slow camera pan behind the open window. It eases in and out, and
   runs on its own: halting time does not stop it. */
const driftReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let driftTarget = 0;  /* 0 = still, 1 = drifting */
let driftAmount = 0;  /* Eased toward driftTarget each frame */
let lastFrame = performance.now();

function setStarDrift(on) {
    driftTarget = on && !driftReducedMotion.matches ? 1 : 0;
}

/* Advance the drift; returns true while it needs a redraw every frame */
function updateDrift(now) {
    const dt = Math.min(now - lastFrame, 50);
    lastFrame = now;
    if (driftAmount === driftTarget) return driftAmount > 0;

    const ease = 1 - Math.pow(1 - 0.05, dt / (1000 / 60));
    driftAmount += (driftTarget - driftAmount) * ease;
    if (Math.abs(driftTarget - driftAmount) < 0.005) driftAmount = driftTarget;
    return true;
}

function driftStars(dt) {
    stars.forEach(star => {
        star.x -= (8 + star.depth * 14) * driftAmount * dt / 1000;
        if (star.x < -2) star.x += canvas.width + 4;
    });
}

/* --- TIME-STOP DISTORTION --- */
/* A wavefront sweeps from the click point (outward when time halts, inward
   when it resumes). Stars near the front are pushed along it, like light
   bending around a mass, and the front itself is drawn as a fading ring. */
const DISTORT_MS = 800;
let distortion = null;

function distortSpace(x, y, halting) {
    distortion = { x, y, halting, start: performance.now() };
}

/* Current wavefront, or null when no distortion is running */
function currentWave(now) {
    if (!distortion) return null;
    const p = Math.min((now - distortion.start) / DISTORT_MS, 1);
    const eased = 1 - Math.pow(1 - p, 2);
    /* Far enough to sweep past the farthest corner from the click */
    const maxRadius = Math.hypot(
        Math.max(distortion.x, canvas.width - distortion.x),
        Math.max(distortion.y, canvas.height - distortion.y)
    );
    return {
        x: distortion.x,
        y: distortion.y,
        radius: (distortion.halting ? eased : 1 - eased) * maxRadius,
        /* Push outward on halt, pull inward on resume; fades as it travels */
        push: (distortion.halting ? 1 : -1) * 26 * (1 - p),
        alpha: 1 - p,
    };
}

function renderLoop(now = performance.now()) {
    const prev = lastFrame;
    const drifting = updateDrift(now);
    if (drifting) {
        driftStars(Math.min(now - prev, 50));
        /* One last redraw once the drift has settled back to still */
        if (driftAmount === 0) starsDirty = true;
    }
    if (distortion && now - distortion.start > DISTORT_MS) {
        distortion = null;
        starsDirty = true;
    }
    /* Highlight depends on the canvas rect only while the cursor is on screen */
    const panning = starfieldMoving && clientMouseX !== -1000;
    if (starsDirty || distortion || drifting || panning) {
        starsDirty = false;
        drawStars(now);
    }
    requestAnimationFrame(renderLoop);
}

function drawStars(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const wave = currentWave(now);
    
    /* Map screen coordinates to canvas space */
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientMouseX === -1000 ? -1000 : (clientMouseX - rect.left) * (canvas.width / rect.width);
    const mouseY = clientMouseY === -1000 ? -1000 : (clientMouseY - rect.top) * (canvas.height / rect.height);
    
    ctx.fillStyle = '#fafafa';
    const radius = 150;
    const radiusSq = radius * radius;
    
    stars.forEach(star => {
        /* Soft twinkle (60–100% brightness), blended in with the drift */
        const twinkle = 0.8 + 0.2 * Math.sin(now / 900 + star.phase);
        let alpha = star.baseAlpha * (1 - driftAmount * (1 - twinkle));
        let x = star.x;
        let y = star.y;

        /* Displace stars riding the wavefront (gaussian band around its radius) */
        if (wave) {
            const wx = x - wave.x;
            const wy = y - wave.y;
            const dist = Math.hypot(wx, wy) || 1;
            const band = (dist - wave.radius) / 70;
            const shift = wave.push * Math.exp(-band * band);
            x += (wx / dist) * shift;
            y += (wy / dist) * shift;
        }
        
        /* Check if mouse is active */
        if (mouseX !== -1000) {
            let dx = mouseX - x;
            let dy = mouseY - y;
            let distSq = dx * dx + dy * dy;
            
            /* Use squared distance check for performance */
            if (distSq < radiusSq) {
                let dist = Math.sqrt(distSq);
                let intensity = 1 - (dist / radius);
                alpha = star.baseAlpha + intensity * (1 - star.baseAlpha);
            }
        }
        
        ctx.globalAlpha = alpha;
        ctx.fillRect(x - star.size, y - star.size, star.size * 2, star.size * 2);
    });

    /* The wavefront itself: a thin ring with a fainter echo just behind it */
    if (wave) {
        ctx.strokeStyle = '#fafafa';
        ctx.lineWidth = 1.5;
        [[1, 0.5], [0.93, 0.2]].forEach(([scale, opacity]) => {
            ctx.globalAlpha = opacity * wave.alpha;
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, wave.radius * scale, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
}

window.addEventListener('resize', () => {
    initStars();
    starsDirty = true;
    recalculateCameraFocus();
});

