/* --- MENU REGISTRY --- */
/* Each key matches a planet's data-menu attribute. This holds each section's
   settings only; its entries live in content/{key}.html, one <article> each
   (see the note at the top of those files), so adding an entry is one edit
   in one file.
   fields:    details shown above an entry's text, as [label, key], where key
              is the entry's data-{key} attribute; entries without a value
              for a field skip it, and a value that is a web address
              (https://...) shows as a link
   indexMeta: [label, key] shown at the end of each index row: label as
              the column header, the entry's data-{key} on each row
   page:      a single page instead of a list, built from the file's one
              <article>
   side:      id of a block in the page (index.html) that, on wide screens,
              takes the main window while the page opens beside it in the
              reader, so the page fills the row like a list and its entry
   pageTitle: title of that reader window
   meta:      text on the right of a page's main title bar
   clockField: key of the field that gets the live local time after it, when
              the entry has a data-timezone (contact: "Paris · 14:32 (UTC+2)") */
const MENUS = {
    info: {
        fields: [['NAME', 'name'], ['ROLE', 'role'], ['BASED', 'based'], ['FOCUS', 'focus'],
            ['UPDATED', 'updated']],
    },
    projects: {
        fields: [['ROLE', 'role'], ['STACK', 'stack'], ['TEAM', 'team'], ['SOURCE', 'source'],
            ['STATUS', 'status']],
        indexMeta: ['LANG', 'lang'],
    },
    lab: {
        fields: [['DATE', 'date'], ['MEDIUM', 'medium'], ['STATUS', 'status'], ['SOURCE', 'source']],
        indexMeta: ['DATE', 'date'],
    },
    contact: {
        page: true,
        side: 'contact-channels',
        pageTitle: 'TRANSMISSION',
        meta: 'CHANNEL OPEN',
        clockField: 'based',
        fields: [['STATUS', 'status'], ['WORK', 'work'], ['LANGUAGES', 'languages'], ['BASED', 'based'],
            ['REPLIES', 'replies']],
    },
};

/* --- CONTENT --- */
/* Every section's file is fetched once, all in parallel, as the page loads,
   so a window never waits on the network unless it opens within the first
   moments (a shared link). Each <article> becomes an entry: its id, its
   data-* attributes (title, year...) and its content as the body.
   A file that fails to load leaves its section empty instead of breaking. */
const contentReady = Promise.all(Object.entries(MENUS).map(([key, menu]) =>
    fetch(`content/${key}.html`)
        .then(res => (res.ok ? res.text() : Promise.reject(new Error(`content/${key}.html: ${res.status}`))))
        .then(text => {
            const parsed = createEl('template');
            parsed.innerHTML = text;
            const entries = [...parsed.content.children]
                .filter(el => el.tagName === 'ARTICLE')
                .map(article => ({ ...article.dataset, id: article.id, body: article }));
            if (menu.page) menu.content = entries[0] || null;
            else menu.entries = entries;
        })
        .catch(err => {
            console.warn(err);
            if (!menu.page) menu.entries = [];
        })
        .finally(() => { menu.loaded = true; })));

/* The way home is the "[home]" label on the crosshair (js/ui.js) */
function setIndexMeta(text) {
    indexMeta.textContent = text;
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

/* id: open menu key, label: its window title, index: selected entry
   (-1 = none), reading: reader open, els: rendered index nodes */
const menuState = { id: null, label: null, index: -1, reading: false, els: null, pane: 'index' };

/* The reader can take keyboard focus, so arrows / Space / Page keys scroll it natively */
readerContent.tabIndex = -1;

/* Key hints for each state of the index + reader pair */
const KEY_HINTS = {
    browse: '↑↓ SELECT · → OPEN · ← HOME', /* ← does what "[home]" does */
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
    if (!menu.entries.length) list.append(createEl('li', 'term-line', '// no signal'));
    menu.entries.forEach((entry, i) => {
        const btn = createEl('button', 'menu-item');
        btn.dataset.index = i;
        btn.append(createEl('span', 'menu-num', pad(i + 1)), createEl('span', 'menu-title', entry.title));
        const meta = menu.indexMeta && entry[menu.indexMeta[1]];
        if (meta) {
            btn.append(createEl('span', 'menu-leader'), createEl('span', 'menu-meta', meta));
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
    /* "#", not "NO", which read as "no title" */
    columns.append(createEl('span', 'menu-num', '#'), createEl('span', 'menu-col-title', 'TITLE'));
    if (menu.indexMeta) columns.append(createEl('span', 'menu-meta', menu.indexMeta[0]));

    indexContent.replaceChildren(columns, list, status);
    checkLeaders();
    return { list, count };
}

/* Close tag for the reader's title bar */
function buildCloseButton() {
    const close = createEl('button', 'dossier-close');
    close.dataset.action = 'back';
    close.setAttribute('aria-label', 'Close entry');
    /* Says what it does, on every screen ("close" is in its name too); on wide
       screens ← does the same, as the index's key hints say */
    close.textContent = 'CLOSE';
    return close;
}

/* Reader title: "02 · STELLAR CORE" */
const entryTitle = (entry, i) => `${pad(i + 1)} · ${entry.title}`;

/* Reader content: field grid, body, previous / next */
function buildDossier(menu, i) {
    const entry = menu.entries[i];
    const total = menu.entries.length;

    const fields = buildFields(entryFields(menu, entry));

    const body = createEl('div', 'dossier-body');
    body.appendChild(cloneEntryContent(entry));

    const nav = createEl('nav', 'dossier-nav');
    nav.setAttribute('aria-label', 'Previous and next entries');
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

/* The section's [label, key] fields filled from an entry: [label, value] */
const entryFields = (menu, entry) => (menu.fields || []).map(([label, key]) => [label, entry[key]]);

/* --- LEADERS --- */
/* Dotted leaders show while a row's two sides share a line; a row that had
   to wrap (enlarged text, narrow window) drops its leader (css .is-wrapped).
   Measured with every leader shown, so hiding one can't flip the result.
   Runs when rows are built, the text size changes or the layout resizes. */
function markWrappedRows() {
    const rows = [...document.querySelectorAll('.term-window .menu-item, .term-window .dossier-field')];
    rows.forEach(row => row.classList.remove('is-wrapped', 'is-stacked'));
    /* A list value that doesn't fit on one line beside its label stacks two
       items per line instead (css .is-stacked); measured first, as stacking
       changes how wide the value is */
    rows.filter(row => {
        const lines = row.querySelectorAll('.value-line');
        if (lines.length < 2) return false;
        const label = row.querySelector('dt').getBoundingClientRect();
        const first = lines[0].getBoundingClientRect(), last = lines[lines.length - 1].getBoundingClientRect();
        return last.top > first.top + first.height / 2 || first.top > label.top + label.height / 2;
    }).forEach(row => row.classList.add('is-stacked'));
    rows.filter(row => {
        const start = row.querySelector('.menu-num, dt'), end = row.querySelector('.menu-meta, dd');
        if (!start || !end) return false;
        const a = start.getBoundingClientRect(), b = end.getBoundingClientRect();
        return a.height > 0 && b.top > a.top + a.height / 2;
    }).forEach(row => row.classList.add('is-wrapped'));
}

let leaderCheck = 0;
function checkLeaders() {
    if (leaderCheck) return;
    leaderCheck = requestAnimationFrame(() => {
        leaderCheck = 0;
        markWrappedRows();
    });
}
onLayoutResize(checkLeaders);
document.fonts && document.fonts.ready.then(checkLeaders);

/* Names shown for links to these sites; others show their address
   without "www." (example.com) */
const SITE_NAMES = {
    'github.com': 'GitHub',
};

/* A web address becomes a link showing the site's name (GitHub ↗, the
   arrow added by markExternalLinks); a mistyped one stays plain text.
   A list value ("Go · Next.js · Docker") becomes its items in pairs, one
   span per pair, so a list too long for its line can stack two items per
   line (markWrappedRows). Other values are kept as they are. */
function fieldValue(value) {
    if (typeof value !== 'string') return [value];
    if (/^https?:\/\//.test(value)) {
        try {
            const host = new URL(value).hostname.replace(/^www\./, '');
            const link = createEl('a', null, SITE_NAMES[host] || host);
            link.href = value;
            return [link];
        } catch { /* not a valid address: shown as text */ }
    }
    const items = value.split(/\s+·\s+/);
    if (items.length < 3) return [value];
    const nodes = [];
    for (let i = 0; i < items.length; i += 2) {
        if (i) nodes.push(createEl('span', 'value-sep', ' · '));
        nodes.push(createEl('span', 'value-line', items.slice(i, i + 2).join(' · ')));
    }
    return nodes;
}

/* Label/value grid with dotted leaders; empty values are skipped */
function buildFields(pairs) {
    const fields = createEl('dl', 'dossier-fields');
    pairs.forEach(([label, value]) => {
        if (!value) return;
        const field = createEl('div', 'dossier-field');
        const dd = createEl('dd');
        dd.append(...fieldValue(value)); /* text, or nodes (e.g. a live clock) */
        field.append(createEl('dt', null, label), dd);
        fields.appendChild(field);
    });
    return markExternalLinks(fields);
}

/* A <div data-copy-of="some-id"> in an entry stands for a block written
   once elsewhere in the page (the contact channels live in the no-JS window),
   so it is only ever edited in one place. omit: the id of a block shown in
   a window of its own, left out here. Email links in a copy get a copy
   button (the block itself is also the no-JS window, where it couldn't
   work). */
function fillCopies(fragment, omit) {
    fragment.querySelectorAll('[data-copy-of]').forEach(slot => {
        const source = document.getElementById(slot.dataset.copyOf);
        if (!source || slot.dataset.copyOf === omit) return slot.remove();
        const copy = source.cloneNode(true);
        copy.removeAttribute('id');
        copy.querySelectorAll('a[href^="mailto:"]').forEach(addCopyButton);
        slot.replaceWith(copy);
    });
    return fragment;
}

/* "[copy]" after an email link: copies the address, for visitors whose
   mail link opens the wrong app (webmail) or nothing. Says "[copied]" for
   a moment, and screen readers hear it through a status line. */
function addCopyButton(link) {
    const address = link.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
    const button = createEl('button', 'copy-button', '[copy]');
    button.type = 'button';
    button.setAttribute('aria-label', 'Copy email address');
    const said = createEl('span', 'visually-hidden');
    said.setAttribute('role', 'status');
    let reset = 0;
    button.addEventListener('click', async () => {
        let copied = false;
        try {
            await navigator.clipboard.writeText(address);
            copied = true;
        } catch {
            /* No clipboard access (older browsers): copy through a selection */
            const field = createEl('textarea');
            field.value = address;
            field.setAttribute('readonly', '');
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.appendChild(field);
            field.select();
            try { copied = document.execCommand('copy'); } catch { /* not copied */ }
            field.remove();
            button.focus({ preventScroll: true });
        }
        button.textContent = copied ? '[copied]' : '[copy failed]';
        said.textContent = copied ? 'Email address copied' : 'Could not copy the email address';
        clearTimeout(reset);
        reset = setTimeout(() => {
            button.textContent = '[copy]';
            said.textContent = '';
        }, 2000);
    });
    link.after(' ', button, said);
}

/* --- LOCAL TIME --- */
/* "14:32 (UTC+2)" in an IANA time zone, from the browser's own time zone
   data, so summer time is always right. Null for an unknown zone. */
function localTime(zone, now = new Date()) {
    const format = (withOffset) => new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        ...(withOffset && { timeZoneName: 'shortOffset' }),
    }).formatToParts(now);
    let parts;
    try {
        parts = format(true);
    } catch {
        /* Older browsers without offset names: the time alone */
        try { parts = format(false); } catch { return null; }
    }
    const part = (type) => parts.find(p => p.type === type)?.value;
    const offset = part('timeZoneName');
    return `${part('hour')}:${part('minute')}${offset ? ` (${offset.replace('GMT', 'UTC')})` : ''}`;
}

/* Keep a clock element current, on each new minute, while it is shown */
let clockTimer = null;
function startClock(el, zone) {
    clearTimeout(clockTimer);
    const tick = () => {
        el.textContent = localTime(zone);
        clockTimer = setTimeout(() => { if (el.isConnected) tick(); }, 60000 - (Date.now() % 60000) + 50);
    };
    tick();
}

/* Single page (e.g. contact): fields, then the page's text, without the
   block whose id is omit */
function buildPage(menu, omit) {
    const page = createEl('article', 'dossier');
    const body = createEl('div', 'dossier-body');
    if (menu.content) {
        const pairs = entryFields(menu, menu.content);
        const zone = menu.content.timezone;
        if (zone && localTime(zone)) {
            /* "Paris" -> "Paris · 14:32 (UTC+2)" */
            const i = (menu.fields || []).findIndex(([, key]) => key === menu.clockField);
            if (i >= 0 && pairs[i][1]) {
                const clock = createEl('span', 'local-time');
                startClock(clock, zone);
                const value = document.createDocumentFragment();
                value.append(`${pairs[i][1]} · `, clock);
                pairs[i] = [pairs[i][0], value];
            }
        }
        const fields = buildFields(pairs);
        if (fields.children.length) page.append(fields);
        body.appendChild(cloneEntryContent(menu.content, omit));
    } else {
        body.appendChild(createEl('p', 'term-line', '// no signal'));
    }
    page.append(body);
    return page;
}

/* A fresh copy of an entry's text, or a placeholder if it has none yet */
function cloneEntryContent(entry, omit) {
    if (!entry.body.children.length) return createEl('p', 'term-line', '// no data');
    const copy = document.createDocumentFragment();
    entry.body.childNodes.forEach(node => copy.appendChild(document.importNode(node, true)));
    return markExternalLinks(fillCopies(copy, omit));
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
    if (!menu.loaded) {
        /* Opened before its file arrived: open once it has, if still on this astre */
        contentReady.then(() => {
            if (document.querySelector('.astre-btn.active-planet')?.dataset.menu === id) openMenu(id, label);
        });
        return;
    }
    menuState.id = id;
    menuState.label = label;
    menuState.index = -1;
    menuState.reading = false;
    syncRoute(id, null);

    if (menu.page) {
        menuState.els = null;
        showPage(menu, label);
        return;
    }

    indexWindow.classList.remove('is-page');
    menuState.els = buildIndex(menu);
    updateCount();
    openWindow(indexWindow, label);
    const total = menu.entries.length;
    setIndexMeta(`${pad(total)} ${total === 1 ? 'FILE' : 'FILES'}`);
}

const SIDE_KEY_HINT = '↑↓ SELECT · ← HOME';

/* The page's window powers on once the main window's title has decoded */
const PAGE_PAIR_DELAY_MS = POWER_ON_DARK_MS + SCRAMBLE_FRAMES * SCRAMBLE_FRAME;

/* A page with a side block (contact) shows it in the main window, and the
   page in the reader beside it, on wide screens. Compact screens show one
   window at a time, so there the page keeps everything in the main one. */
function showPage(menu, label) {
    const paired = Boolean(menu.side) && !compactQuery.matches;
    indexWindow.classList.toggle('is-page', !paired);
    readerWindow.classList.toggle('is-page', paired);
    if (paired) {
        const side = createEl('div', 'page-side');
        const slot = createEl('div');
        slot.dataset.copyOf = menu.side;
        side.append(slot);
        /* Key hints like an index's: ↑/↓ step through the links */
        const keys = createEl('span', 'menu-keys');
        keys.dataset.state = 'browse';
        const hint = createEl('span', null, SIDE_KEY_HINT);
        hint.dataset.hint = 'browse';
        keys.append(hint);
        const status = createEl('div', 'menu-status');
        status.append(keys);
        side.append(status);
        indexContent.replaceChildren(markExternalLinks(fillCopies(side)));
        readerContent.replaceChildren(buildPage(menu, menu.side));
    } else {
        indexContent.replaceChildren(buildPage(menu));
        readerContent.replaceChildren();
    }
    checkLeaders();
    openWindow(indexWindow, label);
    setIndexMeta(menu.meta || '');
    if (paired) {
        readerWindow.style.minHeight = '';
        openWindowAfter(readerWindow, menu.pageTitle || '', reducedMotion.matches ? 0 : PAGE_PAIR_DELAY_MS);
    } else {
        closeWindow(readerWindow);
    }
}

/* Crossing the compact width with a paired page open rebuilds it for the
   new layout */
compactQuery.addEventListener('change', () => {
    const menu = MENUS[menuState.id];
    if (menu && menu.page && menu.side) showPage(menu, menuState.label);
});

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

/* --- REDRAW --- */
/* Switching entries: a bright line sweeps down like a CRT redrawing. The new
   entry is revealed behind it (and still glitches in, via .dossier), while the
   frame's bottom edge travels to the new height in the same motion. */
const redrawLine = createEl('div', 'redraw-line');
readerWindow.appendChild(redrawLine);
let redrawAnims = [];

function redrawReader(fromHeight) {
    redrawAnims.forEach(a => a.cancel());
    redrawAnims = [];
    const toHeight = readerContent.offsetHeight;
    if (reducedMotion.matches) return;
    /* Short moves are quick, long ones a little longer: 200-300ms */
    const d = Math.round(Math.min(300, 200 + Math.abs(toHeight - fromHeight) * 0.25));
    animateWindowHeight(readerContent, fromHeight, d);
    const top = readerContent.offsetTop;
    redrawAnims = [
        readerContent.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: d, easing: CAMERA_EASE }),
        redrawLine.animate([
            { transform: `translateY(${top}px)`, opacity: 1 },
            { transform: `translateY(${top + toHeight - 1}px)`, opacity: 1, offset: 0.85 },
            { transform: `translateY(${top + toHeight - 1}px)`, opacity: 0 },
        ], { duration: d + 120, easing: CAMERA_EASE }),
    ];
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
    /* Switching within an open reader redraws it; a first open powers on */
    const switching = menuState.reading && readerWindow.classList.contains('is-open');
    const fromHeight = readerContent.offsetHeight;
    readerContent.replaceChildren(buildDossier(menu, i));
    checkLeaders();
    readerContent.scrollTop = atEnd ? readerContent.scrollHeight : 0;
    updateReaderEnd();
    if (switching) redrawReader(fromHeight);

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
    menuState.label = null;
    menuState.index = -1;
    menuState.reading = false;
    menuState.els = null;
    menuState.pane = 'index';
    windowRow.classList.remove('is-reading', 'focus-reader');
    indexWindow.classList.remove('is-page');
    readerWindow.classList.remove('is-page');
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

    /* Pages have nothing to select; beside a paired page, ↑/↓ step through
       the side block's links (the reader scrolls itself when focused) */
    if (!menuState.els) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        if (!readerWindow.classList.contains('is-page') || readerWindow.contains(document.activeElement)) return;
        const links = [...indexContent.querySelectorAll('a[href]')];
        if (!links.length) return;
        e.preventDefault();
        const at = links.indexOf(document.activeElement);
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const next = at === -1 ? (step === 1 ? 0 : links.length - 1) : (at + step + links.length) % links.length;
        links[next].focus();
        return;
    }

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
