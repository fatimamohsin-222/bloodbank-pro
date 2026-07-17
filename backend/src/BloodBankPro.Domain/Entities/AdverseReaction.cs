using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class AdverseReaction : BaseEntity
{
    public Guid TransfusionId { get; set; }
    public virtual Transfusion Transfusion { get; set; } = null!;
    
    public ReactionSeverity Severity { get; set; }
    public required string SymptomsDescription { get; set; }
    
    public DateTime ReportedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid ReportedByNurseId { get; set; }
    
    public string? MedicalDirectorNotes { get; set; }
    public bool IsInvestigated { get; set; } = false;
}
