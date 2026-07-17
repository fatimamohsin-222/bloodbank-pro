using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Application.DTOs.Donor;

public class DonorRegisterDto
{
    public required string FullName { get; set; }
    public required string NationalId { get; set; }
    public DateTime DateOfBirth { get; set; }
    public BloodGroup BloodGroup { get; set; }
    public string? Gender { get; set; }
    public required string ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}

public class DonorUpdateDto
{
    public required string FullName { get; set; }
    public string? Gender { get; set; }
    public required string ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}

public class DeferralCreateDto
{
    public DeferralType Type { get; set; }
    public required string Reason { get; set; }
    public int? DurationDays { get; set; } // Null for permanent Deferral
}

public class DeferralDto
{
    public Guid Id { get; set; }
    public DeferralType Type { get; set; }
    public required string Reason { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime? EndDateUtc { get; set; }
}

public class DonationSessionDto
{
    public Guid Id { get; set; }
    public DateTime DonationDateUtc { get; set; }
    public required string SessionStatus { get; set; }
    public string? RejectionReason { get; set; }
    public string? UnitId { get; set; }
}

public class DonorDetailDto
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string NationalId { get; set; }
    public DateTime DateOfBirth { get; set; }
    public BloodGroup BloodGroup { get; set; }
    public string? Gender { get; set; }
    public required string ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public bool IsEligible { get; set; }
    public DateTime? NextEligibleDateUtc { get; set; }
    public string? Notes { get; set; }
    
    public List<DeferralDto> Deferrals { get; set; } = new();
    public List<DonationSessionDto> DonationSessions { get; set; } = new();
}

public class DonorListItemDto
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string NationalId { get; set; }
    public BloodGroup BloodGroup { get; set; }
    public required string ContactNumber { get; set; }
    public bool IsEligible { get; set; }
    public DateTime? NextEligibleDateUtc { get; set; }
}
