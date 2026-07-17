using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Application.DTOs.Collection;

public class DonationSessionCreateDto
{
    public Guid DonorId { get; set; }
    public Guid FacilityId { get; set; }
    public int SystolicBP { get; set; }
    public int DiastolicBP { get; set; }
    public int PulseRate { get; set; }
    public double TemperatureCelsius { get; set; }
    public double HemoglobinLevel { get; set; }
    public double WeightKg { get; set; }
}

public class DonationSessionDetailDto
{
    public Guid Id { get; set; }
    public Guid DonorId { get; set; }
    public required string DonorName { get; set; }
    public Guid FacilityId { get; set; }
    public required string FacilityName { get; set; }
    public int SystolicBP { get; set; }
    public int DiastolicBP { get; set; }
    public int PulseRate { get; set; }
    public double TemperatureCelsius { get; set; }
    public double HemoglobinLevel { get; set; }
    public double WeightKg { get; set; }
    public bool VitalsVerified { get; set; }
    public required string SessionStatus { get; set; }
    public string? RejectionReason { get; set; }
    public string? UnitId { get; set; }
    public DateTime DonationDateUtc { get; set; }
}

public class BloodUnitListItemDto
{
    public Guid Id { get; set; }
    public required string UnitId { get; set; }
    public Guid DonorId { get; set; }
    public required string DonorName { get; set; }
    public BloodGroup BloodGroup { get; set; }
    public UnitStatus Status { get; set; }
    public DateTime CollectionDateUtc { get; set; }
    
    public bool TTIScreened { get; set; }
    public bool TTIReactive { get; set; }
    public bool ABOConfirmed { get; set; }
    
    // Track ABO double-verification state on DTO level
    public string? FirstAboValue { get; set; }
    public string? SecondAboValue { get; set; }
    public bool AboMismatch { get; set; }
}

public class AboRecordDto
{
    public BloodGroup BloodGroup { get; set; }
}

public class TtiRecordDto
{
    public bool HivReactive { get; set; }
    public bool HepBReactive { get; set; }
    public bool HepCReactive { get; set; }
    public bool SyphilisReactive { get; set; }
}
