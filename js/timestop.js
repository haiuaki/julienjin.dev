/* --- TIME STOP --- */
/* Clicking empty space (or the Sun) halts or resumes time. The effect radiates
   from the click point: a shockwave sweeps the starfield (js/canvas.js) while
   the orbits lurch backwards and lock still, or surge back to speed. */
const timeReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function toggleTime(x, y) {
    isManuallyPaused = !isManuallyPaused;
    sessionStorage.setItem('isManuallyPaused', isManuallyPaused);
    document.body.classList.toggle('time-halted', isManuallyPaused);

    const dramatic = !timeReducedMotion.matches;
    if (dramatic) distortSpace(x, y, isManuallyPaused);

    if (isManuallyPaused) pausePhysics(dramatic);
    else resumePhysics(dramatic);
}

/* Anywhere that is not a control or the content window. Ignored while a planet
   is focused, so reading never stops time by accident. */
document.addEventListener('click', (e) => {
    if (document.body.classList.contains('planet-focused')) return;
    if (e.target.closest('button, a, .term-window')) return;
    toggleTime(e.clientX, e.clientY);
});

/* The Sun stays as a dedicated switch; the wave starts from its center */
sunBtn.addEventListener('click', () => {
    const r = sunBtn.getBoundingClientRect();
    toggleTime(r.x + r.width / 2, r.y + r.height / 2);
});
