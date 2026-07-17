namespace BloodBankPro.Domain.Entities;

public class BloodReservation : BaseEntity
{
    public Guid BloodRequestId { get; set; }
    public virtual BloodRequest BloodRequest { get; set; } = null!;
    
    public Guid BloodComponentId { get; set; }
    public virtual BloodComponent BloodComponent { get; set; } = null!;
    
    public DateTime ReservedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime HoldUntilUtc { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool IsReleased { get; set; } = false;
    
    public Guid ReservedByUserId { get; set; }
    
    // Navigation properties
    public virtual CrossMatch? CrossMatch { get; set; }
}
