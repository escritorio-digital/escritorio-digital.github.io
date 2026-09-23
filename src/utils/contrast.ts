// Contraste de color según WCAG 2.1 (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).

const parseHex = (color: string): [number, number, number] | null => {
    const hex = color.trim().replace(/^#/, '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    if (!/^[0-9a-f]{6}$/i.test(full)) return null;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};

const luminance = ([r, g, b]: [number, number, number]): number => {
    const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

export const contrastRatio = (a: string, b: string): number | null => {
    const ca = parseHex(a);
    const cb = parseHex(b);
    if (!ca || !cb) return null;
    const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

// Devuelve el primer candidato que alcanza el contraste mínimo sobre el fondo, en el
// orden de preferencia dado; si ninguno lo alcanza, el de mayor contraste.
export const readableTextColor = (background: string, candidates: string[], minimum = 4.5): string => {
    const rated = candidates.map((color) => ({ color, ratio: contrastRatio(color, background) ?? 0 }));
    const passing = rated.find(({ ratio }) => ratio >= minimum);
    if (passing) return passing.color;
    return rated.reduce((best, current) => (current.ratio > best.ratio ? current : best), rated[0]).color;
};
