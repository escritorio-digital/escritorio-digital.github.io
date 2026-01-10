import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetConfig } from '../../../types';
import { withBaseUrl } from '../../../utils/assetPaths';
import { FolderOpen, Trash2, Eye, UploadCloud, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { unzipSync } from 'fflate';
import './LocalWebWidget.css';

type SiteMeta = {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    fileCount: number;
    totalBytes: number;
};

type StoredFile = {
    key: string;
    siteId: string;
    path: string;
    blob: Blob;
    size: number;
    type: string;
};

type StorageEstimate = {
    usage: number | null;
    quota: number | null;
};

const DB_NAME = 'escritorio-digital-sites';
const DB_VERSION = 1;
const STORE_SITES = 'sites';
const STORE_FILES = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
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
    }
    return dbPromise;
};

const withStore = async <T,>(
    storeName: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
    const db = await openDb();
    return new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getAllSites = async (): Promise<SiteMeta[]> => {
    const result = await withStore<SiteMeta[]>(STORE_SITES, 'readonly', (store) => store.getAll());
    return result ?? [];
};

const saveSite = async (site: SiteMeta): Promise<void> => {
    await withStore(STORE_SITES, 'readwrite', (store) => store.put(site));
};

const deleteSite = async (siteId: string): Promise<void> => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_SITES, STORE_FILES], 'readwrite');
        tx.objectStore(STORE_SITES).delete(siteId);
        const fileStore = tx.objectStore(STORE_FILES);
        const index = fileStore.index('siteId');
        const request = index.getAllKeys(IDBKeyRange.only(siteId));
        request.onsuccess = () => {
            const keys = request.result as string[];
            keys.forEach((key) => fileStore.delete(key));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getFilesForSite = async (siteId: string): Promise<StoredFile[]> => {
    const db = await openDb();
    return new Promise<StoredFile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const index = store.index('siteId');
        const request = index.getAll(IDBKeyRange.only(siteId));
        request.onsuccess = () => resolve((request.result as StoredFile[]) ?? []);
        request.onerror = () => reject(request.error);
    });
};

const saveFiles = async (files: StoredFile[]): Promise<void> => {
    if (files.length === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        files.forEach((file) => store.put(file));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const guessMimeType = (path: string): string => {
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
    return 'application/octet-stream';
};

const normalizePath = (path: string): string => {
    return path.replace(/\\/g, '/').replace(/^\.?\//, '');
};

const resolvePath = (basePath: string, relativePath: string): string => {
    if (relativePath.startsWith('/')) {
        return normalizePath(relativePath.slice(1));
    }
    const baseParts = normalizePath(basePath).split('/');
    baseParts.pop();
    const relParts = relativePath.split('/');
    const combined = [...baseParts, ...relParts];
    const resolved: string[] = [];
    combined.forEach((part) => {
        if (!part || part === '.') return;
        if (part === '..') {
            resolved.pop();
        } else {
            resolved.push(part);
        }
    });
    return resolved.join('/');
};

const rewriteCssUrls = (css: string, cssPath: string, urlMap: Map<string, string>): string => {
    return css.replace(/url\(([^)]+)\)/g, (match, rawUrl) => {
        const trimmed = String(rawUrl).trim().replace(/^['"]|['"]$/g, '');
        if (
            trimmed.startsWith('data:') ||
            trimmed.startsWith('http:') ||
            trimmed.startsWith('https:') ||
            trimmed.startsWith('blob:') ||
            trimmed.startsWith('#')
        ) {
            return match;
        }
        const resolved = resolvePath(cssPath, trimmed);
        const mapped = urlMap.get(resolved);
        if (!mapped) return match;
        return `url("${mapped}")`;
    });
};

const rewriteHtmlDocument = (
    html: string,
    entryPath: string,
    urlMap: Map<string, string>,
    cssMap: Map<string, string>
): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const replaceAttr = (selector: string, attribute: string) => {
        const elements = Array.from(doc.querySelectorAll(selector));
        elements.forEach((element) => {
            const value = element.getAttribute(attribute);
            if (!value) return;
            if (
                value.startsWith('http:') ||
                value.startsWith('https:') ||
                value.startsWith('data:') ||
                value.startsWith('blob:') ||
                value.startsWith('#') ||
                value.startsWith('mailto:')
            ) {
                return;
            }
            const resolved = resolvePath(entryPath, value);
            const mapped = (attribute === 'href' ? cssMap.get(resolved) : null) || urlMap.get(resolved);
            if (mapped) {
                element.setAttribute(attribute, mapped);
            }
        });
    };

    const rewriteSrcset = (value: string): string => {
        const entries = value.split(',').map((part) => part.trim()).filter(Boolean);
        const rewritten = entries.map((entry) => {
            const parts = entry.split(/\s+/);
            const url = parts[0];
            if (
                url.startsWith('http:') ||
                url.startsWith('https:') ||
                url.startsWith('data:') ||
                url.startsWith('blob:') ||
                url.startsWith('#') ||
                url.startsWith('mailto:')
            ) {
                return entry;
            }
            const resolved = resolvePath(entryPath, url);
            const mapped = urlMap.get(resolved);
            if (!mapped) return entry;
            parts[0] = mapped;
            return parts.join(' ');
        });
        return rewritten.join(', ');
    };

    replaceAttr('img[src]', 'src');
    replaceAttr('script[src]', 'src');
    replaceAttr('link[href]', 'href');
    replaceAttr('source[src]', 'src');
    replaceAttr('video[src]', 'src');
    replaceAttr('audio[src]', 'src');
    replaceAttr('iframe[src]', 'src');
    replaceAttr('a[href]', 'href');
    replaceAttr('form[action]', 'action');

    const srcsetElements = Array.from(doc.querySelectorAll('img[srcset], source[srcset]'));
    srcsetElements.forEach((element) => {
        const value = element.getAttribute('srcset');
        if (!value) return;
        element.setAttribute('srcset', rewriteSrcset(value));
    });

    const styleTags = Array.from(doc.querySelectorAll('style'));
    styleTags.forEach((style) => {
        if (!style.textContent) return;
        style.textContent = rewriteCssUrls(style.textContent, entryPath, urlMap);
    });

    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
};

const formatBytes = (value: number): string => {
    if (!Number.isFinite(value)) return '0 B';
    if (value < 1024) return `${value} B`;
    const kb = value / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
};

const fetchStorageEstimate = async (): Promise<StorageEstimate> => {
    if (!navigator.storage || !navigator.storage.estimate) {
        return { usage: null, quota: null };
    }
    const estimate = await navigator.storage.estimate();
    return {
        usage: typeof estimate.usage === 'number' ? estimate.usage : null,
        quota: typeof estimate.quota === 'number' ? estimate.quota : null,
    };
};

export const LocalWebWidget: FC = () => {
    const { t } = useTranslation();
    const [sites, setSites] = useState<SiteMeta[]>([]);
    const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [storageEstimate, setStorageEstimate] = useState<StorageEstimate>({ usage: null, quota: null });
    const [localUsage, setLocalUsage] = useState(0);
    const [isListCollapsed, setIsListCollapsed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const objectUrlsRef = useRef<string[]>([]);

    const refreshSites = async () => {
        const allSites = await getAllSites();
        allSites.sort((a, b) => b.updatedAt - a.updatedAt);
        setSites(allSites);
        setLocalUsage(allSites.reduce((sum, site) => sum + site.totalBytes, 0));
    };

    const refreshStorage = async () => {
        const estimate = await fetchStorageEstimate();
        setStorageEstimate(estimate);
    };

    useEffect(() => {
        refreshSites();
        refreshStorage();
    }, []);

    useEffect(() => {
        const node = folderInputRef.current as HTMLInputElement & { webkitdirectory?: boolean };
        if (node) {
            node.webkitdirectory = true;
            node.setAttribute('webkitdirectory', '');
            node.setAttribute('directory', '');
        }
    }, []);

    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            objectUrlsRef.current = [];
        };
    }, []);

    const storageLabel = useMemo(() => {
        const { quota } = storageEstimate;
        if (quota != null) {
            const percent = Math.min(100, Math.round((localUsage / quota) * 100));
            return t('widgets.local_web.storage_usage', {
                used: formatBytes(localUsage),
                total: formatBytes(quota),
                percent,
            });
        }
        return t('widgets.local_web.storage_local_used', { used: formatBytes(localUsage) });
    }, [storageEstimate, localUsage, t]);

    const storageClass = useMemo(() => {
        const { quota } = storageEstimate;
        if (quota == null) {
            return 'local-web-storage-neutral';
        }
        const ratio = localUsage / quota;
        if (ratio < 0.7) return 'local-web-storage-ok';
        if (ratio < 0.85) return 'local-web-storage-warn';
        return 'local-web-storage-danger';
    }, [storageEstimate, localUsage]);

    const storagePercent = useMemo(() => {
        const { quota } = storageEstimate;
        if (quota == null) return null;
        return Math.min(100, Math.max(0, Math.round((localUsage / quota) * 100)));
    }, [storageEstimate, localUsage]);

    const resetPreview = () => {
        setActiveSiteId(null);
        setPreviewUrl(null);
        setPreviewName('');
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current = [];
    };

    const openPreviewInWindow = () => {
        if (!previewUrl) return;
        const width = window.screen.width;
        const height = window.screen.height;
        const popup = window.open(
            '',
            '_blank',
            `popup=1,width=${width},height=${height},left=0,top=0`
        );
        if (!popup) return;
        const escapedTitle = previewName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        popup.document.write(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapedTitle}</title>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      body { display: flex; flex-direction: column; font-family: sans-serif; }
      header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f5f5f5; border-bottom: 1px solid #e0e0e0; }
      button { border: 1px solid #ccc; background: #fff; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
      iframe { flex: 1; border: 0; width: 100%; }
    </style>
  </head>
  <body>
    <header>
      <span>${escapedTitle}</span>
      <div>
        <button id="fullscreen">${t('widgets.local_web.open_fullscreen_button')}</button>
        <button id="close">${t('widgets.local_web.close_window_button')}</button>
      </div>
    </header>
    <iframe src="${previewUrl}" title="${escapedTitle}"></iframe>
    <script>
      const fullBtn = document.getElementById('fullscreen');
      const closeBtn = document.getElementById('close');
      fullBtn.addEventListener('click', () => {
        const root = document.documentElement;
        if (root.requestFullscreen) root.requestFullscreen();
      });
      closeBtn.addEventListener('click', () => window.close());
    </script>
  </body>
</html>`);
        popup.document.close();
        popup.focus();
    };

    const importZip = async (file: File) => {
        const confirm = window.confirm(t('widgets.local_web.confirm_extract', { name: file.name }));
        if (!confirm) return;
        setStatusMessage(t('widgets.local_web.importing'));
        const buffer = await file.arrayBuffer();
        const entries = unzipSync(new Uint8Array(buffer));
        const files: StoredFile[] = [];
        Object.keys(entries).forEach((path) => {
            if (path.endsWith('/') || path.startsWith('__MACOSX/')) return;
            const normalized = normalizePath(path);
            const data = entries[path];
            const type = guessMimeType(normalized);
            const blob = new Blob([data], { type });
            files.push({
                key: '',
                siteId: '',
                path: normalized,
                blob,
                size: blob.size,
                type,
            });
        });

        if (files.length === 0) {
            setStatusMessage(t('widgets.local_web.import_empty'));
            return;
        }

        const siteId = crypto.randomUUID();
        const now = Date.now();
        const site: SiteMeta = {
            id: siteId,
            name: file.name.replace(/\.zip$/i, ''),
            createdAt: now,
            updatedAt: now,
            fileCount: files.length,
            totalBytes: files.reduce((sum, item) => sum + item.size, 0),
        };

        files.forEach((item) => {
            item.siteId = siteId;
            item.key = `${siteId}::${item.path}`;
        });

        await saveSite(site);
        await saveFiles(files);
        setStatusMessage(t('widgets.local_web.import_done'));
        await refreshSites();
        await refreshStorage();
    };

    const importFolder = async (files: FileList) => {
        if (!files.length) return;
        setStatusMessage(t('widgets.local_web.importing'));
        const siteId = crypto.randomUUID();
        const now = Date.now();
        const storedFiles: StoredFile[] = [];
        Array.from(files).forEach((file) => {
            const relativePath = normalizePath((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
            const blob = file.slice(0, file.size, file.type || guessMimeType(relativePath));
            storedFiles.push({
                key: `${siteId}::${relativePath}`,
                siteId,
                path: relativePath,
                blob,
                size: blob.size,
                type: blob.type,
            });
        });

        const folderName = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] || files[0].name;
        const site: SiteMeta = {
            id: siteId,
            name: folderName,
            createdAt: now,
            updatedAt: now,
            fileCount: storedFiles.length,
            totalBytes: storedFiles.reduce((sum, item) => sum + item.size, 0),
        };

        await saveSite(site);
        await saveFiles(storedFiles);
        setStatusMessage(t('widgets.local_web.import_done'));
        await refreshSites();
        await refreshStorage();
    };

    const openSite = async (site: SiteMeta) => {
        setStatusMessage(t('widgets.local_web.loading'));
        const files = await getFilesForSite(site.id);
        const fileMap = new Map<string, StoredFile>();
        files.forEach((file) => fileMap.set(normalizePath(file.path), file));
        const entryPath =
            files.find((file) => file.path.toLowerCase().endsWith('index.html'))?.path ||
            files.find((file) => file.path.toLowerCase().endsWith('index.htm'))?.path ||
            '';
        if (!entryPath) {
            setStatusMessage(t('widgets.local_web.missing_index'));
            return;
        }

        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current = [];
        const urlMap = new Map<string, string>();
        files.forEach((file) => {
            const url = URL.createObjectURL(file.blob);
            objectUrlsRef.current.push(url);
            urlMap.set(normalizePath(file.path), url);
        });

        const cssMap = new Map<string, string>();
        for (const file of files.filter((item) => item.path.toLowerCase().endsWith('.css'))) {
            try {
                const cssText = await file.blob.text();
                const rewritten = rewriteCssUrls(cssText, file.path, urlMap);
                const blob = new Blob([rewritten], { type: 'text/css' });
                const url = URL.createObjectURL(blob);
                objectUrlsRef.current.push(url);
                cssMap.set(normalizePath(file.path), url);
            } catch {
                // Ignore CSS rewrite errors and keep original URL mapping.
            }
        }

        const entryFile = fileMap.get(normalizePath(entryPath));
        if (!entryFile) {
            setStatusMessage(t('widgets.local_web.missing_index'));
            return;
        }
        const htmlText = await entryFile.blob.text();
        const rewrittenHtml = rewriteHtmlDocument(htmlText, entryPath, urlMap, cssMap);
        const htmlBlob = new Blob([rewrittenHtml], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        objectUrlsRef.current.push(htmlUrl);
        setPreviewName(site.name);
        setPreviewUrl(htmlUrl);
        setActiveSiteId(site.id);
        setStatusMessage('');
    };

    const handleZipInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await importZip(file);
        event.target.value = '';
    };

    const handleFolderInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        await importFolder(event.target.files);
        event.target.value = '';
    };


    const handleDeleteSite = async (siteId: string) => {
        const confirm = window.confirm(t('widgets.local_web.confirm_delete'));
        if (!confirm) return;
        if (activeSiteId === siteId) {
            resetPreview();
        }
        await deleteSite(siteId);
        await refreshSites();
        await refreshStorage();
    };

    return (
        <div className="local-web-widget">
            <div className="local-web-header">
                <div className="local-web-title">
                    <FolderOpen size={18} />
                    <span>{t('widgets.local_web.title')}</span>
                </div>
                <div className="local-web-actions">
                    <button
                        className="local-web-button local-web-button-secondary"
                        onClick={() => setIsListCollapsed((prev) => !prev)}
                    >
                        {isListCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        {isListCollapsed ? t('widgets.local_web.expand_list') : t('widgets.local_web.collapse_list')}
                    </button>
                    <button
                        className="local-web-button"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud size={16} />
                        {t('widgets.local_web.import_zip')}
                    </button>
                    <button
                        className="local-web-button"
                        onClick={() => folderInputRef.current?.click()}
                    >
                        {t('widgets.local_web.import_folder')}
                    </button>
                </div>
            </div>

            <div className={`local-web-storage ${storageClass}`}>
                <div className="local-web-storage-text">{storageLabel}</div>
                {storagePercent !== null && (
                    <div className="local-web-storage-bar">
                        <div className="local-web-storage-bar-fill" style={{ width: `${storagePercent}%` }} />
                    </div>
                )}
            </div>

            <div className={`local-web-body${isListCollapsed ? ' local-web-body-collapsed' : ''}`}>
                <div className={`local-web-list${isListCollapsed ? ' local-web-list-collapsed' : ''}`}>
                        {statusMessage && <div className="local-web-status">{statusMessage}</div>}

                        {sites.length === 0 && (
                            <div className="local-web-empty">{t('widgets.local_web.empty_state')}</div>
                        )}

                        {sites.map((site) => (
                            <div key={site.id} className="local-web-site">
                                <div className="local-web-site-info">
                                    <div className="local-web-site-name">{site.name}</div>
                                    <div className="local-web-site-meta">
                                        {t('widgets.local_web.site_meta', {
                                            files: site.fileCount,
                                            size: formatBytes(site.totalBytes),
                                        })}
                                    </div>
                                </div>
                                <div className="local-web-site-actions">
                                    <button className="local-web-icon-button" onClick={() => openSite(site)}>
                                        <Eye size={16} />
                                    </button>
                                    <button className="local-web-icon-button local-web-delete" onClick={() => handleDeleteSite(site.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>

                <div className="local-web-preview">
                    {previewUrl ? (
                        <>
                            <div className="local-web-preview-header">
                                <span>{previewName}</span>
                                <div className="local-web-preview-actions">
                                    <button className="local-web-button local-web-button-secondary" onClick={openPreviewInWindow}>
                                        <Maximize2 size={14} />
                                        {t('widgets.local_web.open_fullscreen_window')}
                                    </button>
                                    <button className="local-web-button local-web-button-secondary" onClick={resetPreview}>
                                        {t('widgets.local_web.close_preview')}
                                    </button>
                                </div>
                            </div>
                            <iframe
                                className="local-web-iframe"
                                src={previewUrl}
                                title={previewName}
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            />
                        </>
                    ) : (
                        <div className="local-web-preview-placeholder">
                            {t('widgets.local_web.preview_placeholder')}
                        </div>
                    )}
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleZipInput}
            />
            <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                onChange={handleFolderInput}
            />
        </div>
    );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'local-web',
    title: 'widgets.local_web.title',
    icon: (() => {
        const WidgetIcon: FC = () => {
            const { t } = useTranslation();
            return <img src={withBaseUrl('icons/LocalWeb.png')} alt={t('widgets.local_web.title')} width={52} height={52} />;
        };
        return <WidgetIcon />;
    })(),
    defaultSize: { width: 900, height: 600 },
};
