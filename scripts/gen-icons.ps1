Add-Type -AssemblyName System.Drawing

$sizes = @{
  'pwa-192x192.png'     = 192
  'pwa-512x512.png'     = 512
  'apple-touch-icon.png' = 180
}

$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'public'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

foreach ($name in $sizes.Keys) {
  $s = $sizes[$name]
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $rect = New-Object System.Drawing.RectangleF(0, 0, $s, $s)
  $c1 = [System.Drawing.Color]::FromArgb(99, 102, 241)
  $c2 = [System.Drawing.Color]::FromArgb(79, 70, 229)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = [int]($s * 0.22)
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90)
  $path.AddArc($s - $d, 0, $d, $d, 270, 90)
  $path.AddArc($s - $d, $s - $d, $d, $d, 0, 90)
  $path.AddArc(0, $s - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)

  $fs = [int]($s * 0.55)
  $font = New-Object System.Drawing.Font('Segoe UI', $fs, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $g.DrawString('C', $font, [System.Drawing.Brushes]::White, $rect, $sf)

  $out = Join-Path $outDir $name
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Host "wrote $out"
}
