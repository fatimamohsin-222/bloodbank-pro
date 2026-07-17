using System.Security.Claims;
using System.Text.Json;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Transfer;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class InventoryController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<DiscardComponentDto> _discardValidator;

    public InventoryController(IUnitOfWork unitOfWork, IValidator<DiscardComponentDto> discardValidator)
    {
        _unitOfWork = unitOfWork;
        _discardValidator = discardValidator;
    }

    [HttpGet("components")]
    public async Task<IActionResult> GetComponents([FromQuery] Guid? facilityId, [FromQuery] string? status)
    {
        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();

        var now = DateTime.UtcNow;
        var updatedAny = false;

        // Auto-expiration checker (self-healing shelf life)
        foreach (var c in components)
        {
            if (c.ExpiryDateUtc <= now && c.Status != UnitStatus.Discarded && c.Status != UnitStatus.Expired)
            {
                c.Status = UnitStatus.Expired;
                await _unitOfWork.BloodComponents.UpdateAsync(c);
                updatedAny = true;
            }
        }

        if (updatedAny)
        {
            await _unitOfWork.SaveChangesAsync();
        }

        // Apply filters
        var query = components.AsEnumerable();

        if (facilityId.HasValue)
        {
            query = query.Where(c => c.FacilityId == facilityId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<UnitStatus>(status, true, out var filterStatus))
            {
                query = query.Where(c => c.Status == filterStatus);
            }
        }
        else
        {
            // By default, show available, expired, and quarantined components in active inventory
            query = query.Where(c => c.Status == UnitStatus.Available || c.Status == UnitStatus.Expired || c.Status == UnitStatus.Quarantined || c.Status == UnitStatus.Testing);
        }

        var list = query.Select(c =>
        {
            var parentUnit = units.FirstOrDefault(u => u.Id == c.BloodUnitId);
            return new ComponentInventoryDto
            {
                Id = c.Id,
                UnitId = parentUnit?.UnitId ?? "Unknown",
                ComponentType = c.ComponentType.ToString(),
                BloodGroup = c.BloodUnit.BloodGroup.ToString(),
                VolumeMl = c.VolumeMl,
                ExpiryDateUtc = c.ExpiryDateUtc,
                Status = c.Status.ToString(),
                FacilityId = c.FacilityId,
                FacilityName = facilities.FirstOrDefault(f => f.Id == c.FacilityId)?.Name ?? "Unknown",
                DaysRemaining = Math.Round((c.ExpiryDateUtc - now).TotalDays, 2)
            };
        }).OrderBy(c => c.ExpiryDateUtc).ToList();

        return Ok(list);
    }

    [HttpPost("components/{id}/discard")]
    public async Task<IActionResult> DiscardComponent(Guid id, [FromBody] DiscardComponentDto dto)
    {
        var validationResult = await _discardValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(id);
        if (component == null)
        {
            return NotFound("Blood component not found.");
        }

        if (component.Status == UnitStatus.Discarded)
        {
            return BadRequest("Blood component is already discarded.");
        }

        var oldStatus = component.Status;
        component.Status = UnitStatus.Discarded;
        await _unitOfWork.BloodComponents.UpdateAsync(component);

        // Audit Trail entry logging
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "system@bloodbankpro.com";

        var auditLog = new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Action = $"Component Discarded: {dto.DiscardReason}",
            TableName = "BloodComponents",
            RecordId = component.Id.ToString(),
            OldValuesJson = JsonSerializer.Serialize(new { status = oldStatus.ToString() }),
            NewValuesJson = JsonSerializer.Serialize(new { status = "Discarded", reason = dto.DiscardReason }),
            TimestampUtc = DateTime.UtcNow,
            FacilityId = component.FacilityId
        };

        await _unitOfWork.AuditLogs.AddAsync(auditLog);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Blood component successfully discarded.", id = component.Id });
    }
}
