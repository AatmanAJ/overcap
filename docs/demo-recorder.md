# Overcap Recorder edition

The Recorder edition is an isolated Windows executable for capturing product footage. It opens
straight into the dashboard with stable synthetic Codex and Claude usage, seven-day histories,
spend estimates, projections, and threshold states. It does not read provider credentials, start
provider refreshes, or share state with an installed copy of Overcap.

A small orange `Demo data` signal remains visible in every Recorder view so captured footage cannot
be mistaken for real account usage. The indicator is compiled out of normal production builds.

It is not an installer and must not be attached to a public release. Normal `pnpm build` and
`pnpm build:installer` builds compile `RECORDER_EDITION` as `false`, so a query string or runtime
setting cannot turn synthetic data on in production.

The recorder swaps the app's backend adapter at compile time; it never replaces Tauri's
`__TAURI_INTERNALS__` object. Direct Tauri window calls still move the borderless window and read its
geometry. App close actions map to the recorder-only `recorder_close` command. The recorder Rust
builder registers no provider, storage, credential, notification, updater, or production window
commands.

## Build on Windows

Install the normal dependencies, then run:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build:recorder
```

The output is `artifacts/recorder/Overcap-Recorder.exe`. The build uses
`.local/recorder-target` so it cannot overwrite a normal release binary. Both directories are
gitignored.

To make a light-first build:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-recorder.ps1 -Theme light
```

## Five-second capture controls

- `Ctrl+Shift+L` switches immediately to light.
- `Ctrl+Shift+D` switches immediately to dark.
- `Ctrl+Shift+0` reloads the synthetic dashboard and returns to the build's default theme.

The switches are registered only in Recorder edition. They do not exist in production Overcap.
For matching clips, keep the window at its locked 320 x 800 capture size, place the pointer outside
the window, use the same zoom and display scaling, and begin each take with `Ctrl+Shift+0`.

## Build through GitHub Actions

Run the `Recorder EXE` workflow manually and choose the starting theme. Download the temporary
`overcap-recorder-windows` workflow artifact when it finishes. The workflow never creates a tag,
release, or installer.
