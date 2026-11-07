<#
    تحديث البرنامج على جهاز الكنيسة مع الاحتفاظ بكل بياناته.
    يُشغَّل من «تحديث البرنامج.cmd» بعد نسخ مجلد التحديث إلى داخل مجلد البرنامج (بجوار مجلد app).

    ما يفعله:
      1) يوقف البرنامج إن كان يعمل.
      2) يأخذ نسخة من قاعدة البيانات في مجلد «نسخ-قبل-التحديث».
      3) يضع البرنامج الجديد وينقل إليه البيانات: القاعدة، مفاتيح الدخول، بيانات الكنيسة، إعدادات النسخ الاحتياطي، الشعار، الصور.
      4) يحتفظ بالبرنامج القديم في app-old (للرجوع إليه عند الحاجة) ثم يشغّل البرنامج.

    الرسائل العربية تظهر في نوافذ حوار لأن النافذة السوداء لا تعرض العربية (تظهر مربعات)؛
    لذلك ما يُكتب في النافذة السوداء نفسها بالإنجليزية.

    التحديث التلقائي الليلي: البرنامج نفسه يشغّله بـ -Silent -NewFolder <الإصدار الجديد> -ProgramRoot <مجلد البرنامج>،
    فلا تظهر نوافذ، والرسائل تُكتب في update-log.txt، ويعود البرنامج للعمل بنفس طريقة تشغيله،
    وإن لم يعمل الإصدار الجديد يُرجَع القديم تلقائيًا.
#>
param(
    [string]$NewFolder = '',
    [string]$ProgramRoot = '',
    [switch]$Silent
)
$ErrorActionPreference = 'Stop'
$update = Split-Path -Parent $MyInvocation.MyCommand.Path
$new = if ($NewFolder) { $NewFolder } else { Join-Path $update 'app-new' }
$logFile = if ($ProgramRoot) { Join-Path $ProgramRoot 'update-log.txt' } else { Join-Path $update 'update-log.txt' }
# السجل قد يكون مقفولًا لحظات (برنامج الحماية يفحصه بعد كل كتابة، أو Keep-Alive يقرؤه): تُعاد المحاولة،
# ولا يوقف السجلُّ التحديثَ أبدًا (توقُّفه في منتصف التحديث كان يترك البرنامج القديم)
function Write-Log([string]$text) {
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $text
    for ($i = 0; $i -lt 20; $i++) {
        try { Add-Content -Path $logFile -Value $line -Encoding UTF8 -ErrorAction Stop; return } catch { Start-Sleep -Milliseconds 500 }
    }
}
# خطوات التحديث التلقائي في السجل، فيُعرف أين توقف إن توقف.
# تبدأ بـ «بدء التحديث» لأن Keep-Alive على جهاز الكنيسة لا يعيد تشغيل البرنامج ما دام آخر سطر كذلك وعمره أقل من 10 دقائق
function Write-Step([string]$text) { if ($Silent) { Write-Log "بدء التحديث - $text" } }
# أي خطأ غير متوقع يُكتب في السجل بدل أن يتوقف السكربت بصمت
trap { if ($Silent) { Write-Log "توقف التحديث بخطأ: $($_.Exception.Message)" }; break }

Add-Type -AssemblyName System.Windows.Forms
$dialogTitle = 'تحديث برنامج عضوية الكنيسة'
$dialogOwner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }
$dialogRtl = [System.Windows.Forms.MessageBoxOptions]::RtlReading -bor [System.Windows.Forms.MessageBoxOptions]::RightAlign

function Show-Message([string]$message, [string]$icon = 'Information') {
    if ($Silent) { Write-Log $message; return }
    [void][System.Windows.Forms.MessageBox]::Show($dialogOwner, $message, $dialogTitle, 'OK', $icon, 'Button1', $dialogRtl)
}

function Stop-WithMessage([string]$message) {
    Write-Host 'Update stopped. Nothing more will be changed.' -ForegroundColor Red
    Show-Message $message 'Error'
    exit 1
}

function Test-ProgramFolder([string]$folder) {
    return [bool]$folder -and (Test-Path (Join-Path $folder 'app\ChurchMembership.exe'))
}

if (-not (Test-Path (Join-Path $new 'ChurchMembership.exe'))) {
    Stop-WithMessage 'مجلد التحديث ناقص: لا يوجد app-new\ChurchMembership.exe. انسخ مجلد التحديث كاملًا من جديد.'
}

# مجلد البرنامج: المحدد في التحديث التلقائي، أو الذي نُسخ فيه مجلد التحديث (بجوار app)، أو مجلد ChurchMembership المجاور له
$root = if ($ProgramRoot) { $ProgramRoot } else { Split-Path -Parent $update }
if ($Silent -and -not (Test-ProgramFolder $root)) { Stop-WithMessage "مجلد البرنامج غير صحيح: $root" }
if (-not (Test-ProgramFolder $root)) {
    $sibling = Join-Path $root 'ChurchMembership'
    if (Test-ProgramFolder $sibling) { $root = $sibling }
    else {
        Write-Host 'Program folder not found next to the update folder. Please choose it in the dialog.' -ForegroundColor Yellow
        Show-Message ("لم أجد البرنامج بجوار مجلد التحديث.`n`n" +
            "هذا المجلد يُشغَّل على الجهاز المراد تحديثه، من داخل مجلد البرنامج ChurchMembership (بجوار مجلد app).`n`n" +
            'اضغط «موافق» ثم اختر مجلد البرنامج: المجلد الذي فيه مجلد app وملف «تشغيل البرنامج.cmd».') 'Warning'
        $picker = New-Object System.Windows.Forms.FolderBrowserDialog
        $picker.Description = 'اختر مجلد البرنامج ChurchMembership (الذي فيه مجلد app)'
        $picker.ShowNewFolderButton = $false
        if ($picker.ShowDialog($dialogOwner) -ne 'OK') { Stop-WithMessage 'لم يُختر مجلد. لم يتغير شيء.' }
        $chosen = $picker.SelectedPath
        # لو اختير مجلد app نفسه فالمقصود المجلد الذي يحتويه
        if (-not (Test-ProgramFolder $chosen) -and (Test-Path (Join-Path $chosen 'ChurchMembership.exe'))) {
            $chosen = Split-Path -Parent $chosen
        }
        if (-not (Test-ProgramFolder $chosen)) { Stop-WithMessage 'هذا المجلد ليس مجلد البرنامج (لا يوجد فيه app\ChurchMembership.exe). لم يتغير شيء.' }
        $root = $chosen
    }
}
$app = Join-Path $root 'app'
if ((Join-Path $app '') -eq (Join-Path $new '')) { Stop-WithMessage 'مجلد البرنامج المختار هو مجلد التحديث نفسه. لم يتغير شيء.' }
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
Write-Host "Updating the program in: $root" -ForegroundColor Cyan

# 1) إيقاف البرنامج العامل من هذا المجلد
Write-Host '1/4 Stopping the program...'
$running = Get-CimInstance Win32_Process -Filter "Name='ChurchMembership.exe'" | Where-Object { $_.ExecutablePath -like "$app\*" }
# طريقة التشغيل الحالية (المنفذ وغيره) لإعادة التشغيل بها بعد التحديث التلقائي
$runArguments = $null
if ($running) {
    $commandLine = @($running)[0].CommandLine
    $runArguments = if ($commandLine -match '^\s*"[^"]*"\s*(.*)$') { $Matches[1] } elseif ($commandLine -match '^\s*\S+\s*(.*)$') { $Matches[1] } else { '' }
}
if ($Silent) { Write-Log "بدء التحديث التلقائي في $root" }
$running | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$running | ForEach-Object { Wait-Process -Id $_.ProcessId -Timeout 30 -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# 2) نسخة من قاعدة البيانات قبل أي شيء
Write-Host '2/4 Backing up the database...'
Write-Step '2/4: نسخة من قاعدة البيانات'
$database = Join-Path $app 'church.db'
$safe = $null
if (Test-Path $database) {
    $safe = Join-Path $root 'نسخ-قبل-التحديث'
    New-Item -ItemType Directory -Force $safe | Out-Null
    Get-ChildItem $app -Filter 'church.db*' | ForEach-Object {
        Copy-Item $_.FullName (Join-Path $safe ($_.Name -replace '^church', "church-$stamp")) -Force
    }
}
else {
    Write-Host '    No database yet in this copy (never started): only the program is updated.' -ForegroundColor Yellow
}

# 3) البرنامج الجديد في مجلد جانبي، وتُنقل إليه البيانات
Write-Host '3/4 Copying the new program and moving the data into it... (about a minute)'
Write-Step '3/4: نسخ البرنامج الجديد ونقل البيانات إليه'
$next = Join-Path $root 'app-next'
if (Test-Path $next) { Remove-Item $next -Recurse -Force }
Copy-Item $new $next -Recurse -Force
Copy-Item (Join-Path $app 'church.db*') $next -Force -ErrorAction SilentlyContinue
# App_Data: مستندات الأسر وكتب المكتبة المرفوعة
foreach ($name in '.data-protection-keys', 'church-profile.json', 'backup-settings.json', 'session-settings.json', 'update-settings.json', 'App_Data') {
    $item = Join-Path $app $name
    if (Test-Path $item) { Copy-Item $item $next -Recurse -Force }
}
Copy-Item (Join-Path $app 'voucher-logo.*') $next -Force -ErrorAction SilentlyContinue
# شعار الحضانة واسمها (خاصان بكل كنيسة)
Copy-Item (Join-Path $app 'nursery-logo.*') $next -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $app 'nursery-brand.json') $next -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $app 'page-texts.json') $next -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $app 'nursery-cert-bg.*') $next -Force -ErrorAction SilentlyContinue
if (Test-Path (Join-Path $app 'wwwroot\uploads')) {
    Copy-Item (Join-Path $app 'wwwroot\uploads') (Join-Path $next 'wwwroot') -Recurse -Force
}
if ((Test-Path $database) -and -not (Test-Path (Join-Path $next 'church.db'))) {
    Remove-Item $next -Recurse -Force
    Stop-WithMessage 'تعذر نقل قاعدة البيانات إلى النسخة الجديدة. لم يتغير شيء في البرنامج.'
}

# 4) التبديل بإعادة التسمية: لو كان ملف مقفولًا تفشل التسمية والبرنامج القديم لا يُمس
Write-Host '4/4 Switching to the new program...'
Write-Step '4/4: التبديل إلى البرنامج الجديد'
# الإصدار الأقدم (app-old) يُنحّى بإعادة التسمية فقط، وهي لحظية؛ حذفه هنا (نحو 250 ميجا) كان يوقف السكربت بصمت على جهاز الكنيسة
# فيبقى البرنامج متوقفًا بلا تحديث. يُحذف بعد نجاح التحديث.
$trashIndex = 0
Get-ChildItem $root -Directory -Filter 'app-old*' | ForEach-Object {
    $trashIndex++
    try { Rename-Item $_.FullName ("app-trash-$stamp-$trashIndex") -ErrorAction Stop }
    catch { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
}
$renamed = $false
for ($i = 0; $i -lt 30 -and -not $renamed; $i++) {
    try { Rename-Item $app 'app-old' -ErrorAction Stop; $renamed = $true } catch { Start-Sleep -Seconds 1 }
}
if (-not $renamed) {
    Remove-Item $next -Recurse -Force -ErrorAction SilentlyContinue
    Stop-WithMessage 'تعذر استبدال البرنامج (ملفاته ما زالت مستخدمة). أغلق البرنامج والمتصفح وأعد المحاولة. لم يتغير شيء.'
}
Rename-Item $next 'app'
Write-Host 'Done. The program is updated and all data is kept.' -ForegroundColor Green

# تشغيل عملية مستقلة تمامًا عن هذا السكربت (عن طريق WMI)، وتُرجع رقمها.
# على جهاز الكنيسة يعمل التحديث داخل مهمة مجدولة، وكل ما يشغّله السكربت بطريقة عادية يُغلق معه لحظة انتهائه:
# فكان البرنامج الجديد يتوقف بعد «تم التحديث» حتى يعيده Keep-Alive. الاحتياطي Start-Process إن تعذر WMI.
function Start-Independent([string]$file, [string]$arguments, [string]$folder) {
    try {
        $startup = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }
        $result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -ErrorAction Stop -Arguments @{
            CommandLine = "`"$file`" $arguments"; CurrentDirectory = $folder; ProcessStartupInformation = $startup
        }
        if ($result.ReturnValue -eq 0) { return [int]$result.ProcessId }
        if ($Silent) { Write-Log "تعذر التشغيل المستقل عبر WMI (الرمز $($result.ReturnValue)): تشغيل عادي." }
    }
    catch { if ($Silent) { Write-Log "تعذر التشغيل المستقل عبر WMI ($($_.Exception.Message)): تشغيل عادي." } }
    return (Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $folder -WindowStyle Hidden -PassThru).Id
}

# الإصدارات الأقدم المنحّاة: تُحذف بعد أن صار البرنامج الجديد في مكانه، في عملية مستقلة لا يُنتظر انتهاؤها،
# فلو تعثر الحذف أو أُوقف لا يتأثر التحديث، ويُعاد في التحديث التالي
function Remove-Trash {
    if (-not (Get-ChildItem $root -Directory -Filter 'app-trash-*')) { return }
    $command = "Get-ChildItem -LiteralPath '$($root.Replace("'", "''"))' -Directory -Filter 'app-trash-*' | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
    try { Start-Independent (Join-Path $PSHOME 'powershell.exe') "-NoProfile -Command `"$command`"" $root | Out-Null } catch { }
}

# 5) التحديث التلقائي: إعادة التشغيل بنفس الطريقة، والرجوع للقديم إن لم يعمل الجديد
if ($Silent) {
    if ($null -eq $runArguments) { Write-Log 'تم التحديث. البرنامج لم يكن يعمل، فلم يُشغَّل.'; Remove-Trash; exit 0 }
    function Start-Program { Start-Independent (Join-Path $app 'ChurchMembership.exe') $runArguments $app }
    $programId = Start-Program
    Write-Step 'تشغيل الإصدار الجديد والتأكد أنه يعمل (دقيقة)'
    Start-Sleep -Seconds 60
    if (-not (Get-Process -Id $programId -ErrorAction SilentlyContinue)) {
        Write-Log 'الإصدار الجديد لم يعمل: الرجوع للإصدار السابق.'
        Rename-Item $app 'app-failed' -ErrorAction SilentlyContinue
        Rename-Item (Join-Path $root 'app-old') 'app'
        Get-ChildItem $app -Filter 'church.db*' | Remove-Item -Force -ErrorAction SilentlyContinue
        if ($safe) { Get-ChildItem $safe -Filter "church-$stamp.db*" | ForEach-Object { Copy-Item $_.FullName (Join-Path $app ($_.Name -replace "^church-$stamp", 'church')) -Force } }
        Start-Program | Out-Null
        exit 1
    }
    Write-Log 'تم التحديث التلقائي والبرنامج يعمل.'
    # مجلد التنزيل لم يعد لازمًا (الإصدار السابق محفوظ في app-old)
    if ($NewFolder -and (Test-Path $NewFolder)) { Remove-Item $NewFolder -Recurse -Force -ErrorAction SilentlyContinue }
    Remove-Trash
    exit 0
}

# 5) التشغيل (أول تشغيل بعد التحديث قد يأخذ دقيقة لأنه يحدّث قاعدة البيانات)
$launcher = Join-Path $root 'تشغيل البرنامج.cmd'
$launched = Test-Path $launcher
if ($launched) { Start-Process -FilePath $launcher -WorkingDirectory $root }
Remove-Trash

$summary = "تم تحديث البرنامج، وكل البيانات كما هي.`n`nمجلد البرنامج: $root`n"
if ($safe) { $summary += "نسخة البيانات قبل التحديث: نسخ-قبل-التحديث`n" }
$summary += "البرنامج القديم محفوظ في مجلد app-old؛ احذفه بعد أن تطمئن أن كل شيء يعمل.`n`n"
$summary += if ($launched) { 'جارٍ تشغيل البرنامج (أول تشغيل قد يأخذ دقيقة). في المتصفح اضغط Ctrl+F5 لترى الشكل الجديد.' }
            else { 'شغّل البرنامج الآن من «تشغيل البرنامج.cmd»، ثم اضغط Ctrl+F5 في المتصفح.' }
Show-Message $summary
