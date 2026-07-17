using System.Security.Claims;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Collection;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class CollectionController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<DonationSessionCreateDto> _createValidator;

    public CollectionController(IUnitOfWork unitOfWork, IValidator<DonationSessionCreateDto> createValidator)
    {
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var sessions = await _unitOfWork.DonationSessions.ListAllAsync();
        var donors = await _unitOfWork.Donors.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();

        var list = sessions.Select(s => new DonationSessionDetailDto
        {
            Id = s.Id,
            DonorId = s.DonorId,
            DonorName = donors.FirstOrDefault(d => d.Id == s.DonorId)?.FullName ?? "Unknown",
            FacilityId = s.FacilityId,
            FacilityName = facilities.FirstOrDefault(f => f.Id == s.FacilityId)?.Name ?? "Unknown",
            SystolicBP = s.SystolicBP,
            DiastolicBP = s.DiastolicBP,
            PulseRate = s.PulseRate,
            TemperatureCelsius = s.TemperatureCelsius,
            HemoglobinLevel = s.HemoglobinLevel,
            WeightKg = s.WeightKg,
            VitalsVerified = s.VitalsVerified,
            SessionStatus = s.SessionStatus,
            RejectionReason = s.RejectionReason,
            UnitId = s.UnitId,
            DonationDateUtc = s.DonationDateUtc
        }).OrderByDescending(s => s.DonationDateUtc).ToList();

        return Ok(list);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] DonationSessionCreateDto dto)
    {
        var validationResult = await _createValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var donor = await _unitOfWork.Donors.GetByIdAsync(dto.DonorId);
        if (donor == null)
        {
            return NotFound("Donor not found.");
        }

        if (!donor.IsEligible)
        {
            return BadRequest("Donor is currently deferred/suspended and cannot donate.");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var collectedBy = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        // Vitals checks
        var systolicFail = dto.SystolicBP < 90 || dto.SystolicBP > 180;
        var diastolicFail = dto.DiastolicBP < 50 || dto.DiastolicBP > 100;
        var pulseFail = dto.PulseRate < 50 || dto.PulseRate > 100;
        var tempFail = dto.TemperatureCelsius > 37.5;
        var hemoglobinFail = dto.HemoglobinLevel < 12.5;
        var weightFail = dto.WeightKg < 50.0;

        var failedVitalsList = new List<string>();
        if (systolicFail) failedVitalsList.Add($"Systolic BP ({dto.SystolicBP}) out of range (90-180)");
        if (diastolicFail) failedVitalsList.Add($"Diastolic BP ({dto.DiastolicBP}) out of range (50-100)");
        if (pulseFail) failedVitalsList.Add($"Pulse rate ({dto.PulseRate}) out of range (50-100)");
        if (tempFail) failedVitalsList.Add($"Temperature ({dto.TemperatureCelsius}°C) exceeded 37.5°C");
        if (hemoglobinFail) failedVitalsList.Add($"Hemoglobin ({dto.HemoglobinLevel}) below 12.5 g/dL");
        if (weightFail) failedVitalsList.Add($"Weight ({dto.WeightKg} kg) below 50 kg");

        var hasFailedVitals = failedVitalsList.Any();

        var session = new DonationSession
        {
            DonorId = dto.DonorId,
            FacilityId = dto.FacilityId,
            SystolicBP = dto.SystolicBP,
            DiastolicBP = dto.DiastolicBP,
            PulseRate = dto.PulseRate,
            TemperatureCelsius = dto.TemperatureCelsius,
            HemoglobinLevel = dto.HemoglobinLevel,
            WeightKg = dto.WeightKg,
            DonationDateUtc = DateTime.UtcNow,
            CollectedByUserId = collectedBy
        };

        if (hasFailedVitals)
        {
            // Vitals failed
            session.VitalsVerified = false;
            session.SessionStatus = "Rejected";
            session.RejectionReason = string.Join("; ", failedVitalsList);

            // Auto-defer donor for 30 days
            var deferral = new Deferral
            {
                DonorId = dto.DonorId,
                Type = DeferralType.Temporary,
                Reason = $"Auto-deferred: Pre-donation vitals failed ({session.RejectionReason}).",
                StartDateUtc = DateTime.UtcNow,
                EndDateUtc = DateTime.UtcNow.AddDays(30),
                CreatedByUserId = collectedBy,
                AuthorizedByUserId = collectedBy
            };

            await _unitOfWork.Deferrals.AddAsync(deferral);

            donor.IsEligible = false;
            donor.NextEligibleDateUtc = deferral.EndDateUtc;
            await _unitOfWork.Donors.UpdateAsync(donor);

            await _unitOfWork.DonationSessions.AddAsync(session);
            await _unitOfWork.SaveChangesAsync();

            return Ok(new { success = false, message = "Vitals check failed. Session rejected.", sessionStatus = "Rejected", reason = session.RejectionReason });
        }
        else
        {
            // Vitals passed - Generate DIN
            session.VitalsVerified = true;
            session.SessionStatus = "Collected";

            // Generate unique DIN format: DIN-YYYY-XXXXXX
            var allUnits = await _unitOfWork.BloodUnits.ListAllAsync();
            var nextNumber = allUnits.Count + 1;
            var din = $"DIN-{DateTime.UtcNow.Year}-{nextNumber:D6}";

            session.UnitId = din;

            // Create corresponding Blood Unit
            var bloodUnit = new BloodUnit
            {
                UnitId = din,
                DonorId = dto.DonorId,
                FacilityId = dto.FacilityId,
                BloodGroup = donor.BloodGroup,
                Status = UnitStatus.Testing,
                CollectionDateUtc = DateTime.UtcNow,
                TTIScreened = false,
                TTIReactive = false,
                ABOConfirmed = false,
                CreatedByUserId = collectedBy
            };

            await _unitOfWork.BloodUnits.AddAsync(bloodUnit);

            // Defer donor temporarily for 90 days (standard clinical gap)
            var deferral = new Deferral
            {
                DonorId = dto.DonorId,
                Type = DeferralType.Temporary,
                Reason = $"Auto-deferred: Standby cooling period of 90 days after donation unit {din}.",
                StartDateUtc = DateTime.UtcNow,
                EndDateUtc = DateTime.UtcNow.AddDays(90),
                CreatedByUserId = collectedBy,
                AuthorizedByUserId = collectedBy
            };

            await _unitOfWork.Deferrals.AddAsync(deferral);

            donor.IsEligible = false;
            donor.NextEligibleDateUtc = deferral.EndDateUtc;
            await _unitOfWork.Donors.UpdateAsync(donor);

            await _unitOfWork.DonationSessions.AddAsync(session);
            await _unitOfWork.SaveChangesAsync();

            return Ok(new { success = true, message = "Vitals passed. Blood unit collected.", unitId = din, sessionStatus = "Collected" });
        }
    }
}
