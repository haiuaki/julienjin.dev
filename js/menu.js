/* --- MENU REGISTRY --- */
/* Each key matches a planet's data-menu attribute. Entry bodies are cloned
   from <template id="entry-{id}"> in index.html, so adding an entry is a
   data change here plus one template.
   fields:    dossier rows shown in the reader, as [label, entry key];
              an entry can instead carry its own `fields` as [label, value]
   indexMeta: entry key shown at the end of each index row; its column
              header is that field's label
   page:      a single window instead of a list, with `fields` as
              [label, value] and its body in <template id="page-{key}">
   meta:      text on the right of a page window's title bar

   EXAMPLE CONTENT: values in [brackets] are placeholders to replace. */
const MENUS = {
    info: {
        entries: [
            {
                id: 'profile', title: 'PROFILE',
                fields: [['NAME', 'Julien Jin'], ['ROLE', 'Software engineer'], ['BASED', '[City, Country]'], ['FOCUS', '[e.g. graphics · web performance]']],
            },
            {
                id: 'trajectory', title: 'TRAJECTORY',
                fields: [['SPAN', '2019 — NOW'], ['CURRENT', '[Company]']],
            },
            {
                id: 'now', title: 'NOW',
                fields: [['UPDATED', 'OCT 2026']],
            },
        ],
    },
    projects: {
        fields: [['YEAR', 'year'], ['ROLE', 'role'], ['STACK', 'stack'], ['STATUS', 'status']],
        indexMeta: 'year',
        /* Placeholder data */
        entries: [
            { id: 'nebula-engine', title: 'NEBULA ENGINE', year: '2026', role: 'Lead engineer', stack: 'WebGL · Rust', status: 'Live' },
            { id: 'stellar-core', title: 'STELLAR CORE', year: '2025', role: 'Backend', stack: 'Go · Postgres', status: 'Archived' },
            { id: 'orbital-archive', title: 'ORBITAL ARCHIVE', year: '2024', role: 'Solo project', stack: 'TypeScript', status: 'In progress' },
        ],
    },
    lab: {
        fields: [['YEAR', 'year'], ['MEDIUM', 'medium'], ['STATUS', 'status']],
        indexMeta: 'year',
        entries: [
            { id: 'lens-star', title: 'LENS STAR STUDIES', year: '2026', medium: 'Canvas · CSS', status: 'On this site' },
            { id: 'black-hole', title: 'BLACK HOLE RENDERER', year: '2026', medium: 'Canvas 2D', status: 'Prototype' },
            { id: 'time-stop', title: 'TIME STOP', year: '2026', medium: 'Web Animations', status: 'On this site' },
            { id: 'next-experiment', title: '[NEXT EXPERIMENT]', year: '[YEAR]', medium: '[Medium]', status: '[Status]' },
        ],
    },
    contact: {
        page: true,
        meta: 'CHANNEL OPEN',
        fields: [['STATUS', '[Open to full-time roles]'], ['BASED', '[City] · UTC+1'], ['REPLIES', 'Within 48h'], ['PREFERRED', 'Email']],
    },
};

/* Matches the compact @media block in style.css: one window at a time */
const compactQuery = window.matchMedia('(max-width: 900px)');

const windowRow = document.getElementById('window-row');
const indexWindow = document.getElementById('content-window');
const readerWindow = document.getElementById('reader-window');
const indexContent = indexWindow.querySelector('.window-content');
const readerContent = readerWindow.querySelector('.window-content');
const indexMeta = indexWindow.querySelector('.window-meta');
const readerMeta = readerWindow.querySelector('.window-meta');

/* id: open menu key, index: selected entry (-1 = none), reading: reader open,
   els: rendered index nodes */
const menuState = { id: null, index: -1, reading: false, els: null };

/* --- RENDERING --- */

function createEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

/* Zero-padded entry number: 0 -> "01" */
const pad = (n) => String(n).padStart(2, '0');

/* Index window body: column headers, numbered entries, status line */
function buildIndex(menu) {
    const list = createEl('ul', 'menu-list');
    menu.entries.forEach((entry, i) => {
        const btn = createEl('button', 'menu-item');
        btn.dataset.index = i;
        btn.append(createEl('span', 'menu-num', pad(i + 1)), entry.title);
        if (menu.indexMeta && entry[menu.indexMeta]) {
            btn.append(createEl('span', 'menu-leader'), createEl('span', 'menu-meta', entry[menu.indexMeta]));
        }
        const li = createEl('li');
        li.appendChild(btn);
        list.appendChild(li);
    });

    const count = createEl('span', 'menu-count');
    const status = createEl('div', 'menu-status');
    status.append(createEl('span', 'menu-keys', '↑↓ SELECT · → OPEN · ← BACK'), count);

    /* Column headers share the row layout so they line up with the entries */
    const columns = createEl('div', 'menu-columns');
    columns.append(createEl('span', 'menu-num', 'NO'), createEl('span', 'menu-col-title', 'TITLE'));
    const metaField = (menu.fields || []).find(([, key]) => key === menu.indexMeta);
    if (metaField) columns.append(createEl('span', 'menu-meta', metaField[0]));

    indexContent.replaceChildren(columns, list, status);
    return { list, count };
}

/* Close tag for the reader's title bar */
function buildCloseButton() {
    const close = createEl('button', 'dossier-close');
    close.dataset.action = 'back';
    close.setAttribute('aria-label', 'Close entry');
    close.append(createEl('span', 'close-wide', '[←]'), createEl('span', 'close-compact', '← INDEX'));
    return close;
}

/* Reader title: "02 · STELLAR CORE" */
const entryTitle = (entry, i) => `${pad(i + 1)} · ${entry.title}`;

/* Reader content: field grid, body, previous / next */
function buildDossier(menu, i) {
    const entry = menu.entries[i];
    const total = menu.entries.length;

    /* An entry's own [label, value] pairs, or the menu's [label, key] columns */
    const pairs = entry.fields || (menu.fields || []).map(([label, key]) => [label, entry[key]]);
    const fields = buildFields(pairs);

    const body = createEl('div', 'dossier-body');
    body.appendChild(cloneEntryContent(entry));

    const nav = createEl('nav', 'dossier-nav');
    const navButton = (j, className, text) => {
        const btn = createEl('button', className, text);
        btn.dataset.index = j;
        return btn;
    };
    /* ↑ / ↓ match the keys that switch entries (← closes the reader) */
    if (i > 0) nav.appendChild(navButton(i - 1, 'nav-prev', `↑ ${pad(i)} ${menu.entries[i - 1].title}`));
    if (i < total - 1) nav.appendChild(navButton(i + 1, 'nav-next', `${pad(i + 2)} ${menu.entries[i + 1].title} ↓`));

    const dossier = createEl('article', 'dossier');
    if (fields.children.length) dossier.append(fields);
    dossier.append(body, nav);
    return dossier;
}

/* Label/value grid with dotted leaders; empty values are skipped */
function buildFields(pairs) {
    const fields = createEl('dl', 'dossier-fields');
    pairs.forEach(([label, value]) => {
        if (!value) return;
        const field = createEl('div', 'dossier-field');
        field.append(createEl('dt', null, label), createEl('dd', null, value));
        fields.appendChild(field);
    });
    return fields;
}

/* Single-page window (e.g. contact): fields, then the page template */
function buildPage(id, menu) {
    const page = createEl('article', 'dossier');
    const fields = buildFields(menu.fields || []);
    if (fields.children.length) page.append(fields);
    const body = createEl('div', 'dossier-body');
    const template = document.getElementById(`page-${id}`);
    if (template) body.appendChild(template.content.cloneNode(true));
    page.append(body);
    return page;
}

/* Clone an entry's template body, or a placeholder if it has none yet */
function cloneEntryContent(entry) {
    const template = document.getElementById(`entry-${entry.id}`);
    if (template) return template.content.cloneNode(true);
    return createEl('p', 'term-line', '// no data');
}

function menuButtons() {
    return [...menuState.els.list.querySelectorAll('.menu-item')];
}

function updateCount() {
    const total = MENUS[menuState.id].entries.length;
    const current = menuState.index >= 0 ? pad(menuState.index + 1) : '--';
    menuState.els.count.textContent = `${current}/${pad(total)}`;
}

/* --- MENU FLOW --- */

/* Called by ui.js once the camera has arrived on a planet with data-menu */
function openMenu(id, label) {
    const menu = MENUS[id];
    if (!menu) return;
    menuState.id = id;
    menuState.index = -1;
    menuState.reading = false;

    if (menu.page) {
        menuState.els = null;
        indexWindow.classList.add('is-page');
        indexContent.replaceChildren(buildPage(id, menu));
        openWindow(indexWindow, label);
        indexMeta.textContent = menu.meta || '';
        return;
    }

    indexWindow.classList.remove('is-page');
    menuState.els = buildIndex(menu);
    updateCount();
    openWindow(indexWindow, label);
    indexMeta.textContent = `${pad(menu.entries.length)} FILES`;
}

/* Highlight an entry in the index */
function selectEntry(i) {
    menuState.index = i;
    menuButtons().forEach((btn, j) => {
        if (j === i) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
    });
    updateCount();
}

/* Show an entry in the reader: the first open plays the full window sequence,
   later switches only retype the title and swap the content */
function openEntry(i) {
    const menu = MENUS[menuState.id];
    const entry = menu.entries[i];
    selectEntry(i);

    readerContent.replaceChildren(buildDossier(menu, i));
    readerContent.scrollTop = 0;

    if (menuState.reading) {
        retitleWindow(readerWindow, entryTitle(entry, i));
    } else {
        /* Short entries still line up with the bottom of the index */
        readerWindow.style.minHeight = `${indexWindow.offsetHeight}px`;
        menuState.reading = true;
        windowRow.classList.add('is-reading');
        openWindow(readerWindow, entryTitle(entry, i));
        readerMeta.replaceChildren(buildCloseButton());
    }

    /* Compact: the reader replaced the index, so move focus into it */
    if (compactQuery.matches) readerMeta.querySelector('.dossier-close').focus({ preventScroll: true });
}

/* Close the reader and return focus to the selected entry */
function closeEntry() {
    menuState.reading = false;
    windowRow.classList.remove('is-reading');
    closeWindow(readerWindow);
    readerContent.replaceChildren();
    const btn = menuButtons()[menuState.index];
    if (btn) btn.focus({ preventScroll: true });
}

/* Called by ui.js before focusing a planet and by resetCamera() */
function closeMenu() {
    menuState.id = null;
    menuState.index = -1;
    menuState.reading = false;
    menuState.els = null;
    windowRow.classList.remove('is-reading');
    indexWindow.classList.remove('is-page');
    indexContent.replaceChildren();
    readerContent.replaceChildren();
}

/* --- INPUT --- */

/* One delegated listener per window */
indexContent.addEventListener('click', (e) => {
    if (!menuState.id) return;
    const btn = e.target.closest('[data-index]');
    if (btn) openEntry(+btn.dataset.index);
});

/* Reader: close tag in the title bar, plus previous / next entry links */
readerWindow.addEventListener('click', (e) => {
    if (!menuState.id) return;
    if (e.target.closest('[data-action="back"]')) {
        closeEntry();
        return;
    }
    const btn = e.target.closest('[data-index]');
    if (btn) openEntry(+btn.dataset.index);
});

/* File-browser keys: ↑/↓ move the selection (and the reader along with it
   once it is open on wide screens), →/Enter open, ← steps back: reader
   first, then out to the solar system. Esc does the same as ← but is only a
   fallback: in page-triggered fullscreen the browser takes Esc to exit. */
document.addEventListener('keydown', (e) => {
    if (!menuState.id) return;

    if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        if (menuState.reading) closeEntry();
        else resetCamera();
        return;
    }

    /* Single-page windows have nothing to select */
    if (!menuState.els) return;

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!menuState.reading) openEntry(Math.max(menuState.index, 0));
        return;
    }

    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    /* Compact reader replaces the index: leave arrow keys to scroll the entry */
    if (compactQuery.matches && menuState.reading) return;
    e.preventDefault();

    const buttons = menuButtons();
    const step = e.key === 'ArrowDown' ? 1 : -1;
    const next = menuState.index === -1
        ? (step === 1 ? 0 : buttons.length - 1)
        : (menuState.index + step + buttons.length) % buttons.length;

    if (menuState.reading) openEntry(next);
    else selectEntry(next);
    buttons[next].focus();
});
