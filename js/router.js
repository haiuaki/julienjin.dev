/* --- ROUTER --- */
/* Each view has its own address, so it can be shared and survives leaving
   the site:  #/projects  (an astre's window)  ·  #/projects/stellar-core
   (an entry open)  ·  no hash for home. Hash addresses work on any static
   host without server rewrites.

   History follows the ← key: entering an astre and opening an entry each add
   a step, so Back (or a phone's back swipe) returns entry → index → home.
   Switching entries only updates the address, so reading several projects
   never piles up Back steps. Moving up with the site's own controls rewinds
   history instead of adding to it, so Back never re-enters a closed view. */

const routeOf = (menuId, entryId) => (menuId ? `#/${menuId}${entryId ? `/${entryId}` : ''}` : '');
const depthOf = (menuId, entryId) => (menuId ? (entryId ? 2 : 1) : 0);
const urlOf = (route) => route || location.pathname + location.search;

/* Parse the current hash into { menuId, entryId } (nulls when absent) */
function parseRoute(hash = location.hash) {
    const [, menuId = null, entryId = null] = hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?$/) || [];
    return { menuId: MENUS[menuId] ? menuId : null, entryId: MENUS[menuId] ? entryId : null };
}

/* history.state: { depth, below } where `below` counts the app's own steps
   under this one, i.e. how far Back can rewind within the site */
const currentState = () => history.state || { depth: 0, below: 0 };

let routeTarget = null; /* while restoring a route, the address being restored */
let ignorePops = 0;     /* popstates caused by our own history.go() rewinds */

/* --- PAGE TITLES --- */
/* The tab title follows the view: "Stellar Core · Projects · Julien Jin".
   It names tabs, browser history entries and bookmarks, and screen readers
   read it when a tab is revisited. */
const titleCase = (text) => text.toLowerCase().replace(/(^|[\s\[(-])(\p{L})/gu, (m, gap, letter) => gap + letter.toUpperCase());

function updateTitle(menuId, entryId) {
    const parts = [];
    if (menuId) {
        const entry = entryId && (MENUS[menuId].entries || []).find(e => e.id === entryId);
        if (entry) parts.push(titleCase(entry.title));
        const label = astreFor(menuId)?.dataset.label || menuId;
        parts.push(titleCase(label.replace(/^\[(.*)\]$/, '$1')));
    }
    parts.push(SITE_NAME);
    document.title = parts.join(' · ');
}

/* Called by the menu and camera whenever the visible view changes */
function syncRoute(menuId, entryId) {
    updateTitle(menuId, entryId);
    const route = routeOf(menuId, entryId);
    const depth = depthOf(menuId, entryId);

    /* Restoring a route: intermediate views stay out of history */
    if (routeTarget !== null) {
        if (route === routeTarget.route) routeTarget = null;
        else if (routeTarget.entryId && menuId === routeTarget.menuId && !entryId) continueToEntry();
        return;
    }

    const cur = currentState();
    if (route === (location.hash || '') && depth === cur.depth) return;

    if (depth > cur.depth) {
        history.pushState({ depth, below: cur.below + 1 }, '', urlOf(route));
    } else if (depth === cur.depth) {
        history.replaceState(cur, '', urlOf(route));
    } else {
        const steps = cur.depth - depth;
        if (cur.below >= steps) {
            /* Rewind to our own earlier step; the UI is already there */
            ignorePops++;
            history.go(-steps);
        } else {
            /* Arrived from a shared link: there is nothing of ours to rewind */
            history.replaceState({ depth, below: 0 }, '', urlOf(route));
        }
    }
}

/* Restoring #/menu/entry: once the menu has opened, open the entry */
function continueToEntry() {
    const { menuId, entryId } = routeTarget;
    setTimeout(() => {
        const i = MENUS[menuId].entries ? MENUS[menuId].entries.findIndex(e => e.id === entryId) : -1;
        if (i >= 0 && menuState.id === menuId) {
            openEntry(i);
        } else {
            /* Unknown entry: settle on the menu itself */
            routeTarget = null;
            history.replaceState(currentState(), '', urlOf(routeOf(menuId, null)));
        }
    }, 0);
}

function astreFor(menuId) {
    return [...astreBtns].find(btn => btn.dataset.menu === menuId);
}

/* Bring the UI to the view in the address (Back/Forward, or a shared link) */
function applyRoute() {
    const { menuId, entryId } = parseRoute();
    const target = { menuId, entryId, route: routeOf(menuId, entryId) };
    const focused = document.body.classList.contains('planet-focused');

    if (!menuId) {
        if (!focused) return;
        routeTarget = target;
        resetCamera();
        return;
    }

    /* Same astre already open: only the entry changes */
    if (focused && menuState.id === menuId) {
        routeTarget = target;
        const entries = MENUS[menuId].entries || [];
        const i = entryId ? entries.findIndex(e => e.id === entryId) : -1;
        if (i >= 0) openEntry(i);
        else if (menuState.reading) closeEntry();
        else routeTarget = null;
        return;
    }

    routeTarget = target;
    const open = () => astreFor(menuId).click();
    if (focused) {
        /* Another astre is open: go home first, then over to this one */
        resetCamera();
        uiTimeouts.push(setTimeout(open, RETURN_PAN_MS));
    } else {
        open();
    }
}

window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
        ignorePops--;
        return;
    }
    applyRoute();
});

/* A shared link: skip the intro and go straight to its astre */
history.replaceState({ depth: depthOf(parseRoute().menuId, parseRoute().entryId), below: 0 }, '', location.href);
if (parseRoute().menuId) {
    setTimeout(applyRoute, 300);
} else if (location.hash) {
    /* Unknown address: clean it up and stay home */
    history.replaceState({ depth: 0, below: 0 }, '', urlOf(''));
}

/* --- EXTERNAL LINKS --- */
/* Links that leave the site (GitHub, LinkedIn, demos) and documents (CV)
   open in a new tab, marked with ↗ so it is clear before clicking. The site
   keeps its place either way, thanks to the addresses above. */
function markExternalLinks(root) {
    root.querySelectorAll('a[href]').forEach(a => {
        const url = new URL(a.getAttribute('href'), location.href);
        const leavesSite = /^https?:$/.test(url.protocol) && url.origin !== location.origin;
        const isDocument = /\.pdf$/i.test(url.pathname);
        if (!leavesSite && !isDocument) return;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        if (!a.querySelector('.ext-mark')) {
            const mark = document.createElement('span');
            mark.className = 'ext-mark';
            mark.setAttribute('aria-label', '(opens in a new tab)');
            mark.textContent = ' ↗';
            a.appendChild(mark);
        }
    });
    return root;
}
