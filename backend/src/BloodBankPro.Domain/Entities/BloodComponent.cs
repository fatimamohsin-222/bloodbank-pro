using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class BloodComponent : BaseEntity
{
    public Guid BloodUnitId { get; set; }
    public virtual BloodUnit BloodUnit { get; set; } = null!;
    
    public ComponentType ComponentType { get; set; }
    public int VolumeMl { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    
    public UnitStatus Status { get; set; } = UnitStatus.Testing;
    
    public Guid FacilityId { get; set; } // Currently residing facility
    public virtual Facility Facility { get; set; } = null!;
    
    // Helper to check if component is expired
    public bool IsExpired() => DateTime.UtcNow >= ExpiryDateUtc;
}
