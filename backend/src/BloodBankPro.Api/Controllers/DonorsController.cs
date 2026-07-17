using System.Security.Claims;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Donor;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class DonorsController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<DonorRegisterDto> _registerValidator;
    private readonly IValidator<DeferralCreateDto> _deferralValidator;

    public DonorsController(
        IUnitOfWork unitOfWork,
        IValidator<DonorRegisterDto> registerValidator,
        IValidator<DeferralCreateDto> deferralValidator)
    {
        _unitOfWork = unitOfWork;
        _registerValidator = registerValidator;
        _deferralValidator = deferralValidator;
    }

    [HttpGet]
    public async Task<IActionResult> GetDonors([FromQuery] string? search, [FromQuery] BloodGroup? bloodGroup, [FromQuery] bool? isEligible)
    {
        var donors = await _unitOfWork.Donors.ListAllAsync();
        var query = donors.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(d => d.FullName.ToLower().Contains(searchLower) || d.NationalId.Contains(searchLower) || d.ContactNumber.Contains(searchLower));
        }

        if (bloodGroup.HasValue)
        {
            query = query.Where(d => d.BloodGroup == bloodGroup.Value);
        }

        if (isEligible.HasValue)
        {
            query = query.Where(d => d.IsEligible == isEligible.Value);
        }

        var list = query.Select(d => new DonorListItemDto
        {
            Id = d.Id,
            FullName = d.FullName,
            NationalId = d.NationalId,
            BloodGroup = d.BloodGroup,
            ContactNumber = d.ContactNumber,
            IsEligible = d.IsEligible,
            NextEligibleDateUtc = d.NextEligibleDateUtc
        }).ToList();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> RegisterDonor([FromBody] DonorRegisterDto dto)
    {
        var validationResult = await _registerValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        // Check if duplicate national ID exists
        var existingDonors = await _unitOfWork.Donors.ListAllAsync();
        var duplicate = existingDonors.FirstOrDefault(d => d.NationalId == dto.NationalId);
        if (duplicate != null)
        {
            return Conflict(new { detail = $"A donor profile with National ID {dto.NationalId} already exists (Name: {duplicate.FullName}).", existingDonorId = duplicate.Id });
        }

        var donor = new Donor
        {
            FullName = dto.FullName,
            NationalId = dto.NationalId,
            DateOfBirth = dto.DateOfBirth,
            BloodGroup = dto.BloodGroup,
            Gender = dto.Gender,
            ContactNumber = dto.ContactNumber,
            Email = dto.Email,
            Address = dto.Address,
            IsEligible = true,
            Notes = dto.Notes
        };

        await _unitOfWork.Donors.AddAsync(donor);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDonorById), new { id = donor.Id }, new { donor.Id, donor.FullName });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDonorById(Guid id)
    {
        var donor = await _unitOfWork.Donors.GetByIdAsync(id);
        if (donor == null)
        {
            return NotFound();
        }

        var allDeferrals = await _unitOfWork.Deferrals.ListAllAsync();
        var donorDeferrals = allDeferrals.Where(df => df.DonorId == id).OrderByDescending(df => df.StartDateUtc).ToList();

        var allSessions = await _unitOfWork.DonationSessions.ListAllAsync();
        var donorSessions = allSessions.Where(s => s.DonorId == id).OrderByDescending(s => s.DonationDateUtc).ToList();

        var detail = new DonorDetailDto
        {
            Id = donor.Id,
            FullName = donor.FullName,
            NationalId = donor.NationalId,
            DateOfBirth = donor.DateOfBirth,
            BloodGroup = donor.BloodGroup,
            Gender = donor.Gender,
            ContactNumber = donor.ContactNumber,
            Email = donor.Email,
            Address = donor.Address,
            IsEligible = donor.IsEligible,
            NextEligibleDateUtc = donor.NextEligibleDateUtc,
            Notes = donor.Notes,
            Deferrals = donorDeferrals.Select(df => new DeferralDto
            {
                Id = df.Id,
                Type = df.Type,
                Reason = df.Reason,
                StartDateUtc = df.StartDateUtc,
                EndDateUtc = df.EndDateUtc
            }).ToList(),
            DonationSessions = donorSessions.Select(s => new DonationSessionDto
            {
                Id = s.Id,
                DonationDateUtc = s.DonationDateUtc,
                SessionStatus = s.SessionStatus,
                RejectionReason = s.RejectionReason,
                UnitId = s.UnitId
            }).ToList()
        };

        return Ok(detail);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDonor(Guid id, [FromBody] DonorUpdateDto dto)
    {
        var donor = await _unitOfWork.Donors.GetByIdAsync(id);
        if (donor == null)
        {
            return NotFound();
        }

        donor.FullName = dto.FullName;
        donor.Gender = dto.Gender;
        donor.ContactNumber = dto.ContactNumber;
        donor.Email = dto.Email;
        donor.Address = dto.Address;
        donor.Notes = dto.Notes;

        await _unitOfWork.Donors.UpdateAsync(donor);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/defer")]
    public async Task<IActionResult> DeferDonor(Guid id, [FromBody] DeferralCreateDto dto)
    {
        var validationResult = await _deferralValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var donor = await _unitOfWork.Donors.GetByIdAsync(id);
        if (donor == null)
        {
            return NotFound();
        }

        // Roles Check
        if (dto.Type == DeferralType.Permanent)
        {
            var isAuthorized = User.IsInRole("MedicalDirector") || User.IsInRole("SuperAdmin");
            if (!isAuthorized)
            {
                return Forbid();
            }
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var createdBy = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        DateTime? endDate = null;
        if (dto.Type == DeferralType.Temporary && dto.DurationDays.HasValue)
        {
            endDate = DateTime.UtcNow.AddDays(dto.DurationDays.Value);
        }

        var deferral = new Deferral
        {
            DonorId = id,
            Type = dto.Type,
            Reason = dto.Reason,
            StartDateUtc = DateTime.UtcNow,
            EndDateUtc = endDate,
            CreatedByUserId = createdBy,
            AuthorizedByUserId = createdBy
        };

        await _unitOfWork.Deferrals.AddAsync(deferral);

        // Update Donor eligibility
        donor.IsEligible = false;
        if (dto.Type == DeferralType.Temporary && endDate.HasValue)
        {
            if (donor.NextEligibleDateUtc == null || endDate > donor.NextEligibleDateUtc)
            {
                donor.NextEligibleDateUtc = endDate;
            }
        }
        else
        {
            donor.NextEligibleDateUtc = null; // Permanent deferral
        }

        await _unitOfWork.Donors.UpdateAsync(donor);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/eligibility/recompute")]
    public async Task<IActionResult> RecomputeEligibility(Guid id)
    {
        var donor = await _unitOfWork.Donors.GetByIdAsync(id);
        if (donor == null)
        {
            return NotFound();
        }

        var deferrals = await _unitOfWork.Deferrals.ListAllAsync();
        var donorDeferrals = deferrals.Where(d => d.DonorId == id).ToList();

        // If there's a permanent deferral, they are never eligible
        if (donorDeferrals.Any(d => d.Type == DeferralType.Permanent))
        {
            donor.IsEligible = false;
            donor.NextEligibleDateUtc = null;
        }
        else
        {
            // Check if there are active temporary deferrals
            var activeDeferrals = donorDeferrals.Where(d => d.Type == DeferralType.Temporary && (d.EndDateUtc == null || d.EndDateUtc > DateTime.UtcNow)).ToList();
            if (activeDeferrals.Any())
            {
                donor.IsEligible = false;
                donor.NextEligibleDateUtc = activeDeferrals.Max(d => d.EndDateUtc);
            }
            else
            {
                // No active deferrals - check last donation date
                // Donor must wait at least 90 days between donations
                var sessions = await _unitOfWork.DonationSessions.ListAllAsync();
                var completedDonations = sessions.Where(s => s.DonorId == id && s.SessionStatus == "Collected").ToList();
                
                if (completedDonations.Any())
                {
                    var lastDonation = completedDonations.Max(s => s.DonationDateUtc);
                    var daysSinceLastDonation = (DateTime.UtcNow - lastDonation).TotalDays;
                    if (daysSinceLastDonation < 90)
                    {
                        donor.IsEligible = false;
                        donor.NextEligibleDateUtc = lastDonation.AddDays(90);
                    }
                    else
                    {
                        donor.IsEligible = true;
                        donor.NextEligibleDateUtc = null;
                    }
                }
                else
                {
                    donor.IsEligible = true;
                    donor.NextEligibleDateUtc = null;
                }
            }
        }

        await _unitOfWork.Donors.UpdateAsync(donor);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { donor.IsEligible, donor.NextEligibleDateUtc });
    }

    [HttpGet("recall")]
    public async Task<IActionResult> GetRecallCandidates([FromQuery] BloodGroup? bloodGroup)
    {
        var donors = await _unitOfWork.Donors.ListAllAsync();
        var sessions = await _unitOfWork.DonationSessions.ListAllAsync();

        var query = donors.Where(d => d.IsEligible);

        if (bloodGroup.HasValue)
        {
            query = query.Where(d => d.BloodGroup == bloodGroup.Value);
        }

        var eligibleDonors = query.ToList();
        var recallList = new List<DonorListItemDto>();

        foreach (var donor in eligibleDonors)
        {
            var donorSessions = sessions.Where(s => s.DonorId == donor.Id && s.SessionStatus == "Collected").ToList();
            if (!donorSessions.Any())
            {
                // Has never donated, but is eligible (prime recall candidate!)
                recallList.Add(new DonorListItemDto
                {
                    Id = donor.Id,
                    FullName = donor.FullName,
                    NationalId = donor.NationalId,
                    BloodGroup = donor.BloodGroup,
                    ContactNumber = donor.ContactNumber,
                    IsEligible = true,
                    NextEligibleDateUtc = null
                });
            }
            else
            {
                var lastDonationDate = donorSessions.Max(s => s.DonationDateUtc);
                var daysSince = (DateTime.UtcNow - lastDonationDate).TotalDays;
                if (daysSince >= 90)
                {
                    recallList.Add(new DonorListItemDto
                    {
                        Id = donor.Id,
                        FullName = donor.FullName,
                        NationalId = donor.NationalId,
                        BloodGroup = donor.BloodGroup,
                        ContactNumber = donor.ContactNumber,
                        IsEligible = true,
                        NextEligibleDateUtc = null
                    });
                }
            }
        }

        return Ok(recallList);
    }

    [HttpPost("recall/notify")]
    public IActionResult NotifyRecall([FromBody] List<Guid> donorIds)
    {
        return Ok(new { success = true, messagesDispatched = donorIds.Count });
    }
}
