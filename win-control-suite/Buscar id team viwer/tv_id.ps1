# Elevar permisos si no es administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process PowerShell -Verb RunAs "-File `"$PSCommandPath`""
    exit
}

# Configuración: ruta del archivo de configuración Zabbix
$configPaths = @(
    "C:\windows\idenPC.cfg" # Asegurarse de que esta ruta esté incluida
)

# Función para buscar TeamViewer dinámicamente en el registro
function Find-TeamViewerPath {
    $basePaths = @(
        'HKEY_LOCAL_MACHINE\SOFTWARE',
        'HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node'
    )
    
    foreach ($basePath in $basePaths) {
        try {
            # Buscar carpeta TeamViewer directamente
            $teamViewerPath = "$basePath\TeamViewer"
            $result = reg query "$teamViewerPath" /v ClientID 2>$null
            if ($LASTEXITCODE -eq 0) {
                return $teamViewerPath
            }
            
            # Buscar versiones específicas de TeamViewer
            $teamViewerQuery = reg query "$basePath" /k 2>$null
            if ($LASTEXITCODE -eq 0) {
                $subKeys = $teamViewerQuery | Where-Object { $_ -match "TeamViewer" }
                foreach ($subKey in $subKeys) {
                    if ($subKey -match "HKEY_LOCAL_MACHINE\\.*\\(TeamViewer.*)") {
                        $fullPath = "$basePath\$($matches[1])"
                        $result = reg query "$fullPath" /v ClientID 2>$null
                        if ($LASTEXITCODE -eq 0) {
                            return $fullPath
                        }
                    }
                }
            }
        }
        catch {
            continue
        }
    }
    
    # Si no encuentra nada, devolver ruta por defecto
    return 'HKEY_LOCAL_MACHINE\SOFTWARE\TeamViewer'
}

# Buscar ruta válida para ClientID en registro
$validPath = Find-TeamViewerPath

# Construir línea UserParameter (corregido el formato)
$userParameterLine = "UserParameter=dosi.tw,reg query `"$validPath`" /v ClientID"

# Buscar primer archivo válido y añadir línea si no existe
$archivoModificado = $false
foreach ($configPath in $configPaths) {
    if (Test-Path $configPath) {
        $content = Get-Content $configPath -Raw -ErrorAction SilentlyContinue
        if ($content -notmatch [regex]::Escape($userParameterLine)) {
            # Asegurar que hay un salto de línea antes de añadir
            if ($content -and -not $content.EndsWith("`n") -and -not $content.EndsWith("`r`n")) {
                Add-Content -Path $configPath -Value "" -Encoding UTF8 -ErrorAction SilentlyContinue
            }
            Add-Content -Path $configPath -Value $userParameterLine -Encoding UTF8 -ErrorAction SilentlyContinue
        }
        $archivoModificado = $true
        break
    }
}

# Si no se modificó ningún archivo, crear el primero con la línea
if (-not $archivoModificado) {
    try {
        Set-Content -Path $configPaths[0] -Value $userParameterLine -Encoding UTF8 -ErrorAction SilentlyContinue
    }
    catch {
        # Silencioso si falla
    }
}

# --- Autodestrucción ---
$vbsScript = @"
WScript.Sleep 2000
Set fso = CreateObject(""Scripting.FileSystemObject"")
On Error Resume Next
fso.DeleteFile ""$($MyInvocation.MyCommand.Path)"", True
fso.DeleteFile WScript.ScriptFullName, True
On Error Goto 0
"@

$tempVbs = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), [System.IO.Path]::GetRandomFileName() + ".vbs")
Set-Content -Path $tempVbs -Value $vbsScript -Encoding ASCII
Start-Process -FilePath "cscript.exe" -ArgumentList "//nologo `"$tempVbs`"" -WindowStyle Hidden
exit