# Ejecuta este script en PowerShell para copiar los íconos PWA al directorio public/
# Doble clic en el archivo o ejecutar en terminal PowerShell

$src = "C:\Users\Migue\.gemini\antigravity\brain\0d03469c-0717-4cb4-a39d-448e20a6187a"
$dst = "C:\Users\Migue\OneDrive\Documentos\Desarrollos\NaturaPOS\frontend\public"

Copy-Item "$src\natural_os_icon_new_1778801158429.png" "$dst\icon-512.png" -Force
Copy-Item "$src\natural_os_maskable_new_1778801172599.png" "$dst\icon-maskable.png" -Force
Copy-Item "$src\natural_os_icon_new_1778801158429.png" "$dst\icon-192.png" -Force

Write-Host "✅ Íconos PWA copiados:"
Get-ChildItem "$dst\*.png" | Select-Object Name, Length
