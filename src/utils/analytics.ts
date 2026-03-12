const ANALYTICS_FALLBACK_ENDPOINT = 'https://bilateria.org/app/estadistica/escritorio-digital/track.php';
const ANALYTICS_VISIT_COOLDOWN_MS = 30 * 60 * 1000;

type AnalyticsPayload = {
    ok?: boolean;
};

type AnalyticsConfig = {
    endpoint: string;
    siteId: string;
};

function getMetaContent(name: string): string {
    const element = document.querySelector(`meta[name="${name}"]`);
    return String(element?.getAttribute('content') || '').trim();
}

function getAnalyticsConfig(): AnalyticsConfig {
    return {
        endpoint: getMetaContent('analytics-endpoint') || ANALYTICS_FALLBACK_ENDPOINT,
        siteId: getMetaContent('analytics-site-id') || 'escritorio-digital',
    };
}

function getAnalyticsVisitStorageKey(siteId: string): string {
    return `analytics:last-visit:${siteId}`;
}

function shouldCountAnalyticsVisit(siteId: string): boolean {
    try {
        const raw = window.localStorage.getItem(getAnalyticsVisitStorageKey(siteId)) || '';
        const lastVisit = Number.parseInt(raw, 10);
        if (Number.isFinite(lastVisit) && Date.now() - lastVisit < ANALYTICS_VISIT_COOLDOWN_MS) {
            return false;
        }
    } catch {
        return true;
    }

    return true;
}

function rememberAnalyticsVisit(siteId: string): void {
    try {
        window.localStorage.setItem(getAnalyticsVisitStorageKey(siteId), String(Date.now()));
    } catch {
        // Best effort only.
    }
}

function shouldTrackAnalytics(): boolean {
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
        return false;
    }

    const host = String(window.location.hostname || '').toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && !host.endsWith('.local');
}

function loadAnalyticsVisit(): void {
    if (!shouldTrackAnalytics()) {
        return;
    }

    const config = getAnalyticsConfig();
    if (!config.endpoint) {
        return;
    }

    const shouldCountVisit = shouldCountAnalyticsVisit(config.siteId);
    const callbackName = `__escritorioAnalyticsCallback_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const callbackStore = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    const params = new URLSearchParams();
    let settled = false;
    let timeoutId = 0;

    params.set('site', config.siteId);
    params.set('callback', callbackName);
    params.set('page_url', window.location.href);
    params.set('referrer', document.referrer || '');
    if (!shouldCountVisit) {
        params.set('summary_only', '1');
    }

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
        const value = String(new URLSearchParams(window.location.search).get(key) || '').trim();
        if (value !== '') {
            params.set(key, value);
        }
    });

    const cleanup = () => {
        if (settled) {
            return;
        }

        settled = true;
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }

        try {
            delete callbackStore[callbackName];
        } catch {
            callbackStore[callbackName] = undefined;
        }

        script.remove();
    };

    callbackStore[callbackName] = (payload: AnalyticsPayload) => {
        try {
            if (shouldCountVisit && payload?.ok) {
                rememberAnalyticsVisit(config.siteId);
            }
        } finally {
            cleanup();
        }
    };

    script.async = true;
    script.src = `${config.endpoint}${config.endpoint.includes('?') ? '&' : '?'}${params.toString()}`;
    script.onerror = () => {
        cleanup();
    };

    timeoutId = window.setTimeout(cleanup, 4000);
    document.head.appendChild(script);
}

export function scheduleAnalyticsTracking(): void {
    if (!shouldTrackAnalytics()) {
        return;
    }

    const run = () => {
        window.setTimeout(loadAnalyticsVisit, 0);
    };

    if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(run, { timeout: 2500 });
        return;
    }

    if (document.readyState === 'complete') {
        run();
        return;
    }

    window.addEventListener('load', run, { once: true });
}
