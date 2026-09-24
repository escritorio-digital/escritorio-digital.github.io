import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ScientificCalculatorWidget } from './ScientificCalculatorWidget';

// Las pruebas pulsan los botones igual que una persona: así se detectan los fallos de la
// interfaz (un paréntesis que no se puede cerrar) y no solo los del evaluador.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, ready: true }),
}));

beforeAll(() => {
    globalThis.ResizeObserver = class {
        observe() {}
        disconnect() {}
        unobserve() {}
    } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const MODES = {
    basic: 'widgets.scientific_calculator.basic',
    standard: 'widgets.scientific_calculator.standard',
    scientific: 'widgets.scientific_calculator.scientific',
};

const calculate = (mode: keyof typeof MODES, keys: string[], angle?: 'RAD') => {
    const { container, getByText } = render(<ScientificCalculatorWidget />);
    fireEvent.click(getByText(MODES[mode]));
    const press = (label: string) => {
        const button = [...container.querySelectorAll<HTMLButtonElement>('.calc-grid button')]
            .find((element) => element.textContent === label);
        if (!button) throw new Error(`No hay botón «${label}» en el modo ${mode}`);
        fireEvent.click(button);
    };
    if (angle) press('DEG');
    keys.forEach(press);
    press('=');
    return container.querySelector('.calc-result')?.textContent;
};

describe('Calculadora científica', () => {
    it.each([
        [['sin', '3', '0'], '0.5'],
        [['cos', '6', '0', ')'], '0.5'],
        [['cos', '9', '0'], '0'],
        [['sin', '1', '8', '0'], '0'],
        [['tan', '4', '5'], '1'],
        [['tan', '9', '0'], 'Error'],
        [['√', '9'], '3'],
        [['log', '1', '0', '0'], '2'],
        [['sin', '3', '0', ')', '+', '1'], '1.5'],
        [['(', '2', '+', '3', ')', '×', '4'], '20'],
        [['−', '2', '^', '2'], '-4'],
        [['(', '−', '2', ')', '^', '2'], '4'],
        [['2', '^', '−', '2'], '0.25'],
        [['5', 'x!'], '120'],
        [['3', '×', '−', '4'], '-12'],
        [['8', '÷', '−', '2'], '-4'],
        [['5', '+', '×', '2'], '10'],
        [['5', '×', '−', '+', '2'], '7'],
    ])('científica: %j = %s', (keys, expected) => {
        expect(calculate('scientific', keys)).toBe(expected);
    });

    it('científica en radianes: sin(π) = 0', () => {
        expect(calculate('scientific', ['sin', 'π'], 'RAD')).toBe('0');
    });

    it.each([
        [['(', '2', '+', '3', ')', '×', '4'], '20'],
        [['√', '9', ')'], '3'],
        [['√', '1', '6'], '4'],
        [['−', '3', '^', '2'], '-9'],
        [['1', '0', '0', ')'], '100'],
    ])('estándar: %j = %s', (keys, expected) => {
        expect(calculate('standard', keys)).toBe(expected);
    });

    it('básica: 7 × 6 = 42', () => {
        expect(calculate('basic', ['7', '×', '6'])).toBe('42');
    });
});
