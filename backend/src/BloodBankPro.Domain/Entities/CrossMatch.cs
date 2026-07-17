namespace BloodBankPro.Domain.Entities;

public class CrossMatch : BaseEntity
{
    public Guid BloodReservationId { get; set; }
    public virtual BloodReservation BloodReservation { get; set; } = null!;
    
    public Guid TechnologistId { get; set; }
    
    public bool Compatible { get; set; }
    public required string Method { get; set; } // Gel Card, Tube, Major Match
    public string? Notes { get; set; }
    
    public DateTime CrossMatchedAtUtc { get; set; } = DateTime.UtcNow;
}
