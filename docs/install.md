# Install Overcap

Download Overcap only from the
[official GitHub releases](https://github.com/AJ-Base44/overcap/releases/latest). Choose the asset
for your operating system and processor.

## Beta signing notice

Overcap 0.1.1 is a public beta. Its updater packages are cryptographically signed so the app can
reject a tampered update. The initial Windows and macOS installers are not yet signed with
Microsoft or Apple developer certificates. Windows may show **Unknown publisher** or Microsoft
Defender SmartScreen, and macOS may block the first launch.

Only continue if the download URL begins with
`https://github.com/AJ-Base44/overcap/releases/download/`. The platform-specific steps below show
how to approve the first launch without disabling system security globally.

## Windows

1. Check **Settings > System > About > System type** if you do not know your architecture.
2. Download the file ending in `_x64-setup.exe` for most PCs, or `_arm64-setup.exe` for a Windows
   on ARM device.
3. Run the installer.
4. If Microsoft Defender SmartScreen appears, confirm the app name is **Overcap**, select
   **More info**, then select **Run anyway**.
5. Start Overcap from the Start menu. It opens in the system tray.

The installer is per-user and does not require administrator access. Remove Overcap later from
**Settings > Apps > Installed apps**.

## macOS

The universal DMG supports Apple Silicon and Intel Macs running macOS 11 or later.

1. Download the file ending in `_universal.dmg`.
2. Open the DMG and drag **Overcap** to **Applications**.
3. In Finder, open **Applications**, Control-click **Overcap**, then choose **Open**.
4. Confirm **Open** in the security prompt. This approval is required only for the first launch.
5. If macOS offers no Open button, try launching Overcap once, then open **System Settings >
   Privacy & Security** and select **Open Anyway** beside the Overcap message.

Do not turn off Gatekeeper. Remove Overcap later by quitting it and moving
`/Applications/Overcap.app` to the Trash.

## Linux AppImage

Use the AppImage for a portable install. Choose the `_amd64.AppImage` asset on x64 systems or the
ARM64/aarch64 AppImage on ARM64 systems.

```sh
chmod +x ./Overcap_*.AppImage
./Overcap_*.AppImage
```

If the AppImage reports a FUSE error, install your distribution's FUSE 2 compatibility package
(`libfuse2` or `libfuse2t64` on Ubuntu-family systems), then try again. The AppImage receives
Overcap's in-app updates.

## Debian and Ubuntu

Choose the `_amd64.deb` asset on x64 systems or `_arm64.deb` on ARM64 systems, then install it with
APT from the download directory:

```sh
sudo apt install ./Overcap_*.deb
```

APT installs any missing package dependencies. Debian packages do not receive Overcap's in-app
updates; download and install the next `.deb` release manually. Remove it with:

```sh
sudo apt remove overcap
```

## First run

Overcap opens in the tray. Open **Customize** to choose providers, add API keys where required,
reorder metrics, set nicknames, and adjust alert thresholds. Provider-specific setup is documented
under [`docs/providers`](providers/).

To keep Overcap visible while you work, choose **Desktop Window** in **Settings > Appearance**.
That mode appears in the taskbar or Dock, stays open when it loses focus, and remembers its position
on a second display. Restart and quit controls are available under **Settings > Application**.

Overcap has no account, analytics, or telemetry. See [PRIVACY.md](../PRIVACY.md) for the full data
handling summary.

## Updates

Overcap checks the official GitHub release feed. Update downloads used by the app are verified
against the public updater key bundled into Overcap. Windows installers, macOS app bundles, and
Linux AppImages support in-app updates. Debian packages are updated manually.

Need help? Read [SUPPORT.md](../SUPPORT.md).
