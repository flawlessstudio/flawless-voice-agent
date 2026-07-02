param(
  [ValidateSet('global', 'repo')]
  [string]$Scope = 'global',
  [string]$Repo = '',
  [string]$OutDir = '',
  [string]$AllowedOrg = 'flawlessstudio',
  [switch]$IncludeRead,
  [switch]$AllowUnverifiableApply,
  [int]$MaxRetries = 2,
  [int]$RetryDelayMs = 500,
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

if ($Scope -eq 'global' -and -not [string]::IsNullOrWhiteSpace($AllowedOrg)) {
  $npxArgs += @('--allowed-org', $AllowedOrg)
}

if ($IncludeRead) {
  $npxArgs += '--include-read'
}

if ($AllowUnverifiableApply) {
  $npxArgs += '--allow-unverifiable-apply'
}

if ($MaxRetries -ge 0) {
  $npxArgs += @('--max-retries', [string]$MaxRetries)
}

if ($RetryDelayMs -ge 0) {
  $npxArgs += @('--retry-delay-ms', [string]$RetryDelayMs)
}

if ($Apply) {
  $npxArgs += '--apply'
}

& npx @npxArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
