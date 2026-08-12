import { describe, expect, it, vi } from 'vitest';
import {
  buildDemoBootstrap,
  installRecorderEdition,
  installRecorderIndicator,
  recorderInvoke,
  recorderShortcutAction,
} from './installDemoBackend';

const shortcut = (overrides: Partial<KeyboardEvent> = {}) => ({
  altKey: false,
  code: '',
  ctrlKey: true,
  key: '',
  metaKey: false,
  shiftKey: true,
  ...overrides,
});

describe('recorder demo data', () => {
  it('boots with deterministic connected providers and a dark default', () => {
    const now = Date.parse('2026-08-12T12:00:00.000Z');
    const demo = buildDemoBootstrap(now);

    expect(demo.settings.settings.theme).toBe('dark');
    expect(Object.keys(demo.usage.providers)).toEqual(['codex', 'claude']);
    expect(demo.usage.providers.codex.snapshot?.quotas.map((quota) => quota.usedPercent)).toEqual([
      76, 64,
    ]);
    expect(demo.usage.providers.claude.snapshot?.usage?.daily).toHaveLength(7);
    expect(demo.usage.lastFullRefreshAt).toBe('2026-08-12T11:57:00.000Z');
  });

  it('accepts a deterministic light theme without changing the fake metrics', () => {
    const now = Date.parse('2026-08-12T12:00:00.000Z');
    const demo = buildDemoBootstrap(now, 'light');

    expect(demo.settings.settings.theme).toBe('light');
    expect(demo.usage.providers.codex.snapshot?.quotas[0]?.usedPercent).toBe(76);
    expect(demo.usage.providers.claude.snapshot?.quotas[0]?.usedPercent).toBe(43);
  });
});

describe('recorder theme shortcuts', () => {
  it('maps the documented light, dark, and reset shortcuts', () => {
    expect(recorderShortcutAction(shortcut({ code: 'KeyL', key: 'L' }))).toBe('light');
    expect(recorderShortcutAction(shortcut({ code: 'KeyD', key: 'd' }))).toBe('dark');
    expect(recorderShortcutAction(shortcut({ code: 'Digit0', key: '0' }))).toBe('reset');
    expect(recorderShortcutAction(shortcut({ code: 'Numpad0', key: '0' }))).toBe('reset');
  });

  it('ignores incomplete or modified shortcuts', () => {
    expect(recorderShortcutAction(shortcut({ ctrlKey: false, key: 'l' }))).toBeNull();
    expect(recorderShortcutAction(shortcut({ shiftKey: false, key: 'd' }))).toBeNull();
    expect(recorderShortcutAction(shortcut({ altKey: true, key: 'l' }))).toBeNull();
    expect(recorderShortcutAction(shortcut({ metaKey: true, key: 'd' }))).toBeNull();
    expect(recorderShortcutAction(shortcut({ key: 'x' }))).toBeNull();
  });
});

describe('recorder indicator', () => {
  it('mounts one persistent, accessible demo-data signal', () => {
    const indicator = installRecorderIndicator();
    const repeated = installRecorderIndicator();

    expect(indicator).toBe(repeated);
    expect(indicator).toHaveTextContent('Demo data');
    expect(indicator).toHaveAttribute('role', 'status');
    expect(indicator).toHaveAttribute('aria-label', 'Recorder edition using demo data');
    expect(document.querySelectorAll('[data-recorder-indicator]')).toHaveLength(1);
    expect(document.querySelector('[data-recorder-indicator-style]')).toHaveTextContent('#f04b2f');

    indicator.remove();
    document.querySelector('[data-recorder-indicator-style]')?.remove();
  });
});

describe('recorder backend isolation', () => {
  it('keeps non-configurable Tauri internals intact and delegates only recorder close', async () => {
    const tauriInvoke = vi.fn().mockResolvedValue(undefined);
    const nativeInternals = Object.freeze({ invoke: tauriInvoke });
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: false,
      writable: false,
      value: nativeInternals,
    });

    expect(() => installRecorderEdition({ defaultTheme: 'dark' })).not.toThrow();
    expect((window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__).toBe(
      nativeInternals,
    );

    const bootstrap = await recorderInvoke<ReturnType<typeof buildDemoBootstrap>>(
      'get_bootstrap_state',
      {},
      tauriInvoke,
    );
    expect(bootstrap.usage.providers.codex.snapshot?.quotas[0]?.usedPercent).toBe(76);
    expect(tauriInvoke).not.toHaveBeenCalled();

    await recorderInvoke('quit_app', {}, tauriInvoke);
    expect(tauriInvoke).toHaveBeenCalledOnce();
    expect(tauriInvoke).toHaveBeenCalledWith('recorder_close', {}, undefined);
  });

  it('fails closed for commands missing from the synthetic adapter', async () => {
    await expect(recorderInvoke('unknown_recorder_command')).rejects.toThrow(
      'Recorder backend rejected command: unknown_recorder_command',
    );
  });
});
