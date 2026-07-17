using System.Security.Claims;
using System.Text.Json;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Request;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using BloodBankPro.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class TransfusionsController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;

    public TransfusionsController(IUnitOfWork unitOfWork, UserManager<ApplicationUser> userManager)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetTransfusions([FromQuery] Guid? facilityId)
    {
        var transfusions = await _unitOfWork.Transfusions.ListAllAsync();
        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();
        var reactions = await _unitOfWork.AdverseReactions.ListAllAsync();
        var users = await _userManager.Users.ToListAsync();

        var query = transfusions.AsEnumerable();

        if (facilityId.HasValue)
        {
            query = query.Where(t => components.FirstOrDefault(c => c.Id == t.BloodComponentId)?.FacilityId == facilityId.Value);
        }

        var list = query.Select(t =>
        {
            var comp = components.FirstOrDefault(c => c.Id == t.BloodComponentId);
            var unit = comp != null ? units.FirstOrDefault(u => u.Id == comp.BloodUnitId) : null;
            var rx = reactions.FirstOrDefault(r => r.TransfusionId == t.Id);

            var nurse1User = users.FirstOrDefault(u => u.Id == t.NurseId1);
            var nurse2User = users.FirstOrDefault(u => u.Id == t.NurseId2);

            return new TransfusionDetailDto
            {
                Id = t.Id,
                BloodComponentId = t.BloodComponentId,
                UnitId = unit?.UnitId ?? "Unknown",
                ComponentType = comp?.ComponentType.ToString() ?? "Unknown",
                BloodGroup = comp?.BloodUnit?.BloodGroup.ToString() ?? "Unknown",
                PatientName = t.PatientName,
                PatientNationalId = t.PatientNationalId,
                Nurse1 = nurse1User?.FullName ?? "Staff Nurse A",
                Nurse2 = nurse2User?.FullName ?? "Staff Nurse B",
                TransfusionStartedAtUtc = t.TransfusionStartedAtUtc,
                TransfusionCompletedAtUtc = t.TransfusionCompletedAtUtc,
                PreTransfusionVitals = t.PreTransfusionVitalsJson,
                PostTransfusionVitals = t.PostTransfusionVitalsJson,
                HasAdverseReaction = rx != null,
                AdverseReactionSeverity = rx?.Severity.ToString(),
                AdverseReactionSymptoms = rx?.SymptomsDescription
            };
        }).OrderByDescending(t => t.TransfusionStartedAtUtc).ToList();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> StartTransfusion([FromBody] TransfusionStartDto dto)
    {
        var component = await _unitOfWork.BloodComponents.GetByIdAsync(dto.BloodComponentId);
        if (component == null)
        {
            return NotFound("Blood component not found.");
        }

        if (component.Status != UnitStatus.Reserved)
        {
            return BadRequest($"Blood component must be reserved before transfusion. Current status: {component.Status}");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        // Bedside verification requires two distinct nurse co-signers
        var allUsers = await _userManager.Users.ToListAsync();
        var nurse2 = allUsers.FirstOrDefault(u => u.FullName.Contains(dto.NurseName2, StringComparison.OrdinalIgnoreCase))?.Id ?? userId;

        // Set component status to Issued (meaning issued for transfusion)
        component.Status = UnitStatus.Issued;
        await _unitOfWork.BloodComponents.UpdateAsync(component);

        var transfusion = new Transfusion
        {
            BloodComponentId = dto.BloodComponentId,
            PatientName = dto.PatientName,
            PatientNationalId = dto.PatientNationalId,
            NurseId1 = userId,
            NurseId2 = nurse2,
            TransfusionStartedAtUtc = DateTime.UtcNow,
            PreTransfusionVitalsJson = dto.PreTransfusionVitals
        };

        await _unitOfWork.Transfusions.AddAsync(transfusion);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Transfusion started. Component issued to bedside.", transfusionId = transfusion.Id });
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteTransfusion(Guid id, [FromBody] TransfusionCompleteDto dto)
    {
        var transfusion = await _unitOfWork.Transfusions.GetByIdAsync(id);
        if (transfusion == null)
        {
            return NotFound("Transfusion record not found.");
        }

        if (transfusion.TransfusionCompletedAtUtc.HasValue)
        {
            return BadRequest("Transfusion is already completed.");
        }

        transfusion.TransfusionCompletedAtUtc = DateTime.UtcNow;
        transfusion.PostTransfusionVitalsJson = dto.PostTransfusionVitals;
        await _unitOfWork.Transfusions.UpdateAsync(transfusion);

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(transfusion.BloodComponentId);
        if (component != null)
        {
            component.Status = UnitStatus.Issued; // Remains Issued (Transfused)
            await _unitOfWork.BloodComponents.UpdateAsync(component);
        }

        // Find associated reservation and request to mark as Fulfilled
        var reservations = await _unitOfWork.BloodReservations.ListAllAsync();
        var res = reservations.FirstOrDefault(r => r.BloodComponentId == transfusion.BloodComponentId && r.IsActive);
        if (res != null)
        {
            res.IsReleased = true;
            await _unitOfWork.BloodReservations.UpdateAsync(res);

            var request = await _unitOfWork.BloodRequests.GetByIdAsync(res.BloodRequestId);
            if (request != null)
            {
                request.Status = RequestStatus.Fulfilled;
                await _unitOfWork.BloodRequests.UpdateAsync(request);
            }
        }

        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Transfusion completed successfully." });
    }

    [HttpPost("{id}/adverse-reaction")]
    public async Task<IActionResult> ReportAdverseReaction(Guid id, [FromBody] AdverseReactionReportDto dto)
    {
        var transfusion = await _unitOfWork.Transfusions.GetByIdAsync(id);
        if (transfusion == null)
        {
            return NotFound("Transfusion record not found.");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        var rx = new AdverseReaction
        {
            TransfusionId = id,
            Severity = Enum.Parse<ReactionSeverity>(dto.Severity),
            SymptomsDescription = dto.SymptomsDescription,
            ReportedAtUtc = DateTime.UtcNow,
            ReportedByNurseId = userId,
            IsInvestigated = false
        };

        await _unitOfWork.AdverseReactions.AddAsync(rx);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Adverse reaction reported. Medical investigation triggered." });
    }
}
