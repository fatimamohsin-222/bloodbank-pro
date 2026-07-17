using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
}
