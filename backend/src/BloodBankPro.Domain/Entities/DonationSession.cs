namespace BloodBankPro.Domain.Entities;

public class DonationSession : BaseEntity
{
    public Guid DonorId { get; set; }
    public virtual Donor Donor { get; set; } = null!;
    
    public Guid FacilityId { get; set; }
    public virtual Facility Facility { get; set; } = null!;
    
    // Pre-donation vitals
    public int SystolicBP { get; set; }
    public int DiastolicBP { get; set; }
    public int PulseRate { get; set; }
    public double TemperatureCelsius { get; set; }
    public double HemoglobinLevel { get; set; }
    public double WeightKg { get; set; }
    
    public bool VitalsVerified { get; set; }
    public string SessionStatus { get; set; } = "Pending"; // Pending, Collected, Rejected
    public string? RejectionReason { get; set; }
    
    public string? UnitId { get; set; } // Generated unique unit identifier (DIN)
    public DateTime DonationDateUtc { get; set; } = DateTime.UtcNow;
    public Guid CollectedByUserId { get; set; }
}
