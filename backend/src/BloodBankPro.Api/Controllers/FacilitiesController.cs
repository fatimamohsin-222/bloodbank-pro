using BloodBankPro.Api.Controllers;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

[Authorize]
public class FacilitiesController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;

    public FacilitiesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetFacilities()
    {
        var facilities = await _unitOfWork.Facilities.ListAllAsync();
        var dtos = facilities.Select(f => new
        {
            f.Id,
            f.Name,
            f.Address,
            f.TimeZoneId
        });
        
        return Ok(dtos);
    }
}
