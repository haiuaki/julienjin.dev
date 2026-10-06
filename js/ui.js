const astreBtns = document.querySelectorAll('.astre-btn');
const crossX = document.getElementById('crosshair-x');
const crossY = document.getElementById('crosshair-y');

/* Planet/label pairs updated by the single shared rAF loop */
const trackers = [];
/* Labels finish fading out 1.5s after focus (0.3s delay + 1.2s fade); stop tracking after that */
const LABEL_FADE_MS = 800;
let labelsHiddenAt = Infinity;

/* Crosshair return after leaving a planet: the astre starts in the corner,
   right under the crosshairs, so they simply stay locked on its live position
   as the camera carries it home and its orbit starts moving again, until
   they have faded out */
const RETURN_FADE_END_MS = 950; /* matches the delayed opacity fade in resetCamera() */
let returnSweep = null;

function startReturnSweep(planet) {
    returnSweep = { planet, t0: performance.now() };
}

astreBtns.forEach(planet => {
    /* Retrieve label string from dataset */
    const labelText = planet.getAttribute('data-label');
    if (!labelText) return;

    /* Generate a dedicated 2D screenspace label for this planet */
    const floatingLabel = document.createElement('div');
    floatingLabel.className = 'planet-label';
    floatingLabel.textContent = labelText;
    document.body.appendChild(floatingLabel);
    
    /* Hover triggers for dynamic crosshair tracking */
    planet.addEventListener('mouseenter', () => {
        if (!document.body.classList.contains('planet-focused')) {
            /* Hovering takes the crosshairs over from a return sweep */
            returnSweep = null;
            planet.classList.add('is-hovered');
            document.body.classList.add('crosshairs-active');

            /* Set transition styles once on hover */
            if (crossX && crossY) {
                crossX.style.transition = 'opacity 0.2s ease-out';
                crossY.style.transition = 'opacity 0.2s ease-out';
            }
        }
    });

    planet.addEventListener('mouseleave', () => {
        planet.classList.remove('is-hovered');
        if (!document.body.classList.contains('planet-focused')) {
            document.body.classList.remove('crosshairs-active');
        }
    });

    /* Register with the shared tracking loop (see trackAllPositions below) */
    trackers.push({ planet, label: floatingLabel });

    
    planet.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (document.body.classList.contains('planet-focused')) {
            if (planet.classList.contains('active-planet')) {
                resetCamera();
            }
            return;
        }

        /* Isolate this specific planet and label for the CSS dimming effect */
        planet.classList.add('active-planet');
        floatingLabel.classList.add('active-planet');

        /* Freeze only this planet's orbit so it holds still in the corner. The rest
           of the system is faded out, and time itself keeps running: focusing a
           planet is not a time stop. */
        const orbit = planet.closest('.orbit-ring');
        focusedOrbitAnims = [...orbit.getAnimations(), ...planet.getAnimations()].filter(anim =>
            CLOCK_ANIMATIONS.includes(anim.animationName)
        );
        focusedOrbitAnims.forEach(anim => { anim.playbackRate = 0; });
        /* Restart any speed easing in progress without the frozen orbit */
        animateSpeed(isPhysicsPaused ? 0 : 1);

        /* The starfield drifts behind the open window */
        setStarDrift(true);

        /* Calculate perspective scale to maintain uniform visual size */
        const rect = planet.getBoundingClientRect();
        const perspectiveScale = rect.width / planet.offsetWidth;

        /* Calculate 2.2vmin in actual pixels — planet's focused visual size,
           independent of the cursor block (corner elements) geometry. */
        const vminPx = Math.min(window.innerWidth, window.innerHeight) / 100;
        const visualTarget = 2.2 * vminPx;
        
        const targetPhysicalSize = visualTarget / perspectiveScale;
        
        planet.style.setProperty('--active-planet-size', `${targetPhysicalSize}px`);
        planet.style.setProperty('--active-planet-offset', `-${targetPhysicalSize / 2}px`);

        /* Calculate translation vectors for camera focus */
        const planetX = rect.x + rect.width / 2;
        const planetY = rect.y + rect.height / 2;
        
        /* Define target screen coordinates */
        const targetX = FOCUS_TARGET_X;
        const targetY = FOCUS_TARGET_Y;

        /* Calculate delta vector */
        const dx = targetX - planetX;
        const dy = targetY - planetY;

        /* Reset container margins */
        solarSystem.style.transition = `margin ${FOCUS_PAN_MS}ms ${CAMERA_EASE}`;
        solarSystem.style.marginLeft = '0px';
        solarSystem.style.marginTop = '0px';

        /* Apply transforms to space container */
        const spaceContainer = document.getElementById('space-container');
        spaceContainer.style.transition = `transform ${FOCUS_PAN_MS}ms ${CAMERA_EASE}`;
        spaceContainer.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;

        /* Apply fractional translation to starfield for parallax effect */
        const starfield = document.getElementById('starfield');
        if (starfield) {
            /* Same duration as the pan, so the parallax doesn't trail behind it */
            starfield.style.transition = `transform ${FOCUS_PAN_MS}ms ${CAMERA_EASE}`;
            starfield.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px) scale(1)`;
        }

        /* Set crosshair positions and sweep them to the target coordinates */
        if (crossX && crossY) {
            /* Disable crosshair active class (opacity is inherited by planet-focused) */
            document.body.classList.remove('crosshairs-active');

            crossX.style.transform = `translate3d(0, ${crosshairPos(planetY)}px, 0)`;
            crossY.style.transform = `translate3d(${crosshairPos(planetX)}px, 0, 0)`;

            void crossX.offsetWidth; /* Force synchronous layout recalculation */

            crossX.style.transition = `transform ${FOCUS_PAN_MS}ms ${CAMERA_EASE}, opacity 0.2s ease-out`;
            crossY.style.transition = `transform ${FOCUS_PAN_MS}ms ${CAMERA_EASE}, opacity 0.2s ease-out`;
            crossX.style.transform = `translate3d(0, ${crosshairPos(targetY)}px, 0)`;
            crossY.style.transform = `translate3d(${crosshairPos(targetX)}px, 0, 0)`;
        }


        /* Update body class for focus state */
        document.body.classList.add('planet-focused');

        /* Typewriter sequence */
        closeAllWindows();
        closeMenu();

        /* "[projects]" -> "PROJECTS": the window frame now encloses the title */
        const rawLabel = planet.getAttribute('data-label') || 'DATA';
        const labelText = rawLabel.replace(/^\[(.*)\]$/, '$1').toUpperCase();
        const menuId = planet.dataset.menu;

        /* Clear existing sequence timers */
        uiTimeouts.forEach(clearTimeout);
        uiTimeouts = [];

        /* Open the window as the camera settles */
        let t1 = setTimeout(() => {
            if (menuId) {
                /* Hand over to the menu module (index window + reader) */
                openMenu(menuId, labelText);
            } else {
                /* Standard behavior: open the main window with the planet label */
                openWindow(document.getElementById('content-window'), labelText);
            }
        }, WINDOW_OPEN_MS);
        uiTimeouts.push(t1);

    });
});

/* Single tracking loop for every planet label and the hover crosshairs.
   All layout reads happen first, then all style writes, so the browser
   computes layout at most once per frame instead of once per planet. */
function trackAllPositions(now) {
    requestAnimationFrame(trackAllPositions);

    const focused = document.body.classList.contains('planet-focused');
    if (!focused) labelsHiddenAt = Infinity;
    else if (labelsHiddenAt === Infinity) labelsHiddenAt = now + LABEL_FADE_MS;
    /* Labels are fully invisible: skip all work until focus is released */
    if (now > labelsHiddenAt) return;

    /* --- Read phase --- */
    /* Calculate true physical center of the solar system (The Sun) */
    const sunRect = sunBtn.getBoundingClientRect();
    const centerX = sunRect.x + sunRect.width / 2;
    const centerY = sunRect.y + sunRect.height / 2;
    const rects = trackers.map(t => t.planet.getBoundingClientRect());

    /* --- Write phase --- */
    trackers.forEach((t, i) => {
        const rect = rects[i];
        const planetX = rect.x + rect.width / 2;
        const planetY = rect.y + rect.height / 2;

        /* Calculate normalized vector from Sun to Planet */
        let dx = planetX - centerX;
        let dy = planetY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            dx /= dist;
            dy /= dist;
        }

        /* Shift label anchor based on orbital vector */
        const xPercent = (dx * 50) - 50;
        const yPercent = (dy * 50) - 50;

        /* Derive offset from the planet's actual rendered screen-space radius.
           On large/4K displays the perspective depth effect makes near-planets
           visually bigger, so the offset grows with them and never overlaps. */
        const screenRadius = Math.max(rect.width, rect.height) / 2;
        const LABEL_OFFSET = screenRadius + 8;
        /* Drive position exclusively via transform — no left/top writes (same as crosshairs) */
        t.label.style.transform = `translate3d(${planetX + dx * LABEL_OFFSET}px, ${planetY + dy * LABEL_OFFSET}px, 0) translate(${xPercent}%, ${yPercent}%)`;

        /* Return: stay locked on the astre as it travels home, until faded */
        if (!focused && returnSweep && returnSweep.planet === t.planet && crossX && crossY) {
            crossX.style.transform = `translate3d(0, ${crosshairPos(planetY)}px, 0)`;
            crossY.style.transform = `translate3d(${crosshairPos(planetX)}px, 0, 0)`;
            if (now - returnSweep.t0 > RETURN_FADE_END_MS) returnSweep = null;
        }

        /* Dynamically update crosshairs if hovered */
        if (!focused && crossX && crossY && t.planet.classList.contains('is-hovered')) {
            crossX.style.transform = `translate3d(0, ${crosshairPos(planetY)}px, 0)`;
            crossY.style.transform = `translate3d(${crosshairPos(planetX)}px, 0, 0)`;
        }
    });
}
requestAnimationFrame(trackAllPositions);

/* --- TERMINAL WINDOWS --- */
/* Each .term-window types its header, drops the cursor to a new line, then
   splits that cursor block into its 4-corner frame (.is-open). Timers are kept
   per window so the index and the reader can animate independently. */
const windowTimers = new Map();

const TYPE_INTERVAL = 60; /* Keystroke interval */
const TYPE_HOLD = 300;    /* Pause before the cursor drops / the frame opens */

function clearWindowTimers(win) {
    /* Timeout and interval ids share one pool, so clearTimeout cancels both */
    (windowTimers.get(win) || []).forEach(clearTimeout);
    windowTimers.set(win, []);
}

/* Type text into a window's header, then run onDone */
function typeHeader(win, text, onDone) {
    const header = win.querySelector('.window-header');
    const timers = windowTimers.get(win);
    let typeIndex = 0;
    const typing = setInterval(() => {
        if (typeIndex < text.length) {
            header.textContent = `${text.substring(0, typeIndex + 1)}█`;
            typeIndex++;
            return;
        }
        clearInterval(typing);
        onDone(header);
    }, TYPE_INTERVAL);
    timers.push(typing);
}

/* Decode effect for flicker windows: letters lock in left to right out of
   random glyphs, then the header settles on the label. Only letters scramble:
   numbers and separators ("02 · ") stay fixed from the first frame. */
const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#%&$01';
const SCRAMBLES = /[A-Z]/i;
const SCRAMBLE_FRAME = 30;  /* ms per frame */
const SCRAMBLE_FRAMES = 14; /* frames until the last character locks */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function scrambleHeader(win, text) {
    const header = win.querySelector('.window-header');
    if (reducedMotion.matches) {
        header.textContent = text;
        return;
    }
    let frame = 0;
    const scramble = setInterval(() => {
        frame++;
        const locked = Math.floor(text.length * frame / SCRAMBLE_FRAMES);
        let out = text.slice(0, locked);
        for (let i = locked; i < text.length; i++) {
            out += SCRAMBLES.test(text[i]) ? SCRAMBLE_GLYPHS[Math.random() * SCRAMBLE_GLYPHS.length | 0] : text[i];
        }
        header.textContent = out;
        if (locked >= text.length) clearInterval(scramble);
    }, SCRAMBLE_FRAME);
    windowTimers.get(win).push(scramble);
}

/* Full sequence: type the label, drop the cursor, open the frame.
   Flicker windows (data-open="flicker") instead power on at once
   while their label decodes. */
function openWindow(win, labelText) {
    clearWindowTimers(win);
    win.classList.remove('is-open');
    win.querySelector('.window-header').textContent = '';

    if (win.dataset.open === 'flicker') {
        void win.offsetWidth; /* Restart the CSS power-on animations */
        win.classList.add('is-open');
        scrambleHeader(win, labelText);
        return;
    }

    typeHeader(win, labelText, (header) => {
        const timers = windowTimers.get(win);
        timers.push(setTimeout(() => {
            /* Drop cursor to new line */
            header.textContent = `${labelText}\n█`;
            timers.push(setTimeout(() => {
                /* The cursor block becomes the corners: trigger the frame */
                header.textContent = `${labelText}\n `;
                win.classList.add('is-open');
            }, TYPE_HOLD));
        }, TYPE_HOLD));
    });
}

/* Retype the header of an open window without replaying its frame */
function retitleWindow(win, labelText) {
    /* Still mid-sequence: cancelling its timers would leave the frame closed,
       so restart the full open sequence with the new label instead */
    if (!win.classList.contains('is-open')) {
        openWindow(win, labelText);
        return;
    }
    clearWindowTimers(win);
    if (win.dataset.open === 'flicker') {
        scrambleHeader(win, labelText);
        return;
    }
    typeHeader(win, labelText, (header) => {
        header.textContent = `${labelText}\n `;
    });
}

function closeWindow(win) {
    clearWindowTimers(win);
    win.classList.remove('is-open', 'is-quiet');
    win.querySelector('.window-header').textContent = '';
    const meta = win.querySelector('.window-meta');
    if (meta) meta.replaceChildren();
}

function closeAllWindows() {
    document.querySelectorAll('.term-window').forEach(closeWindow);
}
