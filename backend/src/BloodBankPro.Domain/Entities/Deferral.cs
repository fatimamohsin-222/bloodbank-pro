using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class Deferral : BaseEntity
{
    public Guid DonorId { get; set; }
    public virtual Donor Donor { get; set; } = null!;
    
    public DeferralType Type { get; set; }
    public required string Reason { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime? EndDateUtc { get; set; } // Null if permanent Deferral
    
    public Guid CreatedByUserId { get; set; }
    public Guid? AuthorizedByUserId { get; set; }
}
