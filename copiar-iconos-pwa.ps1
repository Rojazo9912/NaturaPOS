# Ejecuta este script en PowerShell para copiar los íconos PWA al directorio public/
# Doble clic en el archivo o ejecutar en terminal PowerShell

$src = "C:\Users\Migue\.gemini\antigravity\brain\3a8e6fea-cf30-421c-9088-57bee5d68950"
$dst = "C:\Users\Migue\OneDrive\Documentos\Desarrollos\NaturaPOS\frontend\public"

Copy-Item "$src\natura_os_single_pro_icon_1778821970209.png" "$dst\icon-512.png" -Force
Copy-Item "$src\natura_os_single_pro_icon_1778821970209.png" "$dst\icon-maskable.png" -Force
Copy-Item "$src\natura_os_single_pro_icon_1778821970209.png" "$dst\icon-192.png" -Force

Write-Host "✅ Íconos PWA copiados:"
Get-ChildItem "$dst\*.png" | Select-Object Name, Length
