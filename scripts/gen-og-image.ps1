Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'public'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$W = 1200
$H = 630

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background gradient
$rect = New-Object System.Drawing.RectangleF(0, 0, $W, $H)
$c1 = [System.Drawing.Color]::FromArgb(79, 70, 229)   # indigo-600
$c2 = [System.Drawing.Color]::FromArgb(49, 46, 129)   # indigo-900
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 135)
$g.FillRectangle($bg, 0, 0, $W, $H)

# Decorative circles
$soft = [System.Drawing.Color]::FromArgb(40, 255, 255, 255)
$softBrush = New-Object System.Drawing.SolidBrush($soft)
$g.FillEllipse($softBrush, 850, -200, 600, 600)
$g.FillEllipse($softBrush, -150, 350, 500, 500)

# Icon tile
$iconSize = 96
$iconX = 90
$iconY = 110
$iconRect = New-Object System.Drawing.RectangleF($iconX, $iconY, $iconSize, $iconSize)
$iconPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 22
$d = $r * 2
$iconPath.AddArc($iconX, $iconY, $d, $d, 180, 90)
$iconPath.AddArc($iconX + $iconSize - $d, $iconY, $d, $d, 270, 90)
$iconPath.AddArc($iconX + $iconSize - $d, $iconY + $iconSize - $d, $d, $d, 0, 90)
$iconPath.AddArc($iconX, $iconY + $iconSize - $d, $d, $d, 90, 90)
$iconPath.CloseFigure()
$g.FillPath([System.Drawing.Brushes]::White, $iconPath)

# "C" inside icon
$iconFont = New-Object System.Drawing.Font('Segoe UI', 58, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$indigoBrush = New-Object System.Drawing.SolidBrush($c1)
$g.DrawString('C', $iconFont, $indigoBrush, $iconRect, $sf)

# Brand small
$brandFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$brandBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 255, 255, 255))
$g.DrawString('COMMUTE', $brandFont, $brandBrush, 210, 148)

# Headline
$titleFont = New-Object System.Drawing.Font('Segoe UI', 84, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('Plan your commute.', $titleFont, [System.Drawing.Brushes]::White, 85, 260)

$title2Font = New-Object System.Drawing.Font('Segoe UI', 84, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 199, 210, 254)) # indigo-200
$g.DrawString('Save your routes.', $title2Font, $accent, 85, 360)

# Subtitle
$subFont = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
$g.DrawString('Installable PWA  ·  Offline-ready  ·  Free', $subFont, $subBrush, 90, 490)

$out = Join-Path $outDir 'og-image.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "wrote $out"
