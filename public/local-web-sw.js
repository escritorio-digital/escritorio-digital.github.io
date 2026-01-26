const DB_NAME = 'escritorio-digital-sites';
const DB_VERSION = 1;
const STORE_SITES = 'sites';
const STORE_FILES = 'files';
let dbPromise = null;

const openDb = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_SITES)) {
                db.createObjectStore(STORE_SITES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                const store = db.createObjectStore(STORE_FILES, { keyPath: 'key' });
                store.createIndex('siteId', 'siteId', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
};

const getSite = (siteId) => {
    return openDb().then((db) => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_SITES, 'readonly');
            const store = tx.objectStore(STORE_SITES);
            const request = store.get(siteId);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    });
};

const getFile = (siteId, path) => {
    const key = `${siteId}::${path}`;
    return openDb().then((db) => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_FILES, 'readonly');
            const store = tx.objectStore(STORE_FILES);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    });
};

const guessMimeType = (path) => {
    const lower = path.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
    if (lower.endsWith('.css')) return 'text/css';
    if (lower.endsWith('.js')) return 'text/javascript';
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.woff')) return 'font/woff';
    if (lower.endsWith('.woff2')) return 'font/woff2';
    if (lower.endsWith('.ttf')) return 'font/ttf';
    if (lower.endsWith('.otf')) return 'font/otf';
    if (lower.endsWith('.ico')) return 'image/x-icon';
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'application/octet-stream';
};

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }
    const url = new URL(event.request.url);
    const scopePath = new URL(self.registration.scope).pathname;
    const prefix = `${scopePath}site/`;
    if (!url.pathname.startsWith(prefix)) {
        return;
    }
    event.respondWith(handleSiteRequest(url, scopePath));
});

const serveFileResponse = (record, path) => {
    if (!record || !record.blob) {
        return new Response('Not cached', { status: 404 });
    }
    const type = record.type || guessMimeType(path);
    return new Response(record.blob, {
        status: 200,
        headers: { 'Content-Type': type },
    });
};

const resolveRootPath = (siteId) => {
    return getSite(siteId).then((site) => {
        if (site && site.indexPath) return site.indexPath;
        return 'index.html';
    });
};

const resolveDirectoryPath = (siteId, dirPath) => {
    const candidates = [`${dirPath}index.html`, `${dirPath}index.htm`];
    return getFile(siteId, candidates[0]).then((record) => {
        if (record) return { record, path: candidates[0] };
        return getFile(siteId, candidates[1]).then((record2) => {
            if (record2) return { record: record2, path: candidates[1] };
            return null;
        });
    });
};

function handleSiteRequest(url, scopePath) {
    const relative = url.pathname.slice(scopePath.length);
    const parts = relative.split('/');
    if (parts[0] !== 'site' || !parts[1]) {
        return fetch(url);
    }
    const siteId = parts[1];
    let path = parts.slice(2).join('/');
    const isDirectory = !path || path.endsWith('/');
    if (path) {
        try {
            path = decodeURIComponent(path);
        } catch {
            return new Response('Bad request', { status: 400 });
        }
    }
    if (!path && !isDirectory) {
        return new Response('Bad request', { status: 400 });
    }
    if (!isDirectory) {
        return getFile(siteId, path).then((record) => serveFileResponse(record, path));
    }
    const dirPath = path || '';
    if (!dirPath) {
        return resolveRootPath(siteId).then((resolvedPath) => {
            return getFile(siteId, resolvedPath).then((record) => serveFileResponse(record, resolvedPath));
        });
    }
    return resolveDirectoryPath(siteId, dirPath).then((result) => {
        if (!result) return new Response('Not cached', { status: 404 });
        return serveFileResponse(result.record, result.path);
    });
}
