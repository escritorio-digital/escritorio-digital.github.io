import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('uses the latest state for functional updates', () => {
        const { result } = renderHook(() => useLocalStorage('counter', 0));

        act(() => {
            result.current[1]((current) => current + 1);
            result.current[1]((current) => current + 1);
        });

        expect(result.current[0]).toBe(2);
        expect(window.localStorage.getItem('counter')).toBe('2');
    });

    it('syncs with storage events from another tab', async () => {
        const { result } = renderHook(() => useLocalStorage('profile-order', ['a']));

        act(() => {
            window.localStorage.setItem('profile-order', JSON.stringify(['a', 'b']));
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'profile-order',
                newValue: JSON.stringify(['a', 'b']),
                storageArea: window.localStorage,
            }));
        });

        await waitFor(() => {
            expect(result.current[0]).toEqual(['a', 'b']);
        });
    });

    it('syncs multiple hook instances in the same tab', async () => {
        const first = renderHook(() => useLocalStorage('shared-key', 'uno'));
        const second = renderHook(() => useLocalStorage('shared-key', 'uno'));

        act(() => {
            first.result.current[1]('dos');
        });

        await waitFor(() => {
            expect(second.result.current[0]).toBe('dos');
        });
    });

    it('reloads state when the storage key changes', async () => {
        window.localStorage.setItem('alpha', JSON.stringify('A'));
        window.localStorage.setItem('beta', JSON.stringify('B'));

        const { result, rerender } = renderHook(
            ({ keyName }) => useLocalStorage(keyName, ''),
            { initialProps: { keyName: 'alpha' } }
        );

        expect(result.current[0]).toBe('A');

        rerender({ keyName: 'beta' });

        await waitFor(() => {
            expect(result.current[0]).toBe('B');
        });
    });
});
