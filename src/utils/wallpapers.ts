const wallpaperModules = import.meta.glob('../assets/backgrounds/*.webp', {
    import: 'default',
}) as Record<string, () => Promise<string>>;

const WALLPAPER_IDS = [
    'fondo01',
    'fondo02',
    'fondo03',
    'fondo04',
    'fondo05',
    'fondo06',
    'fondo07',
    'fondo08',
    'fondo09',
    'fondo10',
    'fondo11',
    'fondo12',
    'fondo13',
    'fondo14',
    'fondo15',
    'fondo16',
    'gemini-16uf0k16uf0k16uf',
    'gemini-2ap5fj2ap5fj2ap5',
    'gemini-9lvikq9lvikq9lvi',
    'gemini-louvkrlouvkrlouv',
    'gemini-xiejfxiejfxiejfx',
    'gemini-yntaleyntaleynta',
] as const;

const preferredOrder = [
    'gemini-9lvikq9lvikq9lvi',
    'gemini-16uf0k16uf0k16uf',
    'gemini-louvkrlouvkrlouv',
    'gemini-xiejfxiejfxiejfx',
    'gemini-2ap5fj2ap5fj2ap5',
    'gemini-yntaleyntaleynta',
];

const orderIndex = new Map(preferredOrder.map((id, index) => [id, index]));
const pattern = /\/([^/]+?)(?:-(\d+))?\.webp$/;

type WallpaperOption = {
    id: string;
    sizes: number[];
    urlsBySize: Record<number, string>;
    previewUrl: string;
    urls: string[];
};

let wallpaperOptionsPromise: Promise<WallpaperOption[]> | null = null;

const defaultWallpaperUrlsBySize = {
    1920: new URL('../assets/backgrounds/gemini-9lvikq9lvikq9lvi-1920.webp', import.meta.url).href,
    2560: new URL('../assets/backgrounds/gemini-9lvikq9lvikq9lvi-2560.webp', import.meta.url).href,
};

const getTargetWidth = () => {
    if (typeof window === 'undefined') return 1920;
    return Math.floor(window.innerWidth * (window.devicePixelRatio || 1));
};

const pickBestUrl = (urlsBySize: Record<number, string>) => {
    const sizes = Object.keys(urlsBySize).map(Number).sort((a, b) => a - b);
    const target = getTargetWidth();
    const match = sizes.find((size) => size >= target);
    const size = match ?? sizes[sizes.length - 1];
    return urlsBySize[size];
};

export type { WallpaperOption };

export const defaultWallpaperValue = `url(${pickBestUrl(defaultWallpaperUrlsBySize)})`;

export const getBestWallpaperUrl = (option: WallpaperOption) => pickBestUrl(option.urlsBySize);

export const getWallpaperValue = (option: WallpaperOption) => `url(${getBestWallpaperUrl(option)})`;

export const isWallpaperValueValid = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.startsWith('url(') || !trimmed.endsWith(')')) return false;
    return WALLPAPER_IDS.some((id) => trimmed.includes(id.toLowerCase()));
};

export const loadWallpaperOptions = async (): Promise<WallpaperOption[]> => {
    if (!wallpaperOptionsPromise) {
        wallpaperOptionsPromise = (async () => {
            const entries = await Promise.all(
                Object.entries(wallpaperModules).map(async ([path, loader]) => [path, await loader()] as const)
            );
            const grouped: Record<string, Record<number, string>> = {};

            entries.forEach(([path, url]) => {
                const match = path.match(pattern);
                if (!match) return;
                const id = match[1];
                const size = match[2] ? Number(match[2]) : 0;
                if (!grouped[id]) grouped[id] = {};
                grouped[id][size] = url;
            });

            return Object.entries(grouped)
                .map(([id, urlsBySize]) => {
                    const sizes = Object.keys(urlsBySize).map(Number).sort((a, b) => a - b);
                    const previewSize = sizes[0];
                    return {
                        id,
                        sizes,
                        urlsBySize,
                        previewUrl: urlsBySize[previewSize],
                        urls: sizes.map((size) => urlsBySize[size]),
                    };
                })
                .sort((a, b) => {
                    const aIndex = orderIndex.get(a.id);
                    const bIndex = orderIndex.get(b.id);
                    if (aIndex != null && bIndex != null) return aIndex - bIndex;
                    if (aIndex != null) return -1;
                    if (bIndex != null) return 1;
                    return a.id.localeCompare(b.id);
                });
        })();
    }

    return wallpaperOptionsPromise;
};
