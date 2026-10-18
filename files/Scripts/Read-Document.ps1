<#
    قراءة نص صورة أو ملف PDF ممسوح بقارئ ويندوز المدمج (Windows.Media.Ocr) باللغة العربية، داخل الجهاز بلا إنترنت.
    يستدعيه البرنامج لكل مستند أسرة: صفحات PDF تُحوَّل لصور ثم تُقرأ.
    الصورة تُقرأ ثلاث مرات (كما هي، ثم مكبَّرة رمادية بتباين أعلى بدرجتين): النسخ المصوَّرة الباهتة تُقرأ أرقامها
    وأسماؤها في إحدى القراءات دون الأخرى، والبرنامج يجمع أفضلها.
    المخرج JSON بترميز UTF-8:  {"ok":true,"pages":[["سطر",...],...],"passes":[["سطر",...],...]}  أو  {"ok":false,"error":"..."}
    السطور مرتبة من أعلى الصفحة لأسفلها.
#>
param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Write-Result($value) { [Console]::Out.Write(($value | ConvertTo-Json -Depth 5 -Compress)) }

# نسخة مكبَّرة رمادية بتباين أعلى من الصورة (PNG مؤقت)
function New-EnhancedImage([string]$source, [int]$width, [double]$contrast) {
    Add-Type -AssemblyName System.Drawing
    $image = [System.Drawing.Image]::FromFile($source)
    try {
        $scale = [Math]::Max(1.0, $width / $image.Width)
        $w = [int]($image.Width * $scale); $h = [int]($image.Height * $scale)
        $limit = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension
        if ($w -gt $limit -or $h -gt $limit) { $fit = $limit / [Math]::Max($w, $h); $w = [int]($w * $fit); $h = [int]($h * $fit) }
        $bitmap = New-Object System.Drawing.Bitmap $w, $h
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.Clear([System.Drawing.Color]::White)
        $shift = (1 - $contrast) / 2
        $matrix = New-Object System.Drawing.Imaging.ColorMatrix
        $matrix.Matrix00 = 0.299 * $contrast; $matrix.Matrix01 = 0.299 * $contrast; $matrix.Matrix02 = 0.299 * $contrast
        $matrix.Matrix10 = 0.587 * $contrast; $matrix.Matrix11 = 0.587 * $contrast; $matrix.Matrix12 = 0.587 * $contrast
        $matrix.Matrix20 = 0.114 * $contrast; $matrix.Matrix21 = 0.114 * $contrast; $matrix.Matrix22 = 0.114 * $contrast
        $matrix.Matrix33 = 1; $matrix.Matrix40 = $shift; $matrix.Matrix41 = $shift; $matrix.Matrix42 = $shift; $matrix.Matrix44 = 1
        $attributes = New-Object System.Drawing.Imaging.ImageAttributes
        $attributes.SetColorMatrix($matrix)
        $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), 0, 0, $image.Width, $image.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
        $out = Join-Path ([IO.Path]::GetTempPath()) ("church-ocr-" + [Guid]::NewGuid().ToString('N') + '.png')
        $bitmap.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose(); $bitmap.Dispose()
        return $out
    }
    finally { $image.Dispose() }
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
    $null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
    $null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
    $null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

    $methods = [System.WindowsRuntimeSystemExtensions].GetMethods()
    $asTaskOf = $methods | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
    $asTaskAction = $methods | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
    function Await($operation, [Type]$type) {
        $task = $asTaskOf.MakeGenericMethod($type).Invoke($null, @($operation))
        $task.Wait(-1) | Out-Null
        $task.Result
    }
    function AwaitAction($action) { $task = $asTaskAction.Invoke($null, @($action)); $task.Wait(-1) | Out-Null }

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language 'ar'))
    if ($null -eq $engine) { Write-Result @{ ok = $false; error = 'قارئ النصوص العربي غير مثبت في ويندوز على هذا الجهاز.' }; exit 0 }

    function Read-Stream($stream) {
        $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
        # السطور من أعلى لأسفل، وكلمات السطر العربي من اليمين (القارئ يعطيها من اليسار)
        , @($result.Lines | Sort-Object { (@($_.Words) | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum } | ForEach-Object {
            if ($_.Text -match '[ء-ي]') { (@($_.Words) | Sort-Object { $_.BoundingRect.X } -Descending | ForEach-Object { $_.Text }) -join " " } else { $_.Text }
        })
    }

    function Read-File([string]$path) {
        $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
        $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        try { , (Read-Stream $stream) } finally { $stream.Dispose() }
    }

    $full = (Resolve-Path $Path).Path
    $pages = @()
    $passes = @()
    if ([IO.Path]::GetExtension($full) -ieq '.pdf') {
        $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($full)) ([Windows.Storage.StorageFile])
        $pdf = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
        for ($i = 0; $i -lt [Math]::Min($pdf.PageCount, 10); $i++) {
            $page = $pdf.GetPage($i)
            $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
            $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
            # عرض يكفي للحروف الصغيرة ولا يتجاوز حد القارئ
            $options.DestinationWidth = [uint32][Math]::Min(2400, [Windows.Media.Ocr.OcrEngine]::MaxImageDimension)
            AwaitAction ($page.RenderToStreamAsync($stream, $options))
            $pages += , (Read-Stream $stream)
            $page.Dispose()
        }
        $passes += , @($pages | ForEach-Object { $_ })
    }
    else {
        $pages += , (Read-File $full)
        $passes += , $pages[0]
        foreach ($variant in @(@(2400, 1.6), @(3200, 1.4))) {
            $enhanced = $null
            try {
                $enhanced = New-EnhancedImage $full $variant[0] $variant[1]
                $passes += , (Read-File $enhanced)
            }
            catch { }
            finally { if ($enhanced -and (Test-Path $enhanced)) { Remove-Item $enhanced -Force } }
        }
    }
    Write-Result @{ ok = $true; pages = $pages; passes = $passes }
}
catch {
    Write-Result @{ ok = $false; error = $_.Exception.Message }
}
