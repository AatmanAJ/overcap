import { describe, expect, it } from 'vitest';
import { withProviderName } from './providerNames';
import type { AppSettings } from './types';

const settings = { providerNames: {} } as AppSettings;

describe('provider card names', () => {
  it('stores a trimmed custom name and clears it with a blank value', () => {
    const renamed = withProviderName(settings, 'claude', '  Personal  ');
    expect(renamed.providerNames).toEqual({ claude: 'Personal' });
    expect(withProviderName(renamed, 'claude', 'Personal')).toBe(renamed);
    expect(withProviderName(renamed, 'claude', '   ').providerNames).toEqual({});
  });
});
