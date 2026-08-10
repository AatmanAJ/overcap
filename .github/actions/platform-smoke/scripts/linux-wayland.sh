#!/usr/bin/env bash
set -euo pipefail

binary="$(realpath "${1:?Linux release binary is required}")"
test -x "${binary}"
export OVERCAP_SMOKE_BINARY="${binary}"

dbus-run-session -- bash -euo pipefail -c '
  export HOME
  HOME="$(mktemp -d "${RUNNER_TEMP}/overcap-wayland-home.XXXXXX")"
  export XDG_CONFIG_HOME="${HOME}/xdg"
  export XDG_CURRENT_DESKTOP="KDE"
  export XDG_RUNTIME_DIR
  XDG_RUNTIME_DIR="$(mktemp -d "${RUNNER_TEMP}/overcap-wayland-runtime.XXXXXX")"
  export XDG_SESSION_TYPE="wayland"
  export OVERCAP_LINUX_TRAY_HOST="unavailable"
  export GDK_BACKEND="wayland"
  export WAYLAND_DISPLAY="overcap-wayland"
  mkdir -p "${XDG_CONFIG_HOME}"
  chmod 700 "${XDG_RUNTIME_DIR}"
  app_log="${RUNNER_TEMP}/overcap-wayland-app-${RANDOM}.log"
  weston_log="${RUNNER_TEMP}/overcap-weston-${RANDOM}.log"
  weston --backend=headless-backend.so --socket="${WAYLAND_DISPLAY}" --idle-time=0 \
    --log="${weston_log}" &
  weston_pid=$!
  app_pid=""
  cleanup() {
    if test -n "${app_pid}"; then
      kill "${app_pid}" 2>/dev/null || true
      wait "${app_pid}" 2>/dev/null || true
    fi
    kill "${weston_pid}" 2>/dev/null || true
    wait "${weston_pid}" 2>/dev/null || true
  }
  trap cleanup EXIT
  for _ in $(seq 1 20); do
    if test -S "${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}"; then
      break
    fi
    if ! kill -0 "${weston_pid}" 2>/dev/null; then
      cat "${weston_log}"
      exit 1
    fi
    sleep 1
  done
  if ! test -S "${XDG_RUNTIME_DIR}/${WAYLAND_DISPLAY}"; then
    cat "${weston_log}"
    exit 1
  fi
  "${OVERCAP_SMOKE_BINARY}" >"${app_log}" 2>&1 &
  app_pid=$!
  sleep 8
  if ! kill -0 "${app_pid}" 2>/dev/null; then
    cat "${app_log}"
    exit 1
  fi
'
