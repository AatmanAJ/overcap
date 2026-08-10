<script lang="ts">
  import type { PanelHeightMode } from './backend';
  import Icon from './Icon.svelte';
  import type { DesktopPlatform } from './platform';
  import SelectMenu from './SelectMenu.svelte';
  import NotificationThresholdControls from './NotificationThresholdControls.svelte';
  import type {
    AppSettings,
    NotificationPreferences,
    SettingsViewState,
    UpdateFailure,
  } from './types';

  interface Props {
    settingsView: SettingsViewState;
    platform: DesktopPlatform;
    panelHeightMode: PanelHeightMode;
    onChange: (settings: AppSettings) => void;
    onPanelHeightModeChange: (mode: PanelHeightMode) => void;
    onRequestNotifications: () => void;
    onOpenNotificationSettings: () => void;
    updateError: UpdateFailure | null;
    checkingUpdate: boolean;
    onCheckForUpdates: () => void;
    onCustomize: () => void;
    onAbout: () => void;
    onCopyLogPath: () => Promise<void>;
    onOpenLogFolder: () => Promise<void>;
  }
  let {
    settingsView,
    platform,
    panelHeightMode,
    onChange,
    onPanelHeightModeChange,
    onRequestNotifications,
    onOpenNotificationSettings,
    updateError,
    checkingUpdate,
    onCheckForUpdates,
    onCustomize,
    onAbout,
    onCopyLogPath,
    onOpenLogFolder,
  }: Props = $props();
  let recording = $state(false);
  let logActionError = $state<string | null>(null);
  const settings = $derived(settingsView.settings);
  const revealLogLabel = $derived(
    platform === 'macos'
      ? 'Reveal in Finder'
      : platform === 'windows'
        ? 'Reveal in File Explorer'
        : 'Open containing folder',
  );
  const anyNotificationEnabled = $derived(
    settings.notifications.almostOut ||
      settings.notifications.cuttingItClose ||
      settings.notifications.willRunOut,
  );
  const notificationsNeedAttention = $derived(
    anyNotificationEnabled && settingsView.notificationPermission !== 'granted',
  );

  function patch(value: Partial<AppSettings>) {
    onChange({ ...settings, ...value });
  }
  function patchNotification(key: keyof NotificationPreferences, enabled: boolean) {
    patch({ notifications: { ...settings.notifications, [key]: enabled } });
    if (enabled && settingsView.notificationPermission === 'prompt') onRequestNotifications();
  }
  async function copyLogPath() {
    try {
      await onCopyLogPath();
      logActionError = null;
    } catch {
      logActionError = "Couldn't copy the log path to the clipboard.";
    }
  }
  async function revealLogFile() {
    try {
      await onOpenLogFolder();
      logActionError = null;
    } catch {
      logActionError = "Couldn't reveal the log file.";
    }
  }
  function record(event: KeyboardEvent) {
    if (!recording) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      recording = false;
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      patch({ globalShortcut: null });
      recording = false;
      return;
    }
    if (
      !(event.ctrlKey || event.altKey || event.metaKey) ||
      ['Control', 'Alt', 'Meta', 'Shift'].includes(event.key)
    )
      return;
    const modifiers = [
      event.ctrlKey && 'Ctrl',
      event.altKey && 'Alt',
      event.shiftKey && 'Shift',
      event.metaKey && 'Super',
    ].filter(Boolean);
    const key = event.code.startsWith('Key')
      ? event.code.slice(3)
      : event.code.startsWith('Digit')
        ? event.code.slice(5)
        : event.key.length === 1
          ? event.key.toUpperCase()
          : event.key;
    patch({ globalShortcut: [...modifiers, key].join('+') });
    recording = false;
  }
</script>

<section class="screen settings-screen" aria-label="Settings">
  {#if settingsView.integrationError}<p class="notice" role="alert">
      {settingsView.integrationError}
    </p>{/if}

  {#if settingsView.platformSummary}<div class="settings-section">
      <h2 class="section-label">Linux</h2>
      <div class="setting-row">
        <span><b>Desktop Integration</b><small>{settingsView.platformSummary}</small></span>
      </div>
    </div>{/if}

  <div class="settings-section">
    <h2 class="section-label">General</h2>
    <label class="setting-row"
      ><span><b>Show total spend</b></span><input
        type="checkbox"
        checked={settings.showTotalSpend}
        onchange={(event) => patch({ showTotalSpend: event.currentTarget.checked })}
      /></label
    >
    <label class="setting-row"
      ><span><b>Launch at login</b></span><input
        type="checkbox"
        checked={settings.launchAtLogin}
        onchange={(event) => patch({ launchAtLogin: event.currentTarget.checked })}
      /></label
    >
    <div class="setting-row">
      <span><b>Global shortcut</b></span>
      <div class="shortcut-field">
        <button
          class:recording
          type="button"
          data-tooltip="Open Overcap from anywhere"
          onclick={() => (recording = !recording)}
          onkeydown={record}
          >{recording ? 'Type shortcut…' : (settings.globalShortcut ?? 'Record shortcut')}</button
        >{#if settings.globalShortcut}<button
            type="button"
            aria-label="Clear global shortcut"
            onclick={() => patch({ globalShortcut: null })}
            ><Icon name="close" size={12} strokeWidth={2} /></button
          >{/if}
      </div>
    </div>
  </div>

  <div class="settings-section">
    <h2 class="section-label">Appearance</h2>
    {#if platform === 'macos'}
      <div class="setting-row">
        <span><b>Icon style</b></span><SelectMenu
          label="Icon style"
          value={settings.menuBarStyle}
          options={[
            { value: 'text', label: 'Text' },
            { value: 'bars', label: 'Bars' },
          ]}
          onChange={(value) => patch({ menuBarStyle: value as AppSettings['menuBarStyle'] })}
        />
      </div>
    {/if}
    <div class="setting-row">
      <span><b>Theme</b></span><SelectMenu
        label="Theme"
        value={settings.theme}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        onChange={(value) => patch({ theme: value as AppSettings['theme'] })}
      />
    </div>
    <div class="setting-row">
      <span><b>Density</b></span><SelectMenu
        label="Density"
        value={settings.density}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'compact', label: 'Compact' },
        ]}
        onChange={(value) => patch({ density: value as AppSettings['density'] })}
      />
    </div>
    {#if settingsView.trayAvailable}
      <div class="setting-row">
        <span><b>Window mode</b></span><SelectMenu
          label="Window mode"
          value={settings.windowMode}
          options={[
            { value: 'popup', label: 'Tray Popup' },
            { value: 'floating', label: 'Floating Window' },
          ]}
          onChange={(value) => patch({ windowMode: value as AppSettings['windowMode'] })}
        />
      </div>
    {/if}
    <div class="setting-row">
      <span><b>Panel height</b></span><SelectMenu
        label="Panel height"
        value={panelHeightMode}
        options={[
          { value: 'automatic', label: 'Automatic' },
          { value: 'manual', label: 'Manual' },
        ]}
        onChange={(value) => onPanelHeightModeChange(value as PanelHeightMode)}
      />
    </div>
    <div class="setting-row">
      <span><b>Time format</b></span><SelectMenu
        label="Time format"
        value={settings.timeFormat}
        options={[
          { value: 'system', label: 'Auto' },
          { value: 'twelveHour', label: '12-hour' },
          { value: 'twentyFourHour', label: '24-hour' },
        ]}
        onChange={(value) => patch({ timeFormat: value as AppSettings['timeFormat'] })}
      />
    </div>
  </div>

  <div class="settings-section">
    <h2 class="section-label">Usage display</h2>
    <div class="setting-row">
      <span><b>Show usage as</b></span><SelectMenu
        label="Show usage as"
        value={settings.usageDisplay}
        options={[
          { value: 'left', label: 'Left' },
          { value: 'used', label: 'Used' },
        ]}
        onChange={(value) => patch({ usageDisplay: value as AppSettings['usageDisplay'] })}
      />
    </div>
    <div class="setting-row">
      <span><b>Reset times</b></span><SelectMenu
        label="Reset times"
        value={settings.resetDisplay}
        options={[
          { value: 'countdown', label: 'Countdown' },
          { value: 'exact', label: 'Exact Time' },
        ]}
        onChange={(value) => patch({ resetDisplay: value as AppSettings['resetDisplay'] })}
      />
    </div>
    <label class="setting-row"
      ><span
        ><b>Always show pacing</b><i
          class="setting-info"
          data-tooltip="Show how you're pacing on every metric, not just ones near their limit"
          aria-label="Show how you're pacing on every metric, not just ones near their limit"
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.alwaysShowPacing}
        onchange={(event) => patch({ alwaysShowPacing: event.currentTarget.checked })}
      /></label
    >
  </div>

  <div class="settings-section">
    <h2 class="section-label">
      Notifications {#if notificationsNeedAttention}<span
          class="permission-warning"
          aria-label="Notification permission needed"
          ><Icon name="warning" size={12} strokeWidth={2} /></span
        >{/if}
    </h2>
    <NotificationThresholdControls
      thresholds={settings.notificationThresholds}
      label="Global notification thresholds"
      onChange={(notificationThresholds) => patch({ notificationThresholds })}
    />
    <label class="setting-row"
      ><span
        ><b>{settings.notificationThresholds.warning}% alert</b><i
          class="setting-info"
          data-tooltip="A calm heads-up when usage reaches the first threshold."
          aria-label="A calm heads-up when usage reaches the first threshold."
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.notifications.almostOut}
        onchange={(event) => patchNotification('almostOut', event.currentTarget.checked)}
      /></label
    >
    <label class="setting-row"
      ><span
        ><b>{settings.notificationThresholds.critical}% alert</b><i
          class="setting-info"
          data-tooltip="A redline alert at the second threshold."
          aria-label="A redline alert at the second threshold."
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.notifications.cuttingItClose}
        onchange={(event) => patchNotification('cuttingItClose', event.currentTarget.checked)}
      /></label
    >
    <label class="setting-row"
      ><span
        ><b>{settings.notificationThresholds.capped}% alert</b><i
          class="setting-info"
          data-tooltip="A capped alert at the final threshold."
          aria-label="A capped alert at the final threshold."
          ><Icon name="about" size={12} strokeWidth={1.8} /></i
        ></span
      ><input
        type="checkbox"
        checked={settings.notifications.willRunOut}
        onchange={(event) => patchNotification('willRunOut', event.currentTarget.checked)}
      /></label
    >
    {#if notificationsNeedAttention}
      <div class="notification-actions">
        <div class="notification-attention" role="status">
          <span
            ><b
              >{settingsView.notificationPermission === 'denied'
                ? 'Notifications are blocked'
                : 'Permission is required'}</b
            ><small
              >{settingsView.notificationPermission === 'denied'
                ? 'Enable Overcap notifications in system settings.'
                : 'Allow notifications to receive the alerts selected above.'}</small
            ></span
          >
          <button
            data-cta="primary"
            class="notification-primary"
            type="button"
            onclick={settingsView.notificationPermission === 'denied'
              ? onOpenNotificationSettings
              : onRequestNotifications}
            ><span
              >{settingsView.notificationPermission === 'denied' ? 'Open settings' : 'Allow'}</span
            ></button
          >
        </div>
      </div>
    {/if}
  </div>

  <div class="settings-section">
    <h2 class="section-label">Advanced</h2>
    <div class="setting-row">
      <span><b>Log level</b></span><SelectMenu
        label="Log level"
        value={settings.logLevel}
        options={[
          { value: 'error', label: 'Error' },
          { value: 'warn', label: 'Warning' },
          { value: 'info', label: 'Info' },
          { value: 'debug', label: 'Debug' },
        ]}
        onChange={(value) => patch({ logLevel: value as AppSettings['logLevel'] })}
      />
    </div>
    <div class="setting-row setting-row--button">
      <button class="secondary-button settings-wide-button" type="button" onclick={copyLogPath}
        >Copy log path</button
      >
    </div>
    <div class="setting-row setting-row--button">
      <button class="secondary-button settings-wide-button" type="button" onclick={revealLogFile}
        >{revealLogLabel}</button
      >
    </div>
    {#if logActionError}<p class="settings-note log-action-error" role="alert">
        {logActionError}
      </p>{/if}
  </div>

  <div class="settings-section">
    <h2 class="section-label">Updates</h2>
    <label class="setting-row"
      ><span><b>Check for updates automatically</b></span><input
        type="checkbox"
        checked={settings.autoCheckUpdates}
        onchange={(event) => patch({ autoCheckUpdates: event.currentTarget.checked })}
      /></label
    >
    <div class="setting-row setting-row--button">
      <button
        type="button"
        class="secondary-button settings-wide-button"
        disabled={checkingUpdate}
        onclick={onCheckForUpdates}>{checkingUpdate ? 'Checking…' : 'Check for updates…'}</button
      >
    </div>
    {#if updateError}<div class="settings-update-error" role="alert">
        <b>{updateError.message}</b><small>{updateError.action}</small>
      </div>{/if}
  </div>

  <button class="screen-cross-link" type="button" aria-label="Customise" onclick={onCustomize}>
    <Icon name="sliders" size={16} />
    <span><b>Customise</b><small>Choose what's visible and where</small></span>
    <Icon name="chevron-right" size={12} strokeWidth={2} />
  </button>
  <button class="screen-cross-link" type="button" aria-label="About Overcap" onclick={onAbout}>
    <Icon name="about" size={16} />
    <span><b>About Overcap</b><small>Version, credits and product links</small></span>
    <Icon name="chevron-right" size={12} strokeWidth={2} />
  </button>
</section>

<style>
  :global {
    .settings-section {
      margin: 0;
      overflow: visible;
    }

    .setting-row {
      display: flex;
      min-height: 36px;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0;
      border-top: 0.5px solid var(--rule);
      color: var(--body);
      font-size: 12px;
    }

    .settings-section > .section-label + .setting-row,
    .settings-section > .section-label + .threshold-controls {
      border-top: 0;
    }

    .setting-row > span {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 4px;
    }

    .setting-row b {
      color: var(--ink);
      font-weight: 400;
    }

    .setting-row small {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .setting-row .select-menu__trigger {
      font-size: 12px;
    }

    input[type='checkbox'] {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      margin: 0;
      accent-color: var(--ink);
      cursor: pointer;
    }

    .shortcut-field {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .shortcut-field button {
      max-width: 116px;
      padding: 0;
      overflow: hidden;
      border: 0;
      color: var(--muted);
      font-family: var(--font-ui);
      font-size: 12px;
      font-variant-numeric: tabular-nums lining-nums;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .shortcut-field button.recording {
      color: var(--ink);
    }

    .shortcut-field button[aria-label='Clear global shortcut'] {
      display: grid;
      width: 24px;
      height: 24px;
      padding: 0;
      color: var(--muted);
      place-items: center;
    }

    .secondary-button {
      flex: 0 0 auto;
      padding: 0;
      border: 0;
      color: var(--ink);
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
    }

    .secondary-button:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    .secondary-button:disabled {
      opacity: 0.56;
    }

    .permission-warning {
      display: inline-grid;
      width: 12px;
      height: 12px;
      margin-left: 4px;
      color: var(--warning);
      place-items: center;
    }

    .settings-note,
    .version-row {
      margin: 0;
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
      color: var(--warning);
      font-size: 11px;
      font-variant-numeric: tabular-nums lining-nums;
    }

    .version-row {
      color: var(--muted);
      text-align: center;
    }

    .setting-row > span:has(.setting-info) {
      align-items: center;
      flex-direction: row;
      gap: 8px;
    }

    .setting-info {
      display: inline-grid;
      flex: 0 0 auto;
      color: var(--muted);
      place-items: center;
    }

    .setting-row--button {
      display: flex;
      justify-content: flex-start;
    }

    .settings-wide-button {
      width: auto;
      min-height: 28px;
      font-size: 12px;
    }

    .notification-actions {
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
    }

    .notification-attention {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--warning);
    }

    .notification-attention > span {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 4px;
    }

    .notification-attention b {
      color: var(--ink);
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
    }

    .notification-attention small {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;
    }

    .notification-attention .notification-primary {
      flex: 0 0 auto;
      padding: 0 12px;
    }

    .settings-update-error {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 8px 0 0;
      padding: 8px 0;
      border-top: 0.5px solid var(--rule);
      border-bottom: 0.5px solid var(--rule);
      color: var(--critical);
    }

    .settings-update-error b {
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
    }

    .settings-update-error small {
      color: var(--critical);
      font-size: 11px;
      line-height: 1.5;
    }
  }
</style>
