using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class TransferOrder : BaseEntity
{
    public required string ShipmentNumber { get; set; } // Format: TRF-YYYY-XXXXXX
    
    public Guid BloodComponentId { get; set; }
    public virtual BloodComponent BloodComponent { get; set; } = null!;
    
    public Guid SourceFacilityId { get; set; }
    public virtual Facility SourceFacility { get; set; } = null!;
    
    public Guid DestinationFacilityId { get; set; }
    public virtual Facility DestinationFacility { get; set; } = null!;
    
    public TransferStatus Status { get; set; } = TransferStatus.Requested;
    
    public Guid CreatedByUserId { get; set; }
    
    public DateTime SentDateUtc { get; set; }
    public DateTime? ReceivedDateUtc { get; set; }
    
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }
}
