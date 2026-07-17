using System.Security.Claims;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Request;
using BloodBankPro.Application.DTOs.Transfer;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using BloodBankPro.Infrastructure.Identity;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class RequestsController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<BloodRequestCreateDto> _createValidator;
    private readonly UserManager<ApplicationUser> _userManager;

    public RequestsController(IUnitOfWork unitOfWork, IValidator<BloodRequestCreateDto> createValidator, UserManager<ApplicationUser> userManager)
    {
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetRequests([FromQuery] Guid? facilityId)
    {
        var requests = await _unitOfWork.BloodRequests.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();
        var reservations = await _unitOfWork.BloodReservations.ListAllAsync();
        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();
        var crossmatches = await _unitOfWork.CrossMatches.ListAllAsync();
        var users = await _userManager.Users.ToListAsync();

        var query = requests.AsEnumerable();
        if (facilityId.HasValue)
        {
            query = query.Where(r => r.FacilityId == facilityId.Value);
        }

        var list = query.Select(r =>
        {
            var reqReservations = reservations
                .Where(res => res.BloodRequestId == r.Id && res.IsActive)
                .Select(res =>
                {
                    var comp = components.FirstOrDefault(c => c.Id == res.BloodComponentId);
                    var unit = comp != null ? units.FirstOrDefault(u => u.Id == comp.BloodUnitId) : null;
                    var cm = crossmatches.FirstOrDefault(x => x.BloodReservationId == res.Id);
                    return new ReservationDetailDto
                    {
                        Id = res.Id,
                        BloodComponentId = res.BloodComponentId,
                        UnitId = unit?.UnitId ?? "Unknown",
                        ComponentType = comp?.ComponentType.ToString() ?? "Unknown",
                        BloodGroup = comp?.BloodUnit?.BloodGroup.ToString() ?? "Unknown",
                        VolumeMl = comp?.VolumeMl ?? 0,
                        ReservedAtUtc = res.ReservedAtUtc,
                        HoldUntilUtc = res.HoldUntilUtc,
                        IsActive = res.IsActive,
                        IsReleased = res.IsReleased,
                        HasCrossMatch = cm != null,
                        CrossMatchCompatible = cm?.Compatible,
                        CrossMatchMethod = cm?.Method,
                        CrossMatchNotes = cm?.Notes
                    };
                }).ToList();

            var physician = users.FirstOrDefault(u => u.Id == r.RequestingPhysicianId);

            return new BloodRequestDetailDto
            {
                Id = r.Id,
                RequestNumber = r.RequestNumber,
                FacilityId = r.FacilityId,
                FacilityName = facilities.FirstOrDefault(f => f.Id == r.FacilityId)?.Name ?? "Unknown",
                PatientName = r.PatientName,
                PatientNationalId = r.PatientNationalId,
                PatientDateOfBirth = r.PatientDateOfBirth,
                PatientBloodGroup = r.PatientBloodGroup.ToString(),
                ComponentType = r.ComponentType.ToString(),
                UnitsRequested = r.UnitsRequested,
                Urgency = r.Urgency.ToString(),
                Status = r.Status.ToString(),
                ClinicalIndication = r.ClinicalIndication,
                RequestingPhysicianId = r.RequestingPhysicianId,
                RequestingPhysicianName = physician?.FullName ?? "Unknown",
                RequiredDateUtc = r.RequiredDateUtc,
                Reservations = reqReservations
            };
        }).OrderByDescending(r => r.RequiredDateUtc).ToList();

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRequest([FromBody] BloodRequestCreateDto dto)
    {
        var validationResult = await _createValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var facilityHeader = Request.Headers["X-Facility-Id"].ToString();
        var facilityId = Guid.Empty;
        if (!string.IsNullOrEmpty(facilityHeader))
        {
            facilityId = Guid.Parse(facilityHeader);
        }
        else
        {
            var userFacilityClaim = User.FindFirst("FacilityId")?.Value;
            if (!string.IsNullOrEmpty(userFacilityClaim))
            {
                facilityId = Guid.Parse(userFacilityClaim);
            }
            else
            {
                var facilities = await _unitOfWork.Facilities.ListAllAsync();
                if (facilities.Any())
                {
                    facilityId = facilities.First().Id;
                }
            }
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        // Generate Request Number
        var allRequests = await _unitOfWork.BloodRequests.ListAllAsync();
        var nextNum = allRequests.Count + 1;
        var requestNumber = $"REQ-{DateTime.UtcNow.Year}-{nextNum:D6}";

        var bloodRequest = new BloodRequest
        {
            RequestNumber = requestNumber,
            FacilityId = facilityId,
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

        return Ok(new { success = true, message = "Blood request successfully created.", requestNumber, requestId = bloodRequest.Id });
    }

    [HttpGet("{id}/compatible-components")]
    public async Task<IActionResult> GetCompatibleComponents(Guid id)
    {
        var request = await _unitOfWork.BloodRequests.GetByIdAsync(id);
        if (request == null)
        {
            return NotFound("Blood request not found.");
        }

        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();

        // Filter: same facility, component type matches, status is Available
        var candidates = components.Where(c => 
            c.FacilityId == request.FacilityId && 
            c.ComponentType == request.ComponentType && 
            c.Status == UnitStatus.Available).ToList();

        var list = new List<ComponentInventoryDto>();
        foreach (var c in candidates)
        {
            var unit = units.FirstOrDefault(u => u.Id == c.BloodUnitId);
            if (unit == null) continue;

            // Run ABO check
            if (IsCompatible(unit.BloodGroup, request.PatientBloodGroup))
            {
                list.Add(new ComponentInventoryDto
                {
                    Id = c.Id,
                    UnitId = unit.UnitId,
                    ComponentType = c.ComponentType.ToString(),
                    BloodGroup = unit.BloodGroup.ToString(),
                    VolumeMl = c.VolumeMl,
                    ExpiryDateUtc = c.ExpiryDateUtc,
                    Status = c.Status.ToString(),
                    FacilityId = c.FacilityId,
                    FacilityName = "Local Scope",
                    DaysRemaining = Math.Round((c.ExpiryDateUtc - DateTime.UtcNow).TotalDays, 1)
                });
            }
        }

        return Ok(list);
    }

    [HttpPost("{id}/reserve")]
    public async Task<IActionResult> ReserveComponent(Guid id, [FromBody] ReserveComponentDto dto)
    {
        var request = await _unitOfWork.BloodRequests.GetByIdAsync(id);
        if (request == null)
        {
            return NotFound("Blood request not found.");
        }

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(dto.BloodComponentId);
        if (component == null)
        {
            return NotFound("Blood component not found.");
        }

        if (component.Status != UnitStatus.Available)
        {
            return BadRequest($"Selected component is not available. Status: {component.Status}");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        // Set component status to Reserved
        component.Status = UnitStatus.Reserved;
        await _unitOfWork.BloodComponents.UpdateAsync(component);

        // Create Blood Reservation (Hold for 24 hours)
        var reservation = new BloodReservation
        {
            BloodRequestId = request.Id,
            BloodComponentId = component.Id,
            ReservedAtUtc = DateTime.UtcNow,
            HoldUntilUtc = DateTime.UtcNow.AddHours(24),
            IsActive = true,
            IsReleased = false,
            ReservedByUserId = userId
        };

        await _unitOfWork.BloodReservations.AddAsync(reservation);

        // Update Request status to Reserved
        request.Status = RequestStatus.Reserved;
        await _unitOfWork.BloodRequests.UpdateAsync(request);

        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Component reserved successfully. Awaiting crossmatch verification." });
    }

    [HttpPost("reservations/{reservationId}/crossmatch")]
    public async Task<IActionResult> RecordCrossMatch(Guid reservationId, [FromBody] CrossMatchRecordDto dto)
    {
        var reservation = await _unitOfWork.BloodReservations.GetByIdAsync(reservationId);
        if (reservation == null || !reservation.IsActive)
        {
            return NotFound("Active reservation not found.");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        var crossmatch = new CrossMatch
        {
            BloodReservationId = reservationId,
            TechnologistId = userId,
            Compatible = dto.Compatible,
            Method = dto.Method,
            Notes = dto.Notes,
            CrossMatchedAtUtc = DateTime.UtcNow
        };

        await _unitOfWork.CrossMatches.AddAsync(crossmatch);

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(reservation.BloodComponentId);

        if (dto.Compatible)
        {
            // Released/Cleared for Transfusion
            reservation.IsReleased = true;
            await _unitOfWork.BloodReservations.UpdateAsync(reservation);

            if (component != null)
            {
                component.Status = UnitStatus.Reserved; // Keep reserved for patient
                await _unitOfWork.BloodComponents.UpdateAsync(component);
            }

            // Update request status to Reserved (meaning fully set for issue)
            var request = await _unitOfWork.BloodRequests.GetByIdAsync(reservation.BloodRequestId);
            if (request != null)
            {
                request.Status = RequestStatus.Reserved;
                await _unitOfWork.BloodRequests.UpdateAsync(request);
            }
        }
        else
        {
            // Incompatible - Release component reservation
            reservation.IsActive = false;
            await _unitOfWork.BloodReservations.UpdateAsync(reservation);

            if (component != null)
            {
                component.Status = UnitStatus.Available; // Return to stock
                await _unitOfWork.BloodComponents.UpdateAsync(component);
            }

            // Set request back to pending if no other reservations exist
            var request = await _unitOfWork.BloodRequests.GetByIdAsync(reservation.BloodRequestId);
            if (request != null)
            {
                var otherRes = await _unitOfWork.BloodReservations.ListAllAsync();
                var hasActive = otherRes.Any(r => r.BloodRequestId == request.Id && r.IsActive && r.Id != reservation.Id);
                if (!hasActive)
                {
                    request.Status = RequestStatus.Pending;
                    await _unitOfWork.BloodRequests.UpdateAsync(request);
                }
            }
        }

        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = dto.Compatible, message = dto.Compatible ? "Crossmatch cleared. Unit ready for issue." : "Incompatible crossmatch logged. Unit returned to inventory." });
    }

    private static bool IsCompatible(BloodGroup donor, BloodGroup recipient)
    {
        if (donor == BloodGroup.Unknown || recipient == BloodGroup.Unknown) return false;
        if (donor == recipient) return true;
        if (donor == BloodGroup.ONegative) return true; // O- is universal donor
        
        if (recipient == BloodGroup.ABPositive) return true; // AB+ is universal recipient
        
        if (recipient == BloodGroup.ABNegative)
        {
            return donor == BloodGroup.ANegative || donor == BloodGroup.BNegative || donor == BloodGroup.ONegative;
        }
        
        if (recipient == BloodGroup.APositive)
        {
            return donor == BloodGroup.APositive || donor == BloodGroup.ANegative || donor == BloodGroup.OPositive || donor == BloodGroup.ONegative;
        }
        
        if (recipient == BloodGroup.ANegative)
        {
            return donor == BloodGroup.ANegative || donor == BloodGroup.ONegative;
        }
        
        if (recipient == BloodGroup.BPositive)
        {
            return donor == BloodGroup.BPositive || donor == BloodGroup.BNegative || donor == BloodGroup.OPositive || donor == BloodGroup.ONegative;
        }
        
        if (recipient == BloodGroup.BNegative)
        {
            return donor == BloodGroup.BNegative || donor == BloodGroup.ONegative;
        }
        
        if (recipient == BloodGroup.OPositive)
        {
            return donor == BloodGroup.OPositive || donor == BloodGroup.ONegative;
        }
        
        return false;
    }
}
