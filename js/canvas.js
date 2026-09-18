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
            baseAlpha: Math.random() * 0.3 + 0.20
        });
    }
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    /* Map screen coordinates to canvas space */
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientMouseX === -1000 ? -1000 : (clientMouseX - rect.left) * (canvas.width / rect.width);
    const mouseY = clientMouseY === -1000 ? -1000 : (clientMouseY - rect.top) * (canvas.height / rect.height);
    
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
        /* Draw stars using fillRect for better rendering performance */
        ctx.fillRect(star.x - star.size, star.y - star.size, star.size * 2, star.size * 2);
    });
    
    requestAnimationFrame(drawStars);
}

window.addEventListener('resize', () => {
    initStars();
    recalculateCameraFocus();
});

