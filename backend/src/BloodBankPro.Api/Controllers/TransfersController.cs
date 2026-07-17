using System.Security.Claims;
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
public class TransfersController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<TransferOrderCreateDto> _createValidator;

    public TransfersController(IUnitOfWork unitOfWork, IValidator<TransferOrderCreateDto> createValidator)
    {
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
    }

    [HttpGet("orders/inbound")]
    public async Task<IActionResult> GetInboundOrders([FromQuery] Guid facilityId)
    {
        var orders = await _unitOfWork.TransferOrders.ListAllAsync();
        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();

        var list = orders
            .Where(o => o.DestinationFacilityId == facilityId)
            .Select(o =>
            {
                var comp = components.FirstOrDefault(c => c.Id == o.BloodComponentId);
                var unit = comp != null ? units.FirstOrDefault(u => u.Id == comp.BloodUnitId) : null;
                return new TransferOrderDetailDto
                {
                    Id = o.Id,
                    ShipmentNumber = o.ShipmentNumber,
                    BloodComponentId = o.BloodComponentId,
                    UnitId = unit?.UnitId ?? "Unknown",
                    ComponentType = comp?.ComponentType.ToString() ?? "Unknown",
                    BloodGroup = comp?.BloodUnit?.BloodGroup.ToString() ?? "Unknown",
                    VolumeMl = comp?.VolumeMl ?? 0,
                    ExpiryDateUtc = comp?.ExpiryDateUtc ?? DateTime.MinValue,
                    SourceFacilityId = o.SourceFacilityId,
                    SourceFacilityName = facilities.FirstOrDefault(f => f.Id == o.SourceFacilityId)?.Name ?? "Unknown",
                    DestinationFacilityId = o.DestinationFacilityId,
                    DestinationFacilityName = facilities.FirstOrDefault(f => f.Id == o.DestinationFacilityId)?.Name ?? "Unknown",
                    Status = o.Status.ToString(),
                    SentDateUtc = o.SentDateUtc,
                    ReceivedDateUtc = o.ReceivedDateUtc,
                    RejectionReason = o.RejectionReason,
                    Notes = o.Notes
                };
            })
            .OrderByDescending(o => o.SentDateUtc)
            .ToList();

        return Ok(list);
    }

    [HttpGet("orders/outbound")]
    public async Task<IActionResult> GetOutboundOrders([FromQuery] Guid facilityId)
    {
        var orders = await _unitOfWork.TransferOrders.ListAllAsync();
        var components = await _unitOfWork.BloodComponents.ListAllAsync();
        var units = await _unitOfWork.BloodUnits.ListAllAsync();
        var facilities = await _unitOfWork.Facilities.ListAllAsync();

        var list = orders
            .Where(o => o.SourceFacilityId == facilityId)
            .Select(o =>
            {
                var comp = components.FirstOrDefault(c => c.Id == o.BloodComponentId);
                var unit = comp != null ? units.FirstOrDefault(u => u.Id == comp.BloodUnitId) : null;
                return new TransferOrderDetailDto
                {
                    Id = o.Id,
                    ShipmentNumber = o.ShipmentNumber,
                    BloodComponentId = o.BloodComponentId,
                    UnitId = unit?.UnitId ?? "Unknown",
                    ComponentType = comp?.ComponentType.ToString() ?? "Unknown",
                    BloodGroup = comp?.BloodUnit?.BloodGroup.ToString() ?? "Unknown",
                    VolumeMl = comp?.VolumeMl ?? 0,
                    ExpiryDateUtc = comp?.ExpiryDateUtc ?? DateTime.MinValue,
                    SourceFacilityId = o.SourceFacilityId,
                    SourceFacilityName = facilities.FirstOrDefault(f => f.Id == o.SourceFacilityId)?.Name ?? "Unknown",
                    DestinationFacilityId = o.DestinationFacilityId,
                    DestinationFacilityName = facilities.FirstOrDefault(f => f.Id == o.DestinationFacilityId)?.Name ?? "Unknown",
                    Status = o.Status.ToString(),
                    SentDateUtc = o.SentDateUtc,
                    ReceivedDateUtc = o.ReceivedDateUtc,
                    RejectionReason = o.RejectionReason,
                    Notes = o.Notes
                };
            })
            .OrderByDescending(o => o.SentDateUtc)
            .ToList();

        return Ok(list);
    }

    [HttpPost("orders")]
    public async Task<IActionResult> CreateOrder([FromBody] TransferOrderCreateDto dto)
    {
        var validationResult = await _createValidator.ValidateAsync(dto);
        if (!validationResult.IsValid)
        {
            return BadRequest(validationResult.ToDictionary());
        }

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(dto.BloodComponentId);
        if (component == null)
        {
            return NotFound("Blood component not found.");
        }

        if (component.Status != UnitStatus.Available)
        {
            return BadRequest($"Selected component is not available for transfer. Current status: {component.Status}");
        }

        if (component.FacilityId == dto.DestinationFacilityId)
        {
            return BadRequest("Destination facility cannot be the same as the current source facility.");
        }

        var destinationFacility = await _unitOfWork.Facilities.GetByIdAsync(dto.DestinationFacilityId);
        if (destinationFacility == null)
        {
            return NotFound("Destination facility not found.");
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = currentUserId != null ? Guid.Parse(currentUserId) : Guid.Empty;

        // Generate Shipment Number
        var allOrders = await _unitOfWork.TransferOrders.ListAllAsync();
        var nextNum = allOrders.Count + 1;
        var shipmentNumber = $"TRF-{DateTime.UtcNow.Year}-{nextNum:D6}";

        // Reserve the component in local inventory
        component.Status = UnitStatus.Reserved;
        await _unitOfWork.BloodComponents.UpdateAsync(component);

        var order = new TransferOrder
        {
            ShipmentNumber = shipmentNumber,
            BloodComponentId = dto.BloodComponentId,
            SourceFacilityId = component.FacilityId,
            DestinationFacilityId = dto.DestinationFacilityId,
            Status = TransferStatus.Requested,
            CreatedByUserId = userId,
            SentDateUtc = DateTime.UtcNow,
            Notes = dto.Notes
        };

        await _unitOfWork.TransferOrders.AddAsync(order);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Transfer order created. Component reserved.", shipmentNumber, orderId = order.Id });
    }

    [HttpPost("orders/{id}/dispatch")]
    public async Task<IActionResult> DispatchOrder(Guid id)
    {
        var order = await _unitOfWork.TransferOrders.GetByIdAsync(id);
        if (order == null)
        {
            return NotFound("Transfer order not found.");
        }

        if (order.Status != TransferStatus.Requested)
        {
            return BadRequest($"Order cannot be dispatched. Current status: {order.Status}");
        }

        order.Status = TransferStatus.Dispatched;
        order.SentDateUtc = DateTime.UtcNow;

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(order.BloodComponentId);
        if (component != null)
        {
            component.Status = UnitStatus.Issued; // Custom transit state representation
            await _unitOfWork.BloodComponents.UpdateAsync(component);
        }

        await _unitOfWork.TransferOrders.UpdateAsync(order);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Shipment dispatched successfully." });
    }

    [HttpPost("orders/{id}/receive")]
    public async Task<IActionResult> ReceiveOrder(Guid id)
    {
        var order = await _unitOfWork.TransferOrders.GetByIdAsync(id);
        if (order == null)
        {
            return NotFound("Transfer order not found.");
        }

        if (order.Status != TransferStatus.Dispatched && order.Status != TransferStatus.Requested)
        {
            return BadRequest($"Order cannot be received. Current status: {order.Status}");
        }

        order.Status = TransferStatus.Received;
        order.ReceivedDateUtc = DateTime.UtcNow;

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(order.BloodComponentId);
        if (component != null)
        {
            // Re-allocate component to destination facility and release back to available stock
            component.FacilityId = order.DestinationFacilityId;
            component.Status = UnitStatus.Available;
            await _unitOfWork.BloodComponents.UpdateAsync(component);
        }

        await _unitOfWork.TransferOrders.UpdateAsync(order);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Shipment received and added to local inventory." });
    }

    [HttpPost("orders/{id}/reject")]
    public async Task<IActionResult> RejectOrder(Guid id, [FromBody] DiscardComponentDto dto)
    {
        var order = await _unitOfWork.TransferOrders.GetByIdAsync(id);
        if (order == null)
        {
            return NotFound("Transfer order not found.");
        }

        if (order.Status != TransferStatus.Dispatched && order.Status != TransferStatus.Requested)
        {
            return BadRequest($"Order cannot be rejected. Current status: {order.Status}");
        }

        order.Status = TransferStatus.Rejected;
        order.RejectionReason = dto.DiscardReason;
        order.ReceivedDateUtc = DateTime.UtcNow;

        var component = await _unitOfWork.BloodComponents.GetByIdAsync(order.BloodComponentId);
        if (component != null)
        {
            // Return component to source facility stock as available
            component.Status = UnitStatus.Available;
            await _unitOfWork.BloodComponents.UpdateAsync(component);
        }

        await _unitOfWork.TransferOrders.UpdateAsync(order);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { success = true, message = "Shipment rejected. Component returned to source facility." });
    }
}
