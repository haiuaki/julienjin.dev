function recalculateCameraFocus() {
    const activePlanet = document.querySelector('.active-planet');
    if (!activePlanet) return;
    
    const spaceContainer = document.getElementById('space-container');
    const starfield = document.getElementById('starfield');

    /* Disable transitions to apply styles immediately */
    spaceContainer.style.transition = 'none';
    if (starfield) starfield.style.transition = 'none';

    /* Remove camera transform to read raw element coordinates */
    spaceContainer.style.transform = 'none';
    void spaceContainer.offsetWidth; /* Force layout reflow */

    /* Read element coordinates relative to the viewport */
    const rect = activePlanet.getBoundingClientRect();
    const planetX = rect.x + rect.width / 2;
    const planetY = rect.y + rect.height / 2;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const targetX = 64;
    const targetY = 58;

    const dx = targetX - planetX;
    const dy = targetY - planetY;

    /* Apply new translation coordinates without scaling */
    spaceContainer.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
    if (starfield) starfield.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px) scale(1)`;
    void spaceContainer.offsetWidth; /* Force reflow */

    /* Restore camera transition styles */
    spaceContainer.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';
    if (starfield) starfield.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.5, 1)';

    /* Update the crosshair origins so they return to the correctly resized center */
    const crossX = document.getElementById('crosshair-x');
    const crossY = document.getElementById('crosshair-y');
    if (crossX && crossY) {
        crossX.dataset.originY = planetY;
        crossY.dataset.originX = planetX;
        /* Snap crosshairs to the target position after camera recalculation */
        crossX.style.transform = `translate3d(0, ${targetY}px, 0)`;
        crossY.style.transform = `translate3d(${targetX}px, 0, 0)`;
    }
}
window.addEventListener('mousemove', (e) => {
    /* Store screen coordinates for render loop */
    clientMouseX = e.clientX;
    clientMouseY = e.clientY;
});
window.addEventListener('mouseout', () => {
    clientMouseX = -1000;
    clientMouseY = -1000;
});

initStars();
drawStars();


