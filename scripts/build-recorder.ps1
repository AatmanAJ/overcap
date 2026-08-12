[CmdletBinding()]
param(
  [ValidateSet('dark', 'light')]
  [string]$Theme = 'dark'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $repoRoot '.local\recorder-target'
$sourceExecutable = Join-Path $targetDirectory 'release\overcap.exe'
$artifactDirectory = Join-Path $repoRoot 'artifacts\recorder'
$artifactPath = Join-Path $artifactDirectory 'Overcap-Recorder.exe'
$previousTargetDirectory = $env:CARGO_TARGET_DIR
$previousRecorderTheme = $env:OVERCAP_RECORDER_THEME

try {
  $rustHost = (& rustc -vV | Select-String '^host:' | ForEach-Object { $_.Line.Split(':', 2)[1].Trim() })
  if ($LASTEXITCODE -ne 0 -or -not $rustHost) {
    throw 'Rust is unavailable. Install the stable Rust toolchain before building the recorder.'
  }
  if ($rustHost.EndsWith('-msvc') -and -not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
    throw @'
The MSVC linker (link.exe) is not available. Install Visual Studio Build Tools with
"Desktop development with C++", run this script from a Developer PowerShell, or use the
manual "Recorder EXE" GitHub Actions workflow.
'@
  }

  $env:CARGO_TARGET_DIR = $targetDirectory
  $env:OVERCAP_RECORDER_THEME = $Theme
  Push-Location $repoRoot
  try {
    & corepack pnpm tauri build --no-bundle --features recorder --config src-tauri/tauri.recorder.conf.json
    if ($LASTEXITCODE -ne 0) {
      throw "The recorder build failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }

  if (-not (Test-Path -LiteralPath $sourceExecutable -PathType Leaf)) {
    throw "The recorder executable was not produced at $sourceExecutable."
  }
  New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
  Copy-Item -LiteralPath $sourceExecutable -Destination $artifactPath -Force
  Write-Host "Recorder ready: $artifactPath"
  Write-Host "SHA-256: $((Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash)"
  Write-Host 'Theme controls: Ctrl+Shift+L (light), Ctrl+Shift+D (dark), Ctrl+Shift+0 (reset).'
}
finally {
  $env:CARGO_TARGET_DIR = $previousTargetDirectory
  $env:OVERCAP_RECORDER_THEME = $previousRecorderTheme
}
