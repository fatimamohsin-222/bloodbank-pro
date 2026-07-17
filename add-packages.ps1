Write-Host "Adding packages to Application project..."
dotnet add backend/src/BloodBankPro.Application/BloodBankPro.Application.csproj package AutoMapper
dotnet add backend/src/BloodBankPro.Application/BloodBankPro.Application.csproj package FluentValidation
dotnet add backend/src/BloodBankPro.Application/BloodBankPro.Application.csproj package Microsoft.Extensions.DependencyInjection.Abstractions

Write-Host "Adding packages to Infrastructure project..."
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj package Microsoft.EntityFrameworkCore
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj package Hangfire.AspNetCore
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj package Hangfire.PostgreSql
dotnet add backend/src/BloodBankPro.Infrastructure/BloodBankPro.Infrastructure.csproj package Microsoft.EntityFrameworkCore.Design

Write-Host "Adding packages to Api project..."
dotnet add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj package Serilog.AspNetCore
dotnet add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj package Serilog.Sinks.Console
dotnet add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj package Serilog.Sinks.File
dotnet add backend/src/BloodBankPro.Api/BloodBankPro.Api.csproj package Microsoft.EntityFrameworkCore.Design

Write-Host "NuGet packages installation completed!"
