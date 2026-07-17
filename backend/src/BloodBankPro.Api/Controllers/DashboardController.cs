using BloodBankPro.Api.Controllers;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class DashboardController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;

    public DashboardController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("kpis")]
    public async Task<IActionResult> GetDashboardKpis([FromQuery] Guid? facilityId)
    {
        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var requests = await _unitOfWork.BloodRequests.ListAllAsync();
        var reactions = await _unitOfWork.AdverseReactions.ListAllAsync();
        var donors = await _unitOfWork.Donors.ListAllAsync();
        var sessions = await _unitOfWork.DonationSessions.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();

        // Filters by facility scope if needed
        var localComponents = components.AsEnumerable();
        var localRequests = requests.AsEnumerable();
        var localSessions = sessions.AsEnumerable();

        if (facilityId.HasValue)
        {
            localComponents = localComponents.Where(c => c.FacilityId == facilityId.Value);
            localRequests = localRequests.Where(r => r.FacilityId == facilityId.Value);
            localSessions = localSessions.Where(s => s.FacilityId == facilityId.Value);
        }

        var availableComponents = localComponents.Where(c => c.Status == UnitStatus.Available).ToList();

        // 1. Group Stock counts
        var bloodGroupStock = Enum.GetValues<BloodGroup>()
            .Where(bg => bg != BloodGroup.Unknown)
            .ToDictionary(
                bg => bg.ToString(),
                bg => availableComponents.Count(c => c.BloodUnit.BloodGroup == bg)
            );

        // 2. Monthly Donation Trends (last 6 months)
        var monthlyDonations = Enumerable.Range(0, 6)
            .Select(i => DateTime.UtcNow.AddMonths(-i))
            .Select(d => new
            {
                Month = d.ToString("MMM yyyy"),
                Count = localSessions.Count(s => s.DonationDateUtc.Month == d.Month && s.DonationDateUtc.Year == d.Year && s.SessionStatus == "Collected")
            })
            .Reverse()
            .ToList();

        // 3. Expiring Soon (< 7 days)
        var now = DateTime.UtcNow;
        var expiringSoon = localComponents
            .Where(c => c.Status == UnitStatus.Available && (c.ExpiryDateUtc - now).TotalDays <= 7)
            .Select(c => new
            {
                c.Id,
                UnitId = units.FirstOrDefault(u => u.Id == c.BloodUnitId)?.UnitId ?? "Unknown",
                ComponentType = c.ComponentType.ToString(),
                BloodGroup = c.BloodUnit.BloodGroup.ToString(),
                DaysRemaining = Math.Round((c.ExpiryDateUtc - now).TotalDays, 1),
                c.ExpiryDateUtc
            })
            .OrderBy(c => c.ExpiryDateUtc)
            .Take(5)
            .ToList();

        // 4. Adverse reaction details
        var pendingReactions = reactions
            .Where(r => !r.IsInvestigated)
            .Select(r => new
            {
                r.Id,
                r.TransfusionId,
                Severity = r.Severity.ToString(),
                r.SymptomsDescription,
                r.ReportedAtUtc
            })
            .ToList();

        var kpis = new
        {
            TotalDonors = donors.Count,
            TotalStock = availableComponents.Count,
            ActiveRequests = localRequests.Count(r => r.Status == RequestStatus.Pending || r.Status == RequestStatus.Reserved),
            PendingAdverseReactions = pendingReactions.Count,
            BloodGroupStock = bloodGroupStock,
            MonthlyDonations = monthlyDonations,
            ExpiringSoon = expiringSoon,
            AdverseReactions = pendingReactions
        };

        return Ok(kpis);
    }

    [HttpPost("reactions/{id}/resolve")]
    public async Task<IActionResult> ResolveReaction(Guid id)
    {
        var reaction = await _unitOfWork.AdverseReactions.GetByIdAsync(id);
        if (reaction == null)
        {
            return NotFound("Adverse reaction report not found.");
        }

        reaction.IsInvestigated = true;
        reaction.MedicalDirectorNotes = "Investigation completed. Hemovigilance log closed.";
        await _unitOfWork.AdverseReactions.UpdateAsync(reaction);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Adverse reaction investigated and resolved." });
    }
}
