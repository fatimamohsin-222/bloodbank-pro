namespace BloodBankPro.Domain.Entities;

public class Transfusion : BaseEntity
{
    public Guid BloodComponentId { get; set; }
    public virtual BloodComponent BloodComponent { get; set; } = null!;
    
    public required string PatientName { get; set; }
    public required string PatientNationalId { get; set; }
    
    // Bedside verification requires two distinct nurses
    public Guid NurseId1 { get; set; }
    public Guid NurseId2 { get; set; }
    
    public DateTime TransfusionStartedAtUtc { get; set; }
    public DateTime? TransfusionCompletedAtUtc { get; set; }
    
    // Vitals formatted as JSON string or detailed properties
    public string PreTransfusionVitalsJson { get; set; } = "{}";
    public string? PostTransfusionVitalsJson { get; set; }
    
    // Adverse reaction navigation
    public virtual AdverseReaction? AdverseReaction { get; set; }
}
