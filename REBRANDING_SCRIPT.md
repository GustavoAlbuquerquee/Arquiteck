# Script de Substituição em Massa - Rebranding Primor Móveis
# Execute este script para aplicar todas as mudanças de cores

## Substituições Globais (aplicar em todos os arquivos .tsx)

### Botões Principais
bg-blue-600 → bg-primor-primary
hover:bg-blue-700 → hover:brightness-110
text-blue-600 → text-primor-primary
disabled:bg-blue-400 → disabled:opacity-50

### Botões Secundários  
bg-green-600 → bg-primor-secondary
hover:bg-green-700 → hover:brightness-110
text-green-600 → text-primor-secondary

### Fundos e Cards
bg-blue-50 → bg-primor-bg-light
bg-green-50 → bg-primor-bg-light
bg-purple-50 → bg-primor-bg-light
bg-pink-50 → bg-primor-bg-light
bg-orange-50 → bg-primor-bg-light
bg-yellow-50 → bg-primor-bg-light
bg-indigo-50 → bg-primor-bg-light

### Bordas
border-blue-300 → border-primor-primary/30
border-green-300 → border-primor-primary/30
border-purple-300 → border-primor-secondary/20
border-gray-300 → border-primor-gray-medium
border-gray-200 → border-primor-gray-medium

### Textos
text-gray-800 → text-primor-text-light
text-gray-700 → text-primor-text-light
text-gray-600 → text-primor-gray-dark
text-gray-500 → text-primor-gray-dark
text-gray-400 → text-primor-gray-dark

### Focus States
focus:border-blue-500 → focus:border-primor-primary
focus:ring-blue-200 → focus:ring-primor-primary/20
focus:border-green-500 → focus:border-primor-primary
focus:ring-green-200 → focus:ring-primor-primary/20

### Spinners/Loaders
text-blue-600 animate-spin → text-primor-primary animate-spin

### Hover States
hover:border-blue-300 → hover:border-primor-primary
hover:bg-gray-800 → hover:bg-primor-secondary/80
hover:text-blue-700 → hover:brightness-110

## Comando PowerShell para Substituição Automática

```powershell
# Navegar para a pasta do projeto
cd C:\Users\BG\Arquiteck\apps\web\src

# Substituir bg-blue-600
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'bg-blue-600', 'bg-primor-primary' | Set-Content $_.FullName
}

# Substituir hover:bg-blue-700
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'hover:bg-blue-700', 'hover:brightness-110' | Set-Content $_.FullName
}

# Substituir text-blue-600
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'text-blue-600', 'text-primor-primary' | Set-Content $_.FullName
}

# Substituir border-gray-300
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'border-gray-300', 'border-primor-gray-medium' | Set-Content $_.FullName
}

# Substituir text-gray-800
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'text-gray-800', 'text-primor-text-light' | Set-Content $_.FullName
}

# Substituir text-gray-700
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'text-gray-700', 'text-primor-text-light' | Set-Content $_.FullName
}

# Substituir text-gray-500
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'text-gray-500', 'text-primor-gray-dark' | Set-Content $_.FullName
}

# Substituir bg-blue-50
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'bg-blue-50', 'bg-primor-bg-light' | Set-Content $_.FullName
}

# Substituir bg-green-50
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'bg-green-50', 'bg-primor-bg-light' | Set-Content $_.FullName
}

# Substituir focus:border-blue-500
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus:border-blue-500', 'focus:border-primor-primary' | Set-Content $_.FullName
}

# Substituir focus:ring-blue-200
Get-ChildItem -Recurse -Filter *.tsx | ForEach-Object {
    (Get-Content $_.FullName) -replace 'focus:ring-blue-200', 'focus:ring-primor-primary/20' | Set-Content $_.FullName
}
```

## Executar o Script

1. Abra o PowerShell como Administrador
2. Copie e cole os comandos acima
3. Execute um por vez
4. Verifique o resultado com `pnpm dev`

## Verificação Manual Necessária

Após executar o script, verifique manualmente:
- ChecklistWizard.tsx (indicadores de progresso)
- Historico.tsx (badges de status)
- Step2Levantamento.tsx (seções condicionais)
- InstallPWA.tsx (gradiente do banner)
