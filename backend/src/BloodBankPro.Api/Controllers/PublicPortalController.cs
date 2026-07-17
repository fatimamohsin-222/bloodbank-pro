using System.Security.Claims;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Request;
using BloodBankPro.Application.DTOs.Transfer;
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
public class PublicPortalController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<ApplicationUser> _userManager;

    public PublicPortalController(IUnitOfWork unitOfWork, UserManager<ApplicationUser> userManager)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
    }

    [HttpGet("donor/profile")]
    public async Task<IActionResult> GetDonorProfile()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return Unauthorized();

        var donors = await _unitOfWork.Donors.ListAllAsync();
        var donor = donors.FirstOrDefault(d => d.Email == email);
        if (donor == null)
        {
            return NotFound("Donor profile not found for the logged-in user.");
        }

        return Ok(new
        {
            donor.Id,
            donor.FullName,
            donor.NationalId,
            donor.DateOfBirth,
            BloodGroup = donor.BloodGroup.ToString(),
            donor.Gender,
            donor.ContactNumber,
            donor.Email,
            donor.Address,
            donor.IsEligible,
            donor.NextEligibleDateUtc
        });
    }

    [HttpGet("donor/sessions")]
    public async Task<IActionResult> GetDonorSessions()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return Unauthorized();

        var donors = await _unitOfWork.Donors.ListAllAsync();
        var donor = donors.FirstOrDefault(d => d.Email == email);
        if (donor == null) return NotFound("Donor profile not found.");

        var sessions = await _unitOfWork.DonationSessions.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();

        var list = sessions
            .Where(s => s.DonorId == donor.Id)
            .Select(s => new
            {
                s.Id,
                s.DonationDateUtc,
                FacilityName = facilities.FirstOrDefault(f => f.Id == s.FacilityId)?.Name ?? "Unknown Facility",
                s.SessionStatus,
                s.VitalsVerified,
                s.HemoglobinLevel,
                s.TemperatureCelsius,
                s.UnitId
            })
            .OrderByDescending(s => s.DonationDateUtc)
            .ToList();

        return Ok(list);
    }

    [HttpPost("donor/sessions")]
    public async Task<IActionResult> ScheduleSession([FromBody] ScheduleSessionDto dto)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return Unauthorized();

        var donors = await _unitOfWork.Donors.ListAllAsync();
        var donor = donors.FirstOrDefault(d => d.Email == email);
        if (donor == null) return NotFound("Donor profile not found.");

        // Cooldown check
        if (!donor.IsEligible || (donor.NextEligibleDateUtc.HasValue && donor.NextEligibleDateUtc.Value > dto.SessionDate.ToUniversalTime()))
        {
            return BadRequest($"You are not eligible to donate on this date. Next eligible date: {donor.NextEligibleDateUtc?.ToShortDateString() ?? "N/A"}");
        }

        var session = new DonationSession
        {
            DonorId = donor.Id,
            FacilityId = dto.FacilityId,
            DonationDateUtc = dto.SessionDate.ToUniversalTime(),
            SessionStatus = "Pending",
            VitalsVerified = false
        };

        await _unitOfWork.DonationSessions.AddAsync(session);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Donation appointment scheduled successfully." });
    }

    [HttpGet("recipient/requests")]
    public async Task<IActionResult> GetRecipientRequests()
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var userId = Guid.Parse(currentUserId);
        var requests = await _unitOfWork.BloodRequests.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();

        var list = requests
            .Where(r => r.RequestingPhysicianId == userId)
            .Select(r => new
            {
                r.Id,
                r.RequestNumber,
                FacilityName = facilities.FirstOrDefault(f => f.Id == r.FacilityId)?.Name ?? "Unknown Facility",
                r.PatientName,
                PatientBloodGroup = r.PatientBloodGroup.ToString(),
                ComponentType = r.ComponentType.ToString(),
                r.UnitsRequested,
                Urgency = r.Urgency.ToString(),
                Status = r.Status.ToString(),
                r.RequiredDateUtc,
                r.ClinicalIndication
            })
            .OrderByDescending(r => r.RequiredDateUtc)
            .ToList();

        return Ok(list);
    }

    [HttpPost("recipient/requests")]
    public async Task<IActionResult> CreateRecipientRequest([FromBody] PublicBloodRequestCreateDto dto)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var userId = Guid.Parse(currentUserId);

        // Generate request number
        var allRequests = await _unitOfWork.BloodRequests.ListAllAsync();
        var nextNum = allRequests.Count + 1;
        var requestNumber = $"REQ-{DateTime.UtcNow.Year}-{nextNum:D6}";

        var bloodRequest = new BloodRequest
        {
            RequestNumber = requestNumber,
            FacilityId = dto.FacilityId,
            PatientName = dto.PatientName,
            PatientNationalId = dto.PatientNationalId,
            PatientDateOfBirth = dto.PatientDateOfBirth.ToUniversalTime(),
            PatientBloodGroup = Enum.Parse<BloodGroup>(dto.PatientBloodGroup),
            ComponentType = Enum.Parse<ComponentType>(dto.ComponentType),
            UnitsRequested = dto.UnitsRequested,
            Urgency = Enum.Parse<RequestUrgency>(dto.Urgency),
            Status = RequestStatus.Pending,
            ClinicalIndication = dto.ClinicalIndication,
            RequestingPhysicianId = userId,
            RequiredDateUtc = dto.RequiredDateUtc.ToUniversalTime()
        };

        await _unitOfWork.BloodRequests.AddAsync(bloodRequest);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Blood request submitted successfully.", requestNumber });
    }
}

public class ScheduleSessionDto
{
    public Guid FacilityId { get; set; }
    public DateTime SessionDate { get; set; }
}

public class PublicBloodRequestCreateDto
{
    public Guid FacilityId { get; set; }
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
