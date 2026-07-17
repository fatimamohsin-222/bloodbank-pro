using BloodBankPro.Domain.Enums;

namespace BloodBankPro.Domain.Entities;

public class BloodRequest : BaseEntity
{
    public required string RequestNumber { get; set; }
    
    public Guid FacilityId { get; set; }
    public virtual Facility Facility { get; set; } = null!;
    
    public required string PatientName { get; set; }
    public required string PatientNationalId { get; set; }
    public DateTime PatientDateOfBirth { get; set; }
    public BloodGroup PatientBloodGroup { get; set; }
    
    public ComponentType ComponentType { get; set; }
    public int UnitsRequested { get; set; }
    
    public RequestUrgency Urgency { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    
    public required string ClinicalIndication { get; set; }
    
    public Guid RequestingPhysicianId { get; set; }
    public Guid? AuthorizedByPhysicianId { get; set; }
    public Guid? CoSignedByNurseId { get; set; }
    
    public DateTime RequiredDateUtc { get; set; }
    
    // Navigation properties
    public virtual ICollection<BloodReservation> Reservations { get; set; } = new List<BloodReservation>();
}
