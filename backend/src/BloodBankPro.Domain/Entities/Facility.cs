namespace BloodBankPro.Domain.Entities;

public class Facility : BaseEntity
{
    public required string Name { get; set; }
    public required string Address { get; set; }
    public string TimeZoneId { get; set; } = "UTC";
    
    // Navigation properties
    public virtual ICollection<BloodUnit> BloodUnits { get; set; } = new List<BloodUnit>();
    public virtual ICollection<BloodRequest> BloodRequests { get; set; } = new List<BloodRequest>();
}
