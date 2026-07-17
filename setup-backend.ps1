Write-Host "Creating solution and projects..."
dotnet new sln -n BloodBankPro -o backend
dotnet new classlib -o backend/src/BloodBankPro.Domain -f net10.0
dotnet new classlib -o backend/src/BloodBankPro.Application -f net10.0
dotnet new classlib -o backend/src/BloodBankPro.Infrastructure -f net10.0
dotnet new webapi -o backend/src/BloodBankPro.Api -f net10.0

Write-Host "Adding projects to solution..."
dotnet sln backend/BloodBankPro.sln add backend/src/BloodBankPro.Domain/BloodBankPro.Domain.csproj
dotnet sln backend/BloodBankPro.sln add backend/src/BloodBankPro.Application/BloodBankPro.Application.csproj
dotnet sln backend/BloodBankPro.sln add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj
dotnet sln backend/BloodBankPro.sln add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj

Write-Host "Adding project references..."
dotnet add backend/src/BloodBankPro.Application/BloodBankPro.Application.csproj reference backend/src/BloodBankPro.Domain/BloodBankPro.Domain.csproj
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj reference backend/src/BloodBankPro.Application/BloodBankPro.Application.csproj
dotnet add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj reference backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj

Write-Host "Scaffolding completed successfully!"
