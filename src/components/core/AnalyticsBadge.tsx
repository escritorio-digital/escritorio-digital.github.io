import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Eye } from 'lucide-react';

type AnalyticsSummary = {
    total: number;
    today: number;
};

const ANALYTICS_FALLBACK_ENDPOINT = 'https://bilateria.org/app/estadistica/escritorio-digital/track.php';
const ANALYTICS_FALLBACK_STATS_URL = 'https://bilateria.org/app/estadistica/escritorio-digital/admin-stats.php';
const ANALYTICS_SITE_ID = 'escritorio-digital';
const ANALYTICS_VISIT_COOLDOWN_MS = 30 * 60 * 1000;

function getMetaContent(name: string): string {
    const node = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    return String(node?.content || '').trim();
}

function getAnalyticsConfig() {
    return {
        endpoint: getMetaContent('analytics-endpoint') || ANALYTICS_FALLBACK_ENDPOINT,
        statsUrl: getMetaContent('analytics-stats-url') || ANALYTICS_FALLBACK_STATS_URL,
        siteId: getMetaContent('analytics-site-id') || ANALYTICS_SITE_ID,
    };
}

function getAnalyticsVisitStorageKey(siteId: string): string {
    return `analytics:last-visit:${siteId}`;
}

function shouldTrackAnalytics(): boolean {
    const protocol = String(window.location.protocol || '');
    const host = String(window.location.hostname || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    return !host.endsWith('.local');
}

function shouldCountAnalyticsVisit(siteId: string): boolean {
    try {
        const lastVisit = Number.parseInt(window.localStorage.getItem(getAnalyticsVisitStorageKey(siteId)) || '', 10);
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

export function AnalyticsBadge() {
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [statsUrl, setStatsUrl] = useState<string>(getAnalyticsConfig().statsUrl);

    useEffect(() => {
        if (!shouldTrackAnalytics()) return;

        const config = getAnalyticsConfig();
        if (!config.endpoint) return;
        setStatsUrl(config.statsUrl);

        let isMounted = true;
        const callbackStore = window as unknown as Record<string, unknown>;
        const callbackName = `__desktopAnalytics_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        const query = new URLSearchParams();
        const urlParams = new URLSearchParams(window.location.search || '');
        const script = document.createElement('script');
        let settled = false;
        let timeoutId = 0;
        const shouldCountVisit = shouldCountAnalyticsVisit(config.siteId);

        const cleanup = () => {
            if (settled) return;
            settled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
            try {
                delete callbackStore[callbackName];
            } catch {
                callbackStore[callbackName] = undefined;
            }
            script.remove();
        };

        query.set('site', config.siteId);
        query.set('callback', callbackName);
        query.set('page_url', window.location.href);
        query.set('referrer', document.referrer || '');
        if (!shouldCountVisit) query.set('summary_only', '1');
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
            const value = String(urlParams.get(key) || '').trim();
            if (value) query.set(key, value);
        });

        callbackStore[callbackName] = (payload: unknown) => {
            try {
                if (!isMounted || !payload || typeof payload !== 'object') return;
                const total = Number.parseInt(String((payload as { total?: number }).total ?? ''), 10);
                const today = Number.parseInt(String((payload as { today?: number }).today ?? ''), 10);
                if (Number.isFinite(total) && Number.isFinite(today)) {
                    setSummary({ total, today });
                }
                if (shouldCountVisit && 'ok' in payload && (payload as { ok?: boolean }).ok) {
                    rememberAnalyticsVisit(config.siteId);
                }
            } finally {
                cleanup();
            }
        };

        script.async = true;
        script.src = `${config.endpoint}${config.endpoint.includes('?') ? '&' : '?'}${query.toString()}`;
        script.onerror = () => cleanup();
        timeoutId = window.setTimeout(cleanup, 4000);

        const run = () => document.head.append(script);
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(run, { timeout: 2500 });
        } else if (document.readyState === 'complete') {
            window.setTimeout(run, 0);
        } else {
            window.addEventListener('load', () => window.setTimeout(run, 0), { once: true });
        }

        return () => {
            isMounted = false;
            cleanup();
        };
    }, []);

    if (!summary) return null;

    return (
        <a
            href={statsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Estadisticas: ${summary.total} visitas totales y ${summary.today} hoy`}
            title={`Visitas totales: ${summary.total}. Hoy: ${summary.today}.`}
            className="fixed right-4 top-4 z-[10002] inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text-dark shadow-lg backdrop-blur-md transition hover:bg-white"
        >
            <span className="inline-flex items-center gap-1.5">
                <BarChart3 size={14} />
                <span className="inline-flex items-center gap-1">
                    <Eye size={13} />
                    <span>{summary.total}</span>
                </span>
            </span>
            <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} />
                <span>{summary.today}</span>
            </span>
        </a>
    );
}
