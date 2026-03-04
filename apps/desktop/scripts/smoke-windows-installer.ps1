param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [int]$StartupTimeoutSec = 90
)

$ErrorActionPreference = "Stop"

function Get-DescendantPids {
  param([int]$RootPid)

  $allPids = New-Object System.Collections.Generic.List[int]
  $queue = New-Object System.Collections.Generic.Queue[int]
  $allPids.Add($RootPid)
  $queue.Enqueue($RootPid)

  while ($queue.Count -gt 0) {
    $pid = $queue.Dequeue()
    $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $pid" | Select-Object -ExpandProperty ProcessId)
    foreach ($child in $children) {
      if (-not $allPids.Contains($child)) {
        $allPids.Add($child)
        $queue.Enqueue($child)
      }
    }
  }

  return @($allPids)
}

function Stop-ProcessTree {
  param([int]$RootPid)

  $pids = @(Get-DescendantPids -RootPid $RootPid | Sort-Object -Descending)
  foreach ($pid in $pids) {
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
    } catch {
      # Ignore already-exited processes.
    }
  }
}

$resolvedInstaller = (Resolve-Path $InstallerPath).Path
$installedDir = Join-Path $env:LOCALAPPDATA "Programs\NextClaw Desktop"
$installedExe = Join-Path $installedDir "NextClaw Desktop.exe"
$smokeHome = Join-Path $env:RUNNER_TEMP "nextclaw-desktop-smoke-home"

Write-Host "[desktop-smoke] installer: $resolvedInstaller"
Write-Host "[desktop-smoke] smoke home: $smokeHome"

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $smokeHome
New-Item -ItemType Directory -Path $smokeHome | Out-Null
$env:NEXTCLAW_HOME = $smokeHome

if (Test-Path $installedDir) {
  Write-Host "[desktop-smoke] removing existing install dir: $installedDir"
  Remove-Item -Recurse -Force $installedDir
}

Write-Host "[desktop-smoke] running silent install"
$installProc = Start-Process -FilePath $resolvedInstaller -ArgumentList "/S" -PassThru -Wait
if ($installProc.ExitCode -ne 0) {
  throw "Installer exited with code $($installProc.ExitCode)"
}

if (-not (Test-Path $installedExe)) {
  throw "Installed exe not found: $installedExe"
}

$appProc = $null
try {
  Write-Host "[desktop-smoke] launching desktop app"
  $appProc = Start-Process -FilePath $installedExe -PassThru
  $deadline = (Get-Date).AddSeconds($StartupTimeoutSec)
  $healthUrl = $null

  while ((Get-Date) -lt $deadline -and -not $healthUrl) {
    if ($appProc.HasExited) {
      throw "Desktop exited early. ExitCode=$($appProc.ExitCode)"
    }

    $candidatePids = @(Get-DescendantPids -RootPid $appProc.Id)
    $ports = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
      Where-Object { $candidatePids -contains $_.OwningProcess } |
      Select-Object -ExpandProperty LocalPort -Unique)

    foreach ($port in $ports) {
      $url = "http://127.0.0.1:$port/api/health"
      try {
        $payload = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2
        if ($payload.ok -eq $true -and $payload.data.status -eq "ok") {
          $healthUrl = $url
          break
        }
      } catch {
        # Continue polling.
      }
    }

    if (-not $healthUrl) {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $healthUrl) {
    throw "Health API did not become ready within ${StartupTimeoutSec}s."
  }

  Write-Host "[desktop-smoke] health check passed: $healthUrl"
} finally {
  if ($appProc -and -not $appProc.HasExited) {
    Stop-ProcessTree -RootPid $appProc.Id
  }
}
