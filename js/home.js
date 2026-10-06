/* --- HOME WINDOW --- */
/* The site's identity and main navigation: a terminal window with the name in
   its title bar and one row per planet. Opening a row does exactly what
   clicking its planet does; hovering or arrow-keying a row locks the
   crosshairs onto that planet, linking the list to the 3D scene. It closes
   while a planet is focused and reopens on the way back home. */
const HOME_TITLE = 'JULIEN JIN';
const HOME_ROLE = 'SOFTWARE ENGINEER';
const HOME_OPEN_DELAY = 1500; /* matches the initial fade-in */

const homeWindow = document.getElementById('home-window');
const homeContent = homeWindow.querySelector('.window-content');
const homeMeta = homeWindow.querySelector('.window-meta');

let homeRows = null;     /* row buttons, built once */
let homeTargeted = -1;   /* planet whose crosshairs the list is holding */

function buildHome() {
    const columns = createEl('div', 'menu-columns');
    columns.append(createEl('span', 'menu-num', 'NO'), createEl('span', 'menu-col-title', 'SECTION'));

    const list = createEl('ul', 'menu-list');
    planetBtns.forEach((planet, i) => {
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
    openWindow(homeWindow, HOME_TITLE);
    homeMeta.textContent = HOME_ROLE;
}

/* Point the crosshairs at a planet through its own hover handlers (-1 = none) */
function targetPlanet(i) {
    if (i === homeTargeted) return;
    if (homeTargeted >= 0) planetBtns[homeTargeted].dispatchEvent(new MouseEvent('mouseleave'));
    homeTargeted = i;
    homeRows.forEach((row, j) => {
        if (j === i) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
    });
    if (i >= 0) planetBtns[i].dispatchEvent(new MouseEvent('mouseenter'));
}

function openSection(i) {
    targetPlanet(-1);
    planetBtns[i].click();
}

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
