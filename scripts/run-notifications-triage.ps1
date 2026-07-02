param(
  [ValidateSet('global', 'repo')]
  [string]$Scope = 'global',
  [string]$Repo = '',
  [string]$OutDir = '',
  [switch]$IncludeRead,
  [switch]$Apply
)

$npxArgs = @('tsx', 'scripts/notifications-triage.ts', '--scope', $Scope)

if ($Scope -eq 'repo') {
  if ([string]::IsNullOrWhiteSpace($Repo)) {
    throw 'When -Scope repo is used, -Repo owner/name is required.'
  }
  $npxArgs += @('--repo', $Repo)
}

if (-not [string]::IsNullOrWhiteSpace($OutDir)) {
  $npxArgs += @('--out-dir', $OutDir)
}

if ($IncludeRead) {
  $npxArgs += '--include-read'
}

if ($Apply) {
  $npxArgs += '--apply'
}

& npx @npxArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
