$nodePath = "C:\Program Files\nodejs"
$env:PATH = "$nodePath;" + $env:PATH

Write-Host "Node: $(node -v) | NPM: $(npm -v)"
Write-Host "Approving esbuild scripts..."
npm approve-scripts esbuild 2>$null

Write-Host "Installing dependencies..."
npm install --ignore-scripts
npm install 2>&1 | Where-Object { $_ -notmatch "warn" }

Write-Host "Starting Vite dev server..."
npm run dev
