/* --- HOME WINDOW --- */
/* The site's identity and main navigation: a terminal window with the name in
   its title bar and one row per planet. Opening a row does exactly what
   clicking its planet does; hovering or arrow-keying a row locks the
   crosshairs onto that planet, linking the list to the 3D scene. It closes
   while a planet is focused and reopens on the way back home. */
const HOME_TITLE = 'JULIEN JIN';
const HOME_ROLE = 'SOFTWARE ENGINEER';
const HOME_OPEN_DELAY = 1200; /* as the initial fade-in is well under way */

const homeWindow = document.getElementById('home-window');
const homeContent = homeWindow.querySelector('.window-content');
const homeMeta = homeWindow.querySelector('.window-meta');

let homeRows = null;     /* row buttons, built once */
let homeTargeted = -1;   /* selected row (▸), driven by hover or ↑/↓ */
let homeLocked = -1;     /* planet whose crosshairs the list is holding */
let homeLast = -1;       /* section the visitor last opened */

/* The full power-on plays once per browser session; returns are quiet */
const HOME_SEEN_KEY = 'homeSeen';

function buildHome() {
    const columns = createEl('div', 'menu-columns');
    columns.append(createEl('span', 'menu-num', 'NO'), createEl('span', 'menu-col-title', 'SECTION'));

    const list = createEl('ul', 'menu-list');
    astreBtns.forEach((planet, i) => {
        const btn = createEl('button', 'menu-item');
        btn.dataset.planet = i;
        const label = (planet.dataset.label || '').replace(/^\[(.*)\]$/, '$1').toUpperCase();
        btn.append(createEl('span', 'menu-num', pad(i + 1)), label);
        /* Menus show how many entries they hold; single pages show their meta */
        const menu = MENUS[planet.dataset.menu];
        const meta = menu && (menu.entries ? `${pad(menu.entries.length)} FILES` : menu.meta);
        if (meta) btn.append(createEl('span', 'menu-leader'), createEl('span', 'menu-meta', meta));
        const li = createEl('li');
        li.appendChild(btn);
        list.appendChild(li);
    });

    const status = createEl('div', 'menu-status');
    status.append(createEl('span', 'menu-keys', '↑↓ SELECT · → OPEN'));

    homeContent.replaceChildren(columns, list, status);
    homeRows = [...list.querySelectorAll('.menu-item')];
}

function openHome() {
    if (document.body.classList.contains('planet-focused')) return;
    if (!homeRows) buildHome();

    if (sessionStorage.getItem(HOME_SEEN_KEY)) {
        /* Quiet return: a short fade, no flicker or decode */
        closeWindow(homeWindow);
        homeWindow.querySelector('.window-header').textContent = HOME_TITLE;
        homeMeta.textContent = HOME_ROLE;
        homeWindow.classList.add('is-quiet', 'is-open');
    } else {
        sessionStorage.setItem(HOME_SEEN_KEY, 'true');
        homeWindow.classList.remove('is-quiet');
        openWindow(homeWindow, HOME_TITLE);
        homeMeta.textContent = HOME_ROLE;
    }

    /* Keep the section the visitor came from selected, so ↓ or → continues from it */
    if (homeLast >= 0) selectRow(homeLast);
}

/* Mark a row as selected (▸) without touching the crosshairs */
function selectRow(i) {
    homeTargeted = i;
    homeRows.forEach((row, j) => {
        if (j === i) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
    });
}

/* Point the crosshairs at a planet through its own hover handlers (-1 = none) */
function lockPlanet(i) {
    if (i === homeLocked) return;
    if (homeLocked >= 0) astreBtns[homeLocked].dispatchEvent(new MouseEvent('mouseleave'));
    homeLocked = i;
    if (i >= 0) astreBtns[i].dispatchEvent(new MouseEvent('mouseenter'));
}

function targetPlanet(i) {
    selectRow(i);
    lockPlanet(i);
}

function openSection(i) {
    targetPlanet(-1);
    astreBtns[i].click();
}

/* Remember the last section, whether it was opened from a row or its planet */
astreBtns.forEach((planet, i) => planet.addEventListener('click', () => { homeLast = i; }));

/* --- INPUT --- */
homeContent.addEventListener('click', (e) => {
    const row = e.target.closest('[data-planet]');
    if (row) openSection(+row.dataset.planet);
});

homeContent.addEventListener('mouseover', (e) => {
    const row = e.target.closest('[data-planet]');
    if (row) targetPlanet(+row.dataset.planet);
});

homeContent.addEventListener('mouseleave', () => targetPlanet(-1));

/* ↑/↓ select a section, →/Enter open it (Enter is the focused button's own click) */
document.addEventListener('keydown', (e) => {
    if (!homeRows || document.body.classList.contains('planet-focused')) return;
    if (e.key === 'ArrowRight' && homeTargeted >= 0) {
        e.preventDefault();
        openSection(homeTargeted);
        return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const n = homeRows.length;
    const step = e.key === 'ArrowDown' ? 1 : -1;
    const next = homeTargeted === -1 ? (step === 1 ? 0 : n - 1) : (homeTargeted + step + n) % n;
    targetPlanet(next);
    homeRows[next].focus({ preventScroll: true });
});

setTimeout(openHome, HOME_OPEN_DELAY);
