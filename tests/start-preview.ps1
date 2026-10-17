$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:61648/'
try {
    $previewResponse = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
    if ($previewResponse.Headers['X-Game-Preview'] -eq 'poqi-lingxiao-v08') {
        Write-Output 'Preview is already running.'
        return
    }
    throw 'Port 61648 is occupied by a different server.'
} catch {
    if (Get-NetTCPConnection -LocalPort 61648 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 61648 is occupied; no process was stopped.'
    }
}
$previewPython = (Get-Command pythonw.exe -ErrorAction Stop).Source
$previewScript = Join-Path $PSScriptRoot 'preview_server.py'
$previewProcess = Start-Process -FilePath $previewPython -ArgumentList @('"' + $previewScript + '"') -WorkingDirectory (Split-Path $PSScriptRoot -Parent) -WindowStyle Hidden -PassThru
Write-Output ('Started hidden preview, PID ' + $previewProcess.Id)
