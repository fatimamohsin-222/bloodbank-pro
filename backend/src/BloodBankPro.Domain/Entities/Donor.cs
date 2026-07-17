using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class Donor : BaseEntity
{
    public required string FullName { get; set; }
    public required string NationalId { get; set; } // Unique identifier
    public DateTime DateOfBirth { get; set; }
    public BloodGroup BloodGroup { get; set; } = BloodGroup.Unknown;
    public string? Gender { get; set; }
    public required string ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public bool IsEligible { get; set; } = true;
    public DateTime? NextEligibleDateUtc { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public virtual ICollection<Deferral> Deferrals { get; set; } = new List<Deferral>();
    public virtual ICollection<DonationSession> DonationSessions { get; set; } = new List<DonationSession>();
}
