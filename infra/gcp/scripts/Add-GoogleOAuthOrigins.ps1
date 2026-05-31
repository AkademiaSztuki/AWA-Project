#Requires -Version 5.1
param(
  [string]$ProjectId = "project-a2c75857-73b0-4982-acf",
  [string]$ProjectNumber = "986280192250",
  [string]$EnvFile = "apps/frontend/.env.local",
  [switch]$AttemptPatch
)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $RepoRoot
$envPath = Join-Path $RepoRoot $EnvFile
if (-not (Test-Path $envPath)) { throw "Missing $envPath" }
$ClientId = ((Get-Content $envPath | Where-Object { $_ -like "NEXT_PUBLIC_GOOGLE_CLIENT_ID=*" } | Select-Object -First 1) -split "=", 2)[1].Trim()
if (-not $ClientId) { throw "NEXT_PUBLIC_GOOGLE_CLIENT_ID not set" }
$Origins = @(
  "https://awa-project-frontend-fhka-emv6mhxeu-pali89s-projects.vercel.app",
  "https://awa-project-frontend-fhka.vercel.app",
  "https://www.project-ida.com",
  "https://project-ida.com",
  "http://localhost:3000"
)
$Redirects = @(
  "https://www.project-ida.com/auth/google/callback",
  "https://project-ida.com/auth/google/callback",
  "https://www.project-ida.com/auth/callback",
  "https://project-ida.com/auth/callback",
  "http://localhost:3000/auth/google/callback",
  "http://localhost:3000/auth/callback"
) + ($Origins | Where-Object { $_ -notmatch "project-ida\.com$" } | ForEach-Object { "$_/auth/google/callback"; "$_/auth/callback" })
Write-Host "Project: $ProjectId ($ProjectNumber)"
Write-Host "Client suffix: ...$($ClientId.Substring([Math]::Max(0, $ClientId.Length - 40)))"
Write-Host "`n=== JavaScript origins (merge) ==="
$Origins | ForEach-Object { Write-Host "  $_" }
Write-Host "`n=== Redirect URIs (merge) ==="
$Redirects | ForEach-Object { Write-Host "  $_" }
Write-Host "`nConsole: https://console.cloud.google.com/apis/credentials?project=$ProjectId"
$enabled = @(gcloud services list --enabled --project=$ProjectId --format="value(config.name)" 2>$null) -contains "clientauthconfig.googleapis.com"
if (-not $enabled) {
  Write-Host "`nclientauthconfig.googleapis.com NOT enabled."
  if (-not $AttemptPatch) { exit 2 }
  gcloud services enable clientauthconfig.googleapis.com --project=$ProjectId 2>&1
}
if ($AttemptPatch) {
  $token = gcloud auth print-access-token
  $headers = @{ Authorization = "Bearer $token"; "x-goog-user-project" = $ProjectNumber }
  $getUrl = "https://clientauthconfig.googleapis.com/v1/brand/$ProjectNumber/identity/oauthClients/$ClientId"
  try { Invoke-RestMethod -Uri $getUrl -Headers $headers | ConvertTo-Json -Depth 6 } catch { Write-Host "GET failed: $_"; exit 3 }
}
