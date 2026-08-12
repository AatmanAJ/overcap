#!/usr/bin/env bash
set -euo pipefail

linuxdeploy_release='1-alpha-20251107-1'
# AppRun digests come from the GitHub release API for tauri-apps/binary-releases tag apprun-old.

case "$(uname -m)" in
  x86_64)
    linuxdeploy_arch='x86_64'
    linuxdeploy_sha256='c20cd71e3a4e3b80c3483cef793cda3f4e990aca14014d23c544ca3ce1270b4d'
    apprun_sha256='f30140a43a0a59e46db21bdefdf749b9e9f2c6946e92afabbacf98b8ae73fb4f'
    ;;
  aarch64)
    linuxdeploy_arch='aarch64'
    linuxdeploy_sha256='620095110d693282b8ebeb244a95b5e911cf8f65f76c88b4b47d16ae6346fcff'
    apprun_sha256='072f17c0895a85c490282fe5395c5007e5fc75da727e553b3b8fb680feb11578'
    ;;
  *)
    echo "Unsupported linuxdeploy host architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

tauri_cache_directory="${XDG_CACHE_HOME:-${HOME}/.cache}/tauri"
linuxdeploy_path="${tauri_cache_directory}/linuxdeploy-${linuxdeploy_arch}.AppImage"
apprun_path="${tauri_cache_directory}/AppRun-${linuxdeploy_arch}"
linuxdeploy_download_path="$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/linuxdeploy.XXXXXX")"
apprun_download_path="$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/apprun.XXXXXX")"
trap 'rm -f "${linuxdeploy_download_path}" "${apprun_download_path}"' EXIT

download_and_install() {
  local url="$1"
  local sha256="$2"
  local download_path="$3"
  local install_path="$4"

  curl --fail --location --silent --show-error \
    --retry 5 --retry-all-errors --retry-delay 2 \
    --connect-timeout 20 --max-time 300 \
    --output "${download_path}" \
    "${url}"
  echo "${sha256}  ${download_path}" | sha256sum --check --strict
  install -m 0755 "${download_path}" "${install_path}"
}

mkdir -p "${tauri_cache_directory}"
download_and_install \
  "https://github.com/linuxdeploy/linuxdeploy/releases/download/${linuxdeploy_release}/linuxdeploy-${linuxdeploy_arch}.AppImage" \
  "${linuxdeploy_sha256}" \
  "${linuxdeploy_download_path}" \
  "${linuxdeploy_path}"
download_and_install \
  "https://github.com/tauri-apps/binary-releases/releases/download/apprun-old/AppRun-${linuxdeploy_arch}" \
  "${apprun_sha256}" \
  "${apprun_download_path}" \
  "${apprun_path}"
