# PowerShell script to replace Ionicons with Icon component
# This script replaces all Ionicons imports and usages with the new Icon component

$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "import Ionicons from"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Replace import statement
    $content = $content -replace "import Ionicons from ['\`"]react-native-vector-icons/Ionicons['\`"];", "import Icon from '../components/Icon';"
    $content = $content -replace "import Icon from ['\`"]\.\.\/components\/Icon['\`"];", "import Icon from '../components/Icon';"
    $content = $content -replace "import Icon from ['\`"]\.\.\/\.\.\/components\/Icon['\`"];", "import Icon from '../../components/Icon';"
    $content = $content -replace "import Icon from ['\`"]\.\.\/\.\.\/\.\.\/components\/Icon['\`"];", "import Icon from '../../../components/Icon';"
    
    # Replace component usage
    $content = $content -replace "<Ionicons", "<Icon"
    $content = $content -replace "</Ionicons>", "</Icon>"
    $content = $content -replace "Ionicons\.", "Icon."
    $content = $content -replace "Animated\.createAnimatedComponent\(Ionicons\)", "Animated.createAnimatedComponent(Icon)"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Icon replacement complete!"














