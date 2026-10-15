/* --- TIME STOP --- */
/* The time switch (bottom of the screen) halts or resumes every motion on the
   page: the orbits and the star drift behind open windows. Clicking empty
   space or the star does the same. The effect radiates from where it was
   triggered: a shockwave sweeps the starfield (js/canvas.js) while the orbits
   lurch backwards and lock still, or surge back to speed. */
const timeReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const timeSwitch = document.getElementById('time-switch');
const timeAnnouncer = document.getElementById('time-announcer');

function toggleTime(x, y) {
    isManuallyPaused = !isManuallyPaused;
    sessionStorage.setItem('isManuallyPaused', isManuallyPaused);
    document.body.classList.toggle('time-halted', isManuallyPaused);
    timeAnnouncer.textContent = isManuallyPaused ? 'Time halted. Animations paused.' : 'Time resumed.';
    updateStarDrift();

    /* Calm while reading: no shockwave behind an open window */
    const dramatic = !timeReducedMotion.matches && !document.body.classList.contains('planet-focused');
    if (dramatic) distortSpace(x, y, isManuallyPaused);

    if (isManuallyPaused) pausePhysics(dramatic);
    else resumePhysics(dramatic);
}

const centerOf = (el) => {
    const r = el.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
};

timeSwitch.addEventListener('click', () => toggleTime(...centerOf(timeSwitch)));

/* Anywhere that is not a control or the content window. Ignored while a planet
   is focused, so reading never stops time by accident. */
document.addEventListener('click', (e) => {
    if (document.body.classList.contains('planet-focused')) return;
    if (e.target.closest('button, a, .term-window')) return;
    toggleTime(e.clientX, e.clientY);
});

/* The star: a pointer shortcut; the wave starts from its center */
sunBtn.addEventListener('click', () => toggleTime(...centerOf(sunBtn)));
