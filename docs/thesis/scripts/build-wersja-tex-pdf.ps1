# Build PDF from wersje-tex/robocza-NN/ -> wersje-pdf/robocza-NN.pdf.
# Usage: .\scripts\build-wersja-tex-pdf.ps1 -Number 1

param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 9999)]
    [int]$Number
)

$ErrorActionPreference = 'Stop'
$ThesisRoot = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'wersja-names.ps1')

$paths = Get-WersjaPaths -Number $Number -ThesisRoot $ThesisRoot
$snapRoot = Resolve-WersjaTexRoot -Number $Number -ThesisRoot $ThesisRoot
$mainTex = Join-Path $snapRoot 'main.tex'

if (-not (Test-Path $mainTex)) {
    Write-Error "Missing snapshot: $($paths.TexDir) (run snapshot-wersja-tex.ps1 first)"
}

$figuresLink = Join-Path $snapRoot 'figures'
$figuresTarget = Join-Path $ThesisRoot 'figures'
$junctionCreated = $false
if (-not (Test-Path $figuresLink)) {
    New-Item -ItemType Junction -Path $figuresLink -Target $figuresTarget | Out-Null
    $junctionCreated = $true
}

$jobName = "$($paths.Id)-preview"
Push-Location $snapRoot
try {
    & latexmk -pdflua "-jobname=$jobName" main.tex
    if ($LASTEXITCODE -ne 0) {
        Write-Error "latexmk failed with exit code $LASTEXITCODE"
    }
    $builtPdf = Join-Path $snapRoot "$jobName.pdf"
    if (-not (Test-Path $builtPdf)) {
        Write-Error "Expected output not found: $builtPdf"
    }
    New-Item -ItemType Directory -Path (Split-Path $paths.PdfFile) -Force | Out-Null
    Write-WersjaPdfAliases -SourcePdf $builtPdf -Paths $paths
}
finally {
    Pop-Location
    if ($junctionCreated -and (Test-Path $figuresLink)) {
        cmd /c "rmdir `"$figuresLink`"" | Out-Null
    }
}
