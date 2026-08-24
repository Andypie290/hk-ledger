$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Icon {
    param([int]$Size, [string]$Path)

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 15, 118, 110),
        [System.Drawing.Color]::FromArgb(255, 45, 212, 191),
        135.0)
    $graphics.FillRectangle($brush, $rect)

    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 255, 255, 255))
    $graphics.FillEllipse($accent, [int]($Size * 0.45), [int]($Size * 0.58), [int]($Size * 0.85), [int]($Size * 0.85))

    $font = New-Object System.Drawing.Font('Segoe UI', [single]($Size * 0.30), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF([single]0, [single]($Size * 0.05), [single]$Size, [single]$Size)
    $graphics.DrawString('HK$', $font, [System.Drawing.Brushes]::White, $textRect, $format)

    $graphics.Dispose()
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $accent.Dispose()
    $format.Dispose()
}

New-Icon 192 (Join-Path $outDir 'icon-192.png')
New-Icon 512 (Join-Path $outDir 'icon-512.png')
Write-Output 'Icons generated.'
