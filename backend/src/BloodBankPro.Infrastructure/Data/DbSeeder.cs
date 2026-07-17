using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BloodBankPro.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager)
    {
        // 1. Ensure migrations are applied
        await context.Database.MigrateAsync();

        // 2. Seed Facilities
        var facilities = new List<Facility>();
        if (!await context.Facilities.AnyAsync())
        {
            facilities = new List<Facility>
            {
                new() { Name = "Central Blood Bank", Address = "123 Healthcare Ave, Sector G", TimeZoneId = "Asia/Karachi" },
                new() { Name = "City General Hospital", Address = "456 Hospital Road, Sector F", TimeZoneId = "Asia/Karachi" },
                new() { Name = "Jinnah Memorial Hospital", Address = "789 Medical Blvd, Sector H", TimeZoneId = "Asia/Karachi" }
            };

            await context.Facilities.AddRangeAsync(facilities);
            await context.SaveChangesAsync();
        }
        else
        {
            facilities = await context.Facilities.ToListAsync();
        }

        // 3. Seed Roles
        var roles = new[]
        {
            "SuperAdmin", "FacilityAdmin", "MedicalDirector", "LabTechnologist",
            "InventoryManager", "DonorCoordinator", "RequestingPhysician", "Nurse",
            "Auditor", "SystemAdmin"
        };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new ApplicationRole(role));
            }
        }

        // 4. Seed Default SuperAdmin
        var superAdminEmail = "admin@bloodbankpro.com";
        ApplicationUser? superAdmin = await userManager.FindByEmailAsync(superAdminEmail);
        if (superAdmin == null)
        {
            superAdmin = new ApplicationUser
            {
                UserName = superAdminEmail,
                Email = superAdminEmail,
                FullName = "System SuperAdmin",
                EmailConfirmed = true,
                FacilityId = null // SuperAdmin is cross-facility
            };

            var result = await userManager.CreateAsync(superAdmin, "Admin123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(superAdmin, "SuperAdmin");
            }
        }

        // 5. Seed Users across Facilities
        var seededUsers = new List<ApplicationUser>();
        if (context.Users.Count() <= 1) // Only SuperAdmin exists
        {
            var random = new Random();
            var firstNames = new[] { "Ahmed", "Fatima", "Ali", "Ayesha", "Bilal", "Sana", "Usman", "Zainab", "Hamza", "Mariam" };
            var lastNames = new[] { "Khan", "Ahmed", "Malik", "Raza", "Sheikh", "Shah", "Tariq", "Noor", "Iqbal", "Butt" };

            // Seed 5 users per role across the 3 facilities
            int userCounter = 1;
            foreach (var role in roles)
            {
                if (role == "SuperAdmin") continue;

                for (int i = 1; i <= 5; i++)
                {
                    var facility = facilities[random.Next(facilities.Count)];
                    var email = $"{role.ToLower()}{i}@bloodbankpro.com";
                    var user = new ApplicationUser
                    {
                        UserName = email,
                        Email = email,
                        FullName = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}",
                        EmailConfirmed = true,
                        FacilityId = facility.Id
                    };

                    var result = await userManager.CreateAsync(user, "Password123!");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, role);
                        seededUsers.Add(user);
                        userCounter++;
                    }
                }
            }
        }
        else
        {
            seededUsers = await context.Users.Where(u => u.Email != superAdminEmail).ToListAsync();
        }

        // 6. Seed Donors (200)
        var donors = new List<Donor>();
        if (!await context.Donors.AnyAsync())
        {
            var random = new Random();
            var donorFirstNames = new[] { "Zaid", "Hira", "Omer", "Kiran", "Fahad", "Nida", "Junaid", "Sara", "Waleed", "Hina", "Haris", "Amna", "Kamran", "Maha", "Mustafa" };
            var donorLastNames = new[] { "Farooq", "Lodi", "Abbasi", "Qureshi", "Gillani", "Javed", "Siddiqui", "Rehman", "Hashmi", "Dar", "Yousaf", "Mughal", "Mir", "Ansari" };
            var bloodGroups = Enum.GetValues<BloodGroup>().Where(g => g != BloodGroup.Unknown).ToArray();
            var genders = new[] { "Male", "Female" };

            for (int i = 1; i <= 200; i++)
            {
                var isEligible = random.Next(100) > 10; // 90% eligible
                var nextEligible = isEligible ? null : (DateTime?)DateTime.UtcNow.AddDays(random.Next(1, 90));
                
                var donor = new Donor
                {
                    FullName = $"{donorFirstNames[random.Next(donorFirstNames.Length)]} {donorLastNames[random.Next(donorLastNames.Length)]}",
                    NationalId = $"42101-{random.Next(1000000, 9999999)}-{random.Next(1, 9)}",
                    DateOfBirth = DateTime.UtcNow.AddYears(-random.Next(18, 65)).AddDays(-random.Next(0, 365)),
                    BloodGroup = bloodGroups[random.Next(bloodGroups.Length)],
                    Gender = genders[random.Next(genders.Length)],
                    ContactNumber = $"+92300{random.Next(1000000, 9999999)}",
                    Email = $"donor{i}@gmail.com",
                    Address = $"{random.Next(1, 200)} Main St, Block {random.Next(1, 15)}",
                    IsEligible = isEligible,
                    NextEligibleDateUtc = nextEligible,
                    Notes = isEligible ? null : "Recent temporary deferral seeded"
                };

                // Add random temporary deferral to ineligible donors
                if (!isEligible)
                {
                    donor.Deferrals.Add(new Deferral
                    {
                        Type = DeferralType.Temporary,
                        Reason = "Low Hemoglobin on pre-screen",
                        StartDateUtc = DateTime.UtcNow.AddDays(-5),
                        EndDateUtc = nextEligible,
                        CreatedByUserId = superAdmin.Id
                    });
                }

                donors.Add(donor);
            }

            await context.Donors.AddRangeAsync(donors);
            await context.SaveChangesAsync();
        }
        else
        {
            donors = await context.Donors.ToListAsync();
        }

        // 7. Seed Blood Units (100) across all lifecycle states
        if (!await context.BloodUnits.AnyAsync())
        {
            var random = new Random();
            var bloodGroups = Enum.GetValues<BloodGroup>().Where(g => g != BloodGroup.Unknown).ToArray();
            var lifecycleStatuses = Enum.GetValues<UnitStatus>().ToArray();

            int unitCounter = 1;
            foreach (var status in lifecycleStatuses)
            {
                // Generate ~12 units for each status to reach ~100
                int countForStatus = status == UnitStatus.Quarantined ? 16 : 12;
                for (int i = 0; i < countForStatus; i++)
                {
                    var donor = donors[random.Next(donors.Count)];
                    var facility = facilities[random.Next(facilities.Count)];
                    
                    var ttiScreened = status != UnitStatus.Collected && status != UnitStatus.Testing;
                    var ttiReactive = status == UnitStatus.Quarantined && random.Next(2) == 0;
                    var aboConfirmed = status != UnitStatus.Collected && status != UnitStatus.Testing;

                    var unitId = $"DIN-{DateTime.UtcNow.Year}-{unitCounter:D6}";
                    
                    var unit = new BloodUnit
                    {
                        UnitId = unitId,
                        DonorId = donor.Id,
                        FacilityId = facility.Id,
                        BloodGroup = donor.BloodGroup,
                        Status = status,
                        CollectionDateUtc = DateTime.UtcNow.AddDays(-random.Next(1, 30)),
                        TTIScreened = ttiScreened,
                        TTIReactive = ttiReactive,
                        TtiResultsJson = ttiScreened ? "{\"HIV\":\"Non-Reactive\",\"HepB\":\"Non-Reactive\",\"HepC\":\"Non-Reactive\",\"Syphilis\":\"Non-Reactive\"}" : null,
                        ABOConfirmed = aboConfirmed,
                        CreatedByUserId = superAdmin.Id,
                        DiscardReason = status == UnitStatus.Discarded ? "Hemolysis detected" : null
                    };

                    // Add components
                    var componentTypes = new[] { ComponentType.RedBloodCells, ComponentType.FreshFrozenPlasma, ComponentType.Platelets };
                    foreach (var cType in componentTypes)
                    {
                        var shelfLifeDays = cType switch
                        {
                            ComponentType.RedBloodCells => 42,
                            ComponentType.FreshFrozenPlasma => 365,
                            ComponentType.Platelets => 5,
                            _ => 35
                        };

                        var componentStatus = status;
                        var expiry = unit.CollectionDateUtc.AddDays(shelfLifeDays);
                        if (status == UnitStatus.Expired)
                        {
                            expiry = DateTime.UtcNow.AddDays(-random.Next(1, 5));
                        }

                        unit.Components.Add(new BloodComponent
                        {
                            ComponentType = cType,
                            VolumeMl = cType == ComponentType.RedBloodCells ? 250 : 200,
                            ExpiryDateUtc = expiry,
                            Status = componentStatus,
                            FacilityId = facility.Id
                        });
                    }

                    await context.BloodUnits.AddAsync(unit);
                    unitCounter++;
                }
            }

            await context.SaveChangesAsync();
        }

        // 8. Seed Blood Requests (20)
        if (!await context.BloodRequests.AnyAsync())
        {
            var random = new Random();
            var patientFirstNames = new[] { "Zahid", "Shaista", "Tariq", "Rubina", "Aslam", "Nazia", "Khalid", "Fozia", "Babar", "Tahira" };
            var patientLastNames = new[] { "Mehmood", "Bibi", "Sohail", "Parveen", "Bashir", "Sultana", "Jameel", "Yasmin", "Ghafoor", "Begum" };
            var bloodGroups = Enum.GetValues<BloodGroup>().Where(g => g != BloodGroup.Unknown).ToArray();
            var urgencies = Enum.GetValues<RequestUrgency>().ToArray();
            var requestStatuses = Enum.GetValues<RequestStatus>().ToArray();

            for (int i = 1; i <= 20; i++)
            {
                var facility = facilities[random.Next(facilities.Count)];
                var reqStatus = requestStatuses[random.Next(requestStatuses.Length)];
                
                var request = new BloodRequest
                {
                    RequestNumber = $"REQ-{DateTime.UtcNow.Year}-{i:D5}",
                    FacilityId = facility.Id,
                    PatientName = $"{patientFirstNames[random.Next(patientFirstNames.Length)]} {patientLastNames[random.Next(patientLastNames.Length)]}",
                    PatientNationalId = $"35201-{random.Next(1000000, 9999999)}-{random.Next(1, 9)}",
                    PatientDateOfBirth = DateTime.UtcNow.AddYears(-random.Next(5, 75)),
                    PatientBloodGroup = bloodGroups[random.Next(bloodGroups.Length)],
                    ComponentType = ComponentType.RedBloodCells,
                    UnitsRequested = random.Next(1, 4),
                    Urgency = urgencies[random.Next(urgencies.Length)],
                    Status = reqStatus,
                    ClinicalIndication = "Anemia / Surgical support",
                    RequestingPhysicianId = superAdmin.Id,
                    RequiredDateUtc = DateTime.UtcNow.AddDays(random.Next(1, 3))
                };

                await context.BloodRequests.AddAsync(request);
            }

            await context.SaveChangesAsync();
        }
    }
}
