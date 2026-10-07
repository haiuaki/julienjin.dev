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

/* Touch screens get a visible way home in the astre's window: the home button
   (the astre in the corner) is not obviously a button to a first-time visitor */
const touchQuery = window.matchMedia('(hover: none)');

function setIndexMeta(text) {
    if (touchQuery.matches) {
        const home = createEl('button', 'dossier-close', '← HOME');
        home.dataset.action = 'home';
        home.setAttribute('aria-label', 'Back to the solar system');
        indexMeta.replaceChildren(home);
    } else {
        indexMeta.textContent = text;
    }
}

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
const menuState = { id: null, index: -1, reading: false, els: null, pane: 'index' };

/* The reader can take keyboard focus, so arrows / Space / Page keys scroll it natively */
readerContent.tabIndex = -1;

/* Key hints for each state of the index + reader pair */
const KEY_HINTS = {
    browse: '↑↓ SELECT · → OPEN · ← BACK',
    reading: '↑↓ SELECT · → READ · ← CLOSE',
    reader: '↑↓ SCROLL · SPACE PAGE · ← INDEX',
};

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
    /* All hints share one grid cell and only the active one shows, so the line
       always reserves the longest hint's width and the window never resizes */
    const keys = createEl('span', 'menu-keys');
    keys.dataset.state = 'browse';
    Object.entries(KEY_HINTS).forEach(([state, text]) => {
        const hint = createEl('span', null, text);
        hint.dataset.hint = state;
        keys.appendChild(hint);
    });
    status.append(keys, count);

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
    /* Previous | ← INDEX hint | next. No arrow keys on the links: in the reader
       ↑/↓ scroll, and ← is the key that leads back to the index. */
    /* The middle hint changes once a keyboard reader reaches the end, to say
       what ↓ does next; both texts share one cell so the row never shifts */
    const entryLabel = j => `${pad(j + 1)} ${menu.entries[j].title}`;
    const hint = createEl('span', 'nav-hint');
    hint.append(
        createEl('span', 'hint-reading', '← INDEX'),
        createEl('span', 'hint-end', i < total - 1 ? 'END · ↓ NEXT · ← INDEX' : 'END · ← INDEX'),
    );
    nav.append(
        i > 0 ? navButton(i - 1, 'nav-prev', entryLabel(i - 1)) : createEl('span'),
        hint,
        i < total - 1 ? navButton(i + 1, 'nav-next', entryLabel(i + 1)) : createEl('span'),
    );

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
    if (template) body.appendChild(markExternalLinks(template.content.cloneNode(true)));
    page.append(body);
    return page;
}

/* Clone an entry's template body, or a placeholder if it has none yet */
function cloneEntryContent(entry) {
    const template = document.getElementById(`entry-${entry.id}`);
    if (template) return markExternalLinks(template.content.cloneNode(true));
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
    syncRoute(id, null);

    if (menu.page) {
        menuState.els = null;
        indexWindow.classList.add('is-page');
        indexContent.replaceChildren(buildPage(id, menu));
        openWindow(indexWindow, label);
        setIndexMeta(menu.meta || '');
        return;
    }

    indexWindow.classList.remove('is-page');
    menuState.els = buildIndex(menu);
    updateCount();
    openWindow(indexWindow, label);
    setIndexMeta(`${pad(menu.entries.length)} FILES`);
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
/* --- PANE FOCUS --- */
/* With the reader open on wide screens, keys act on one pane at a time:
   the index (↑/↓ switch entries) or the reader (↑/↓ scroll the text).
   → moves into the reader, ← back out; clicking a pane focuses it too. */
function setPane(pane) {
    menuState.pane = pane;
    windowRow.classList.toggle('focus-reader', pane === 'reader');
    const keys = indexContent.querySelector('.menu-keys');
    if (keys) keys.dataset.state = pane === 'reader' ? 'reader' : menuState.reading ? 'reading' : 'browse';
}

/* Reader scrolled to its top / end (a short entry is both) */
const readerAtTop = () => readerContent.scrollTop <= 1;
const readerAtEnd = () => readerContent.scrollTop + readerContent.clientHeight >= readerContent.scrollHeight - 2;

function updateReaderEnd() {
    readerWindow.classList.toggle('at-end', menuState.reading && readerAtEnd());
}
readerContent.addEventListener('scroll', updateReaderEnd, { passive: true });

function focusReader() {
    setPane('reader');
    readerContent.focus({ preventScroll: true });
}

function focusIndex() {
    setPane('index');
    const btn = menuButtons()[menuState.index];
    if (btn) btn.focus({ preventScroll: true });
}

/* stayInReader: opened from inside the reader (previous / next links, or
   ↑/↓ at its edges), so keyboard focus stays there; from the index it stays
   on the index. atEnd: open scrolled to the end, so ↑ at the top of an entry
   lands where the previous one was left, as if they were one document. */
function openEntry(i, stayInReader = false, atEnd = false) {
    const menu = MENUS[menuState.id];
    const entry = menu.entries[i];
    selectEntry(i);

    syncRoute(menuState.id, entry.id);
    readerContent.replaceChildren(buildDossier(menu, i));
    readerContent.scrollTop = atEnd ? readerContent.scrollHeight : 0;
    updateReaderEnd();

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

    /* Compact: the reader replaced the index, so it takes focus */
    if (compactQuery.matches || stayInReader) focusReader();
    else setPane('index');
}

/* Close the reader and return focus to the selected entry */
function closeEntry() {
    syncRoute(menuState.id, null);
    menuState.reading = false;
    setPane('index');
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
    menuState.pane = 'index';
    windowRow.classList.remove('is-reading', 'focus-reader');
    indexWindow.classList.remove('is-page');
    indexContent.replaceChildren();
    readerContent.replaceChildren();
}

/* --- INPUT --- */

/* Clicking (or tabbing) into a pane makes it the active one */
readerWindow.addEventListener('focusin', () => {
    if (menuState.reading && menuState.pane !== 'reader') setPane('reader');
});
indexContent.addEventListener('focusin', () => {
    if (menuState.els && menuState.pane !== 'index') setPane('index');
});
/* The pane you click is the pane you're in. A press anywhere in a window
   (padding and plain text included) moves keyboard focus there; controls
   then do their own thing on click. */
readerWindow.addEventListener('mousedown', (e) => {
    if (menuState.reading && !e.target.closest('button, a')) focusReader();
});
indexWindow.addEventListener('mousedown', (e) => {
    if (!menuState.reading || !menuState.els || e.target.closest('button')) return;
    /* Keep the browser from moving focus to the page after we focus the row */
    e.preventDefault();
    focusIndex();
});

/* ← HOME in the astre's window title bar (touch screens) */
indexWindow.addEventListener('click', (e) => {
    if (menuState.id && e.target.closest('[data-action="home"]')) resetCamera();
});

/* One delegated listener per window */
indexContent.addEventListener('click', (e) => {
    if (!menuState.id) return;
    const btn = e.target.closest('[data-index]');
    if (!btn) return;
    openEntry(+btn.dataset.index);
    /* Safari doesn't focus buttons on click; do it so the keys follow */
    btn.focus({ preventScroll: true });
});

/* Reader: close tag in the title bar, plus previous / next entry links */
readerWindow.addEventListener('click', (e) => {
    if (!menuState.id) return;
    if (e.target.closest('[data-action="back"]')) {
        closeEntry();
        return;
    }
    const btn = e.target.closest('[data-index]');
    if (btn) openEntry(+btn.dataset.index, true);
});

/* File-browser keys. Index pane: ↑/↓ move the selection (and the open entry
   along with it), → opens, then → again moves into the reader. Reader pane:
   ↑/↓, Space and Page Up/Down scroll natively, ← returns to the index.
   ← / Esc step back: reader pane, then the open entry, then out to the
   solar system. Esc is only a fallback: in page-triggered fullscreen the
   browser takes it to exit. */
const PAGE_KEYS = [' ', 'PageDown', 'PageUp'];

document.addEventListener('keydown', (e) => {
    if (!menuState.id) return;
    const inReader = menuState.reading && (menuState.pane === 'reader' || compactQuery.matches);

    if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        if (inReader && !compactQuery.matches) focusIndex();
        else if (menuState.reading) closeEntry();
        else resetCamera();
        return;
    }

    /* Single-page windows have nothing to select */
    if (!menuState.els) return;

    /* Reader pane: the focused reader scrolls itself. A fresh ↓ at the very
       end (or ↑ at the top) continues to the next (previous) entry; key
       repeat never does, so holding ↓ to scroll stops at the end. */
    if (inReader) {
        const last = MENUS[menuState.id].entries.length - 1;
        if (e.repeat || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
        if (e.key === 'ArrowDown' && readerAtEnd() && menuState.index < last) {
            e.preventDefault();
            openEntry(menuState.index + 1, true);
        } else if (e.key === 'ArrowUp' && readerAtTop() && menuState.index > 0) {
            e.preventDefault();
            openEntry(menuState.index - 1, true, true);
        }
        return;
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (menuState.reading) focusReader();
        else openEntry(Math.max(menuState.index, 0));
        return;
    }

    /* From the index, Space / Page keys still scroll the open entry */
    if (PAGE_KEYS.includes(e.key) && menuState.reading) {
        e.preventDefault();
        const dir = e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) ? -1 : 1;
        readerContent.scrollBy({ top: dir * readerContent.clientHeight * 0.85, behavior: 'smooth' });
        return;
    }

    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
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
