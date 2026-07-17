using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class BloodUnit : BaseEntity
{
    public required string UnitId { get; set; } // Enforced Unique Key in DB
    
    public Guid DonorId { get; set; }
    public virtual Donor Donor { get; set; } = null!;
    
    public Guid FacilityId { get; set; }
    public virtual Facility Facility { get; set; } = null!;
    
    public BloodGroup BloodGroup { get; set; }
    public UnitStatus Status { get; set; } = UnitStatus.Collected;
    
    public DateTime CollectionDateUtc { get; set; }
    
    // Testing state
    public bool TTIScreened { get; set; } = false;
    public bool TTIReactive { get; set; } = false; // True if HIV, HepB, HepC, or Syphilis is positive
    
    // TTI detail results
    public string? TtiResultsJson { get; set; } // Detailed result flags (e.g. HIV: Non-Reactive)
    
    public bool ABOConfirmed { get; set; } = false;
    
    public Guid CreatedByUserId { get; set; }
    public Guid? VerifiedByUserId { get; set; }
    
    public string? DiscardReason { get; set; }
    public string? LineageParentUnitId { get; set; } // If split from another unit

    // Navigation properties
    public virtual ICollection<BloodComponent> Components { get; set; } = new List<BloodComponent>();
}
