$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$env:PGPASSWORD = "postgres"

Write-Host "=== Resetting postgres password to 'postgres' ==="
& $psqlPath -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>&1

Write-Host "`n=== Verifying connection works ==="
& $psqlPath -U postgres -d talentpulsedb -c "SELECT 'Connection successful! Tables exist: ' || count(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
