using System.Text.Json;
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
public class TestingController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<AboRecordDto> _aboValidator;

    public TestingController(IUnitOfWork unitOfWork, IValidator<AboRecordDto> aboValidator)
    {
        _unitOfWork = unitOfWork;
        _aboValidator = aboValidator;
    }

    [HttpGet("units")]
    public async Task<IActionResult> GetTestingUnits()
    {
        var units = await _unitOfWork.BloodUnits.ListAllAsync();
        var donors = await _unitOfWork.Donors.ListAllAsync();

        // Retrieve units that are in Testing or Quarantined (due to mismatch/testing issues)
        var testingUnits = units.Where(u => u.Status == UnitStatus.Collected || u.Status == UnitStatus.Testing || u.Status == UnitStatus.Quarantined).ToList();

        var list = new List<BloodUnitListItemDto>();
        foreach (var u in testingUnits)
        {
            // Parse TtiResultsJson to fetch first/second ABO state if exists
            string? firstAbo = null;
            string? secondAbo = null;
            var isMismatch = u.DiscardReason == "ABO Double-Verification Mismatch";

            if (!string.IsNullOrWhiteSpace(u.TtiResultsJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(u.TtiResultsJson);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("aboFirst", out var fVal)) firstAbo = fVal.GetString();
                    if (root.TryGetProperty("aboSecond", out var sVal)) secondAbo = sVal.GetString();
                }
                catch { }
            }

            list.Add(new BloodUnitListItemDto
            {
                Id = u.Id,
                UnitId = u.UnitId,
                DonorId = u.DonorId,
                DonorName = donors.FirstOrDefault(d => d.Id == u.DonorId)?.FullName ?? "Unknown",
                BloodGroup = u.BloodGroup,
                Status = u.Status,
                CollectionDateUtc = u.CollectionDateUtc,
                TTIScreened = u.TTIScreened,
                TTIReactive = u.TTIReactive,
                ABOConfirmed = u.ABOConfirmed,
                FirstAboValue = firstAbo,
                SecondAboValue = secondAbo,
                AboMismatch = isMismatch
            });
        }

        return Ok(list);
    }

    [HttpPost("units/{id}/abo")]
    public async Task<IActionResult> RecordAbo(Guid id, [FromBody] AboRecordDto dto)
    {
        var validationResult = await _aboValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var unit = await _unitOfWork.BloodUnits.GetByIdAsync(id);
        if (unit == null)
        {
            return NotFound("Blood unit not found.");
        }

        if (unit.ABOConfirmed)
        {
            return BadRequest("ABO typing has already been confirmed for this unit.");
        }

        // Initialize/parse metadata JSON
        var metaDict = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(unit.TtiResultsJson))
        {
            try
            {
                metaDict = JsonSerializer.Deserialize<Dictionary<string, string>>(unit.TtiResultsJson) ?? new();
            }
            catch { }
        }

        metaDict["aboFirst"] = dto.BloodGroup.ToString();
        unit.TtiResultsJson = JsonSerializer.Serialize(metaDict);
        unit.Status = UnitStatus.Testing; // Keep in testing state

        await _unitOfWork.BloodUnits.UpdateAsync(unit);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "First ABO entry recorded. Awaiting verification co-sign." });
    }

    [HttpPost("units/{id}/abo/verify")]
    public async Task<IActionResult> VerifyAbo(Guid id, [FromBody] AboRecordDto dto)
    {
        var validationResult = await _aboValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var unit = await _unitOfWork.BloodUnits.GetByIdAsync(id);
        if (unit == null)
        {
            return NotFound("Blood unit not found.");
        }

        if (unit.ABOConfirmed)
        {
            return BadRequest("ABO typing has already been confirmed for this unit.");
        }

        var metaDict = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(unit.TtiResultsJson))
        {
            try
            {
                metaDict = JsonSerializer.Deserialize<Dictionary<string, string>>(unit.TtiResultsJson) ?? new();
            }
            catch { }
        }

        if (!metaDict.TryGetValue("aboFirst", out var firstAboStr))
        {
            return BadRequest("First ABO typing has not been logged yet.");
        }

        metaDict["aboSecond"] = dto.BloodGroup.ToString();
        unit.TtiResultsJson = JsonSerializer.Serialize(metaDict);

        var firstGroup = Enum.Parse<BloodGroup>(firstAboStr);

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var verifierId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        if (firstGroup == dto.BloodGroup)
        {
            // SUCCESS - ABO Match
            unit.ABOConfirmed = true;
            unit.BloodGroup = dto.BloodGroup;
            unit.VerifiedByUserId = verifierId;
            unit.DiscardReason = null; // Clear mismatch indicator if any

            // If TTI has already been successfully screened, transition unit to Available
            if (unit.TTIScreened && !unit.TTIReactive)
            {
                unit.Status = UnitStatus.Available;
                // Update components
                var components = await _unitOfWork.BloodComponents.ListAllAsync();
                var unitComponents = components.Where(c => c.BloodUnitId == unit.Id).ToList();
                foreach (var comp in unitComponents)
                {
                    comp.Status = UnitStatus.Available;
                    await _unitOfWork.BloodComponents.UpdateAsync(comp);
                }
            }
            else
            {
                unit.Status = UnitStatus.Testing;
            }

            await _unitOfWork.BloodUnits.UpdateAsync(unit);
            await _unitOfWork.SaveChangesAsync();

            return Ok(new { success = true, message = "ABO typing confirmed successfully." });
        }
        else
        {
            // FAILURE - ABO Mismatch
            unit.ABOConfirmed = false;
            unit.Status = UnitStatus.Quarantined;
            unit.DiscardReason = "ABO Double-Verification Mismatch"; // Act as flag

            // Quarantine components
            var components = await _unitOfWork.BloodComponents.ListAllAsync();
            var unitComponents = components.Where(c => c.BloodUnitId == unit.Id).ToList();
            foreach (var comp in unitComponents)
            {
                comp.Status = UnitStatus.Quarantined;
                await _unitOfWork.BloodComponents.UpdateAsync(comp);
            }

            await _unitOfWork.BloodUnits.UpdateAsync(unit);
            await _unitOfWork.SaveChangesAsync();

            return BadRequest("ABO double-verification mismatch! Unit has been Quarantined.");
        }
    }

    [HttpPost("units/{id}/tti")]
    public async Task<IActionResult> RecordTti(Guid id, [FromBody] TtiRecordDto dto)
    {
        var unit = await _unitOfWork.BloodUnits.GetByIdAsync(id);
        if (unit == null)
        {
            return NotFound("Blood unit not found.");
        }

        var donor = await _unitOfWork.Donors.GetByIdAsync(unit.DonorId);
        if (donor == null)
        {
            return NotFound("Donor associated with this unit not found.");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var collectedBy = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        var isReactive = dto.HivReactive || dto.HepBReactive || dto.HepCReactive || dto.SyphilisReactive;

        var metaDict = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(unit.TtiResultsJson))
        {
            try
            {
                metaDict = JsonSerializer.Deserialize<Dictionary<string, string>>(unit.TtiResultsJson) ?? new();
            }
            catch { }
        }

        metaDict["hiv"] = dto.HivReactive ? "Reactive" : "Non-Reactive";
        metaDict["hepB"] = dto.HepBReactive ? "Reactive" : "Non-Reactive";
        metaDict["hepC"] = dto.HepCReactive ? "Reactive" : "Non-Reactive";
        metaDict["syphilis"] = dto.SyphilisReactive ? "Reactive" : "Non-Reactive";

        unit.TtiResultsJson = JsonSerializer.Serialize(metaDict);
        unit.TTIScreened = true;

        if (isReactive)
        {
            // TTI Positive - Quarantine and Discard
            unit.TTIReactive = true;
            unit.Status = UnitStatus.Quarantined;
            unit.DiscardReason = "TTI Screening Reactive";

            // Quarantine components
            var components = await _unitOfWork.BloodComponents.ListAllAsync();
            var unitComponents = components.Where(c => c.BloodUnitId == unit.Id).ToList();
            foreach (var comp in unitComponents)
            {
                comp.Status = UnitStatus.Quarantined;
                await _unitOfWork.BloodComponents.UpdateAsync(comp);
            }

            // AUTO PERMANENT DEFERRAL FOR DONOR
            var deferral = new Deferral
            {
                DonorId = unit.DonorId,
                Type = DeferralType.Permanent,
                Reason = $"Auto Permanent Deferral: Screening test reactive for infectious disease on collection unit {unit.UnitId}.",
                StartDateUtc = DateTime.UtcNow,
                CreatedByUserId = collectedBy,
                AuthorizedByUserId = collectedBy
            };

            await _unitOfWork.Deferrals.AddAsync(deferral);

            donor.IsEligible = false;
            donor.NextEligibleDateUtc = null; // Permanent
            donor.Notes = "Permanent medical exclusion due to reactive TTI screening history.";
            await _unitOfWork.Donors.UpdateAsync(donor);

            await _unitOfWork.BloodUnits.UpdateAsync(unit);
            await _unitOfWork.SaveChangesAsync();

            return Ok(new { success = false, message = "TTI screening reactive. Unit quarantined and donor permanently deferred." });
        }
        else
        {
            // TTI Negative - Release to Available if ABO is confirmed
            unit.TTIReactive = false;

            if (unit.ABOConfirmed)
            {
                unit.Status = UnitStatus.Available;
                // Release components
                var components = await _unitOfWork.BloodComponents.ListAllAsync();
                var unitComponents = components.Where(c => c.BloodUnitId == unit.Id).ToList();
                foreach (var comp in unitComponents)
                {
                    comp.Status = UnitStatus.Available;
                    await _unitOfWork.BloodComponents.UpdateAsync(comp);
                }
            }
            else
            {
                unit.Status = UnitStatus.Testing;
            }

            await _unitOfWork.BloodUnits.UpdateAsync(unit);
            await _unitOfWork.SaveChangesAsync();

            return Ok(new { success = true, message = "TTI screening completed. Results non-reactive." });
        }
    }
}
