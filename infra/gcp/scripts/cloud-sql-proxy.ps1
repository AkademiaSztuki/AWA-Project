#Requires -Version 5.1
<#
.SYNOPSIS
  Uruchamia Cloud SQL Auth Proxy (tunel localhost -> Cloud SQL).

.DESCRIPTION
  1) Pobierz binary: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy#install
     (np. cloud-sql-proxy.x64.exe -> zapisz jako cloud-sql-proxy.exe w tym katalogu lub w PATH)

  2) Ustaw connection name (GCP Console -> SQL -> instancja -> Connection name):
     $env:CLOUD_SQL_CONNECTION_NAME = "projekt:europe-west4:awa-research-sql"

  3) Uruchom w osobnym oknie (zostaw dzialajace):
     .\cloud-sql-proxy.ps1

  Potem w drugim oknie: .\cloud-sql-export-csv.ps1 lub psql.

.PARAMETER ListenPort
  Domyslnie 5432 — jesli zajety, ustaw np. 5433 i ten sam port w cloud-sql-export-csv.ps1
#>

param(
  [int] $ListenPort = 5432,
  [string] $ConnectionName = $env:CLOUD_SQL_CONNECTION_NAME
)

$ErrorActionPreference = "Stop"

if (-not $ConnectionName) {
  Write-Error "Ustaw CLOUD_SQL_CONNECTION_NAME (format: PROJECT:REGION:INSTANCE). Zobacz infra/gcp/setup.env.example"
  exit 1
}

$exe = Get-Command cloud-sql-proxy -ErrorAction SilentlyContinue
if ($exe) {
  Write-Host "[cloud-sql-proxy] Uruchamiam: cloud-sql-proxy --port $ListenPort $ConnectionName"
  & cloud-sql-proxy --port $ListenPort $ConnectionName
  exit
}

$local = Join-Path $PSScriptRoot "cloud-sql-proxy.exe"
if (Test-Path $local) {
  Write-Host "[cloud-sql-proxy] Uruchamiam: $local --port $ListenPort"
  & $local --port $ListenPort $ConnectionName
  exit
}

Write-Error "Nie znaleziono cloud-sql-proxy. Dodaj do PATH lub zapisz cloud-sql-proxy.exe w: $PSScriptRoot"
Write-Host "Pobierz: https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.2/cloud-sql-proxy.x64.exe"
exit 1
