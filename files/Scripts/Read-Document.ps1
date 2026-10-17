<#
    قراءة نص صورة أو ملف PDF ممسوح بقارئ ويندوز المدمج (Windows.Media.Ocr) باللغة العربية، داخل الجهاز بلا إنترنت.
    يستدعيه البرنامج لكل مستند أسرة: صفحات PDF تُحوَّل لصور ثم تُقرأ.
    المخرج JSON بترميز UTF-8:  {"ok":true,"pages":[["سطر","سطر"],...]}  أو  {"ok":false,"error":"..."}
#>
param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Write-Result($value) { [Console]::Out.Write(($value | ConvertTo-Json -Depth 5 -Compress)) }

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
        # الكلمات تأتي من اليسار لليمين: السطر العربي يُرتَّب من اليمين
        , @($result.Lines | ForEach-Object {
            if ($_.Text -match '[ء-ي]') { (@($_.Words) | Sort-Object { $_.BoundingRect.X } -Descending | ForEach-Object { $_.Text }) -join " " } else { $_.Text }
        })
    }

    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((Resolve-Path $Path).Path)) ([Windows.Storage.StorageFile])
    $pages = @()
    if ([IO.Path]::GetExtension($Path) -ieq '.pdf') {
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
    }
    else {
        $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $pages += , (Read-Stream $stream)
    }
    Write-Result @{ ok = $true; pages = $pages }
}
catch {
    Write-Result @{ ok = $false; error = $_.Exception.Message }
}
