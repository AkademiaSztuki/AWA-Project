# Copy main.pdf to wersje-pdf/robocza-NN.pdf.
# Default: draft number from notes/WERSJA.md.
# Override: -Number 4

param(
    [ValidateRange(1, 9999)]
    [int]$Number = 0
)

$ErrorActionPreference = 'Stop'
$ThesisRoot = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'wersja-names.ps1')

if (-not (Test-Path (Join-Path $ThesisRoot 'main.tex'))) {
    Write-Error "Cannot find main.tex in thesis root: $ThesisRoot"
}

$wersjaMd = Join-Path $ThesisRoot 'notes\WERSJA.md'
$mainPdf = Join-Path $ThesisRoot 'main.pdf'

if (-not (Test-Path $mainPdf)) {
    Write-Error "Missing $mainPdf — run make pdf first"
}

$num = $Number
if ($num -eq 0) {
    $num = Get-CurrentWersjaNumberFromMd -WersjaMdPath $wersjaMd
}

$paths = Get-WersjaPaths -Number $num -ThesisRoot $ThesisRoot
New-Item -ItemType Directory -Path (Split-Path $paths.PdfFile) -Force | Out-Null
Write-WersjaPdfAliases -SourcePdf $mainPdf -Paths $paths
