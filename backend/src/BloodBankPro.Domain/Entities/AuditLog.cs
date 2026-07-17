namespace BloodBankPro.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid UserId { get; set; }
    public required string UserEmail { get; set; }
    public required string Action { get; set; } // e.g. Create, Update, Delete, View, Override
    public required string TableName { get; set; }
    public required string RecordId { get; set; }
    
    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    
    public Guid? FacilityId { get; set; } // Scopes the audit log to a facility where applicable
    public string? IpAddress { get; set; }
}
