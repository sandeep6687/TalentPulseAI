$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$env:PGPASSWORD = "postgres"

Write-Host "=== Checking PostgreSQL version & port ==="
& $psqlPath -U postgres -c "SELECT version();" 2>&1

Write-Host "`n=== Databases available ==="
& $psqlPath -U postgres -c "\l" 2>&1

Write-Host "`n=== Tables in talentpulsedb ==="
& $psqlPath -U postgres -d talentpulsedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1
