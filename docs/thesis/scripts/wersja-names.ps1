# Shared version id helpers (docs/thesis). Dot-source from other scripts.

# Canonical on disk: wersje-tex/robocza-NN/, wersje-pdf/robocza-NN.pdf

# Logical id 000N is only a label in notes/WERSJA.md and metadata.



function Get-WersjaIdFromNumber {

    param([Parameter(Mandatory)][ValidateRange(1, 9999)][int]$Number)

    return ('{0:D4}' -f $Number)

}



function Get-WersjaPaths {

    param(

        [Parameter(Mandatory)][ValidateRange(1, 9999)][int]$Number,

        [string]$ThesisRoot

    )

    $id = Get-WersjaIdFromNumber -Number $Number

    $legacy = 'robocza-{0:D2}' -f $Number

    return @{

        Number       = $Number

        Id           = $id

        LegacyName   = $legacy

        TexDir       = Join-Path $ThesisRoot "wersje-tex\$legacy"

        LegacyTexDir = Join-Path $ThesisRoot "wersje-tex\$id"

        PdfFile      = Join-Path $ThesisRoot "wersje-pdf\$legacy.pdf"

        LegacyPdf    = Join-Path $ThesisRoot "wersje-pdf\$id.pdf"

    }

}



function Resolve-WersjaTexRoot {

    param(

        [Parameter(Mandatory)][ValidateRange(1, 9999)][int]$Number,

        [string]$ThesisRoot

    )

    $p = Get-WersjaPaths -Number $Number -ThesisRoot $ThesisRoot

    if (Test-Path (Join-Path $p.TexDir 'main.tex')) {

        return $p.TexDir

    }

    if (Test-Path (Join-Path $p.LegacyTexDir 'main.tex')) {

        return $p.LegacyTexDir

    }

    return $p.TexDir

}



function Get-CurrentWersjaNumberFromMd {

    param([string]$WersjaMdPath)

    if (-not (Test-Path $WersjaMdPath)) {

        throw "Missing $WersjaMdPath"

    }

    $content = Get-Content -LiteralPath $WersjaMdPath -Raw -Encoding UTF8

    $m = [regex]::Match($content, '(?i)obecna[^\n]*\*\*robocza-(\d+)\*\*')
    if ($m.Success) { return [int]$m.Groups[1].Value }
    $m = [regex]::Match($content, '(?i)obecna[^\n]*\*\*0*(\d+)\*\*')
    if ($m.Success) { return [int]$m.Groups[1].Value }
    $m = [regex]::Match($content, '(?i)wersja\s+robocza\s+(\d+)')
    if ($m.Success) { return [int]$m.Groups[1].Value }
    throw "Could not parse current version from WERSJA.md (expected robocza-NN or 000N)"

}



function Write-WersjaPdfAliases {

    param(

        [Parameter(Mandatory)][string]$SourcePdf,

        [Parameter(Mandatory)]$Paths  # from Get-WersjaPaths

    )

    Copy-Item -LiteralPath $SourcePdf -Destination $Paths.PdfFile -Force

    $len = (Get-Item -LiteralPath $Paths.PdfFile).Length

    Write-Host ("Saved wersje-pdf/{0} ({1} bytes)" -f (Split-Path $Paths.PdfFile -Leaf), $len)

}


