import type { AppSettings } from './types';

export function withProviderName(
  settings: AppSettings,
  providerId: string,
  value: string,
): AppSettings {
  const name = value.trim();
  const current = settings.providerNames[providerId]?.trim() ?? '';
  if (name === current) return settings;

  const providerNames = { ...settings.providerNames };
  if (name) providerNames[providerId] = name;
  else delete providerNames[providerId];
  return { ...settings, providerNames };
}
