#!/usr/bin/env bash
set -euo pipefail

binary="$(realpath "${1:?Linux release binary is required}")"
test -x "${binary}"
export OVERCAP_SMOKE_BINARY="${binary}"

xvfb-run -a dbus-run-session -- bash -euo pipefail -c '
  export HOME
  HOME="$(mktemp -d "${RUNNER_TEMP}/overcap-x11-home.XXXXXX")"
  export XDG_CONFIG_HOME="${HOME}/xdg"
  export XDG_CURRENT_DESKTOP="ubuntu:GNOME"
  export XDG_SESSION_TYPE="x11"
  export OVERCAP_LINUX_TRAY_HOST="unavailable"
  mkdir -p "${XDG_CONFIG_HOME}"
  app_log="${RUNNER_TEMP}/overcap-x11-app-${RANDOM}.log"
  wm_log="${RUNNER_TEMP}/overcap-x11-openbox-${RANDOM}.log"
  openbox >"${wm_log}" 2>&1 &
  wm_pid=$!
  app_pid=""
  cleanup() {
    if test -n "${app_pid}"; then
      kill "${app_pid}" 2>/dev/null || true
      wait "${app_pid}" 2>/dev/null || true
    fi
    kill "${wm_pid}" 2>/dev/null || true
    wait "${wm_pid}" 2>/dev/null || true
  }
  trap cleanup EXIT
  "${OVERCAP_SMOKE_BINARY}" >"${app_log}" 2>&1 &
  app_pid=$!
  found=0
  for _ in $(seq 1 30); do
    if xdotool search --name "^Overcap$" >/dev/null 2>&1; then
      found=1
      break
    fi
    if ! kill -0 "${app_pid}" 2>/dev/null; then
      cat "${app_log}"
      exit 1
    fi
    sleep 1
  done
  if test "${found}" -ne 1; then
    cat "${app_log}"
    cat "${wm_log}"
    exit 1
  fi
'
