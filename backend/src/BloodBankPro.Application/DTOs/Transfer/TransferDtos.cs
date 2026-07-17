using System;

namespace BloodBankPro.Application.DTOs.Transfer;

public class TransferOrderCreateDto
{
    public Guid BloodComponentId { get; set; }
    public Guid DestinationFacilityId { get; set; }
    public string? Notes { get; set; }
}

public class TransferOrderDetailDto
{
    public Guid Id { get; set; }
    public required string ShipmentNumber { get; set; }
    public Guid BloodComponentId { get; set; }
    public required string UnitId { get; set; } // DIN from parent BloodUnit
    public required string ComponentType { get; set; }
    public required string BloodGroup { get; set; }
    public int VolumeMl { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    public Guid SourceFacilityId { get; set; }
    public required string SourceFacilityName { get; set; }
    public Guid DestinationFacilityId { get; set; }
    public required string DestinationFacilityName { get; set; }
    public required string Status { get; set; }
    public DateTime SentDateUtc { get; set; }
    public DateTime? ReceivedDateUtc { get; set; }
    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }
}

public class DiscardComponentDto
{
    public required string DiscardReason { get; set; }
}

public class ComponentInventoryDto
{
    public Guid Id { get; set; }
    public required string UnitId { get; set; } // DIN
    public required string ComponentType { get; set; }
    public required string BloodGroup { get; set; }
    public int VolumeMl { get; set; }
    public DateTime ExpiryDateUtc { get; set; }
    public required string Status { get; set; }
    public Guid FacilityId { get; set; }
    public required string FacilityName { get; set; }
    public double DaysRemaining { get; set; }
}
