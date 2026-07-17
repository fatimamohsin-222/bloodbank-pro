using Microsoft.AspNetCore.Identity;

namespace BloodBankPro.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public required string FullName { get; set; }
    public Guid? FacilityId { get; set; } // Null for SuperAdmins/IT who cross facilities
}
