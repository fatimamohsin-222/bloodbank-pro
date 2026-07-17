using System;
using System.Collections.Generic;

namespace BloodBankPro.Application.DTOs.Request;

public class BloodRequestCreateDto
{
    public required string PatientName { get; set; }
    public required string PatientNationalId { get; set; }
    public DateTime PatientDateOfBirth { get; set; }
    public string PatientBloodGroup { get; set; } = "OPositive";
    public string ComponentType { get; set; } = "RedBloodCells";
    public int UnitsRequested { get; set; }
    public string Urgency { get; set; } = "Routine";
    public required string ClinicalIndication { get; set; }
    public DateTime RequiredDateUtc { get; set; }
}

public class BloodRequestDetailDto
{
    public Guid Id { get; set; }
    public required string RequestNumber { get; set; }
    public Guid FacilityId { get; set; }
    public required string FacilityName { get; set; }
    public required string PatientName { get; set; }
    public required string PatientNationalId { get; set; }
    public DateTime PatientDateOfBirth { get; set; }
    public required string PatientBloodGroup { get; set; }
    public required string ComponentType { get; set; }
    public int UnitsRequested { get; set; }
    public required string Urgency { get; set; }
    public required string Status { get; set; }
    public required string ClinicalIndication { get; set; }
    public Guid RequestingPhysicianId { get; set; }
    public string? RequestingPhysicianName { get; set; }
    public DateTime RequiredDateUtc { get; set; }
    public List<ReservationDetailDto> Reservations { get; set; } = new();
}

public class ReservationDetailDto
{
    public Guid Id { get; set; }
    public Guid BloodComponentId { get; set; }
    public required string UnitId { get; set; } // DIN
    public required string ComponentType { get; set; }
    public required string BloodGroup { get; set; }
    public int VolumeMl { get; set; }
    public DateTime ReservedAtUtc { get; set; }
    public DateTime HoldUntilUtc { get; set; }
    public bool IsActive { get; set; }
    public bool IsReleased { get; set; }
    public bool HasCrossMatch { get; set; }
    public bool? CrossMatchCompatible { get; set; }
    public string? CrossMatchMethod { get; set; }
    public string? CrossMatchNotes { get; set; }
}

public class ReserveComponentDto
{
    public Guid BloodComponentId { get; set; }
}

public class CrossMatchRecordDto
{
    public bool Compatible { get; set; }
    public required string Method { get; set; } // Gel Card, Tube, etc.
    public string? Notes { get; set; }
}

public class TransfusionStartDto
{
    public Guid BloodComponentId { get; set; }
    public required string PatientName { get; set; }
    public required string PatientNationalId { get; set; }
    public required string NurseName1 { get; set; }
    public required string NurseName2 { get; set; }
    public required string PreTransfusionVitals { get; set; } // JSON formatted or raw string
}

public class TransfusionCompleteDto
{
    public required string PostTransfusionVitals { get; set; }
}

public class AdverseReactionReportDto
{
    public string Severity { get; set; } = "Mild"; // Mild, Moderate, Severe
    public required string SymptomsDescription { get; set; }
    public string? Notes { get; set; }
}

public class TransfusionDetailDto
{
    public Guid Id { get; set; }
    public Guid BloodComponentId { get; set; }
    public required string UnitId { get; set; } // DIN
    public required string ComponentType { get; set; }
    public required string BloodGroup { get; set; }
    public required string PatientName { get; set; }
    public required string PatientNationalId { get; set; }
    public required string Nurse1 { get; set; }
    public required string Nurse2 { get; set; }
    public DateTime TransfusionStartedAtUtc { get; set; }
    public DateTime? TransfusionCompletedAtUtc { get; set; }
    public required string PreTransfusionVitals { get; set; }
    public string? PostTransfusionVitals { get; set; }
    public bool HasAdverseReaction { get; set; }
    public string? AdverseReactionSeverity { get; set; }
    public string? AdverseReactionSymptoms { get; set; }
}
