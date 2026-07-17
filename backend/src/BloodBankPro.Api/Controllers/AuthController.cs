using System.Security.Claims;
using BloodBankPro.Api.Controllers;
using BloodBankPro.Application.DTOs.Auth;
using BloodBankPro.Application.Interfaces;
using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Enums;
using BloodBankPro.Domain.Interfaces;
using BloodBankPro.Infrastructure.Identity;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BloodBankPro.Api.Controllers;

public class AuthController : BaseApiController
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<PublicRegisterRequest> _publicRegisterValidator;
    private readonly IUnitOfWork _unitOfWork;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IJwtTokenGenerator jwtTokenGenerator,
        IValidator<LoginRequest> loginValidator,
        IValidator<RegisterRequest> registerValidator,
        IValidator<PublicRegisterRequest> publicRegisterValidator,
        IUnitOfWork unitOfWork)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _jwtTokenGenerator = jwtTokenGenerator;
        _loginValidator = loginValidator;
        _registerValidator = registerValidator;
        _publicRegisterValidator = publicRegisterValidator;
        _unitOfWork = unitOfWork;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var validationResult = await _loginValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            foreach (var error in validationResult.Errors)
            {
                ModelState.AddModelError(error.PropertyName, error.ErrorMessage);
            }
            return ValidationProblem(ModelState);
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized("Invalid credentials.");
        }

        var result = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!result)
        {
            await _userManager.AccessFailedAsync(user);
            return Unauthorized("Invalid credentials.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var primaryRole = roles.FirstOrDefault() ?? "Auditor";

        var token = _jwtTokenGenerator.GenerateToken(user.Id, user.Email!, user.FullName, primaryRole, user.FacilityId);

        return Ok(new LoginResponse
        {
            Token = token,
            Email = user.Email!,
            FullName = user.FullName,
            Roles = roles,
            FacilityId = user.FacilityId
        });
    }

    [HttpPost("register")]
    [Authorize(Roles = "SuperAdmin,FacilityAdmin")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var validationResult = await _registerValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            foreach (var error in validationResult.Errors)
            {
                ModelState.AddModelError(error.PropertyName, error.ErrorMessage);
            }
            return ValidationProblem(ModelState);
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return Conflict("A user with this email address already exists.");
        }

        if (!await _roleManager.RoleExistsAsync(request.Role))
        {
            return BadRequest($"Role '{request.Role}' does not exist.");
        }

        if (User.IsInRole("FacilityAdmin"))
        {
            var currentUserFacility = User.FindFirst("facilityId")?.Value;
            if (currentUserFacility != request.FacilityId.ToString())
            {
                return Forbid("FacilityAdmin can only register users for their own facility.");
            }
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            FacilityId = request.FacilityId
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }
            return ValidationProblem(ModelState);
        }

        await _userManager.AddToRoleAsync(user, request.Role);

        return CreatedAtAction(nameof(GetMe), null);
    }

    [HttpPost("register-public")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterPublic([FromBody] PublicRegisterRequest request)
    {
        var validationResult = await _publicRegisterValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            foreach (var error in validationResult.Errors)
            {
                ModelState.AddModelError(error.PropertyName, error.ErrorMessage);
            }
            return ValidationProblem(ModelState);
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return Conflict("A user with this email address already exists.");
        }

        if (!await _roleManager.RoleExistsAsync(request.Role))
        {
            return BadRequest($"Role '{request.Role}' does not exist.");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }
            return ValidationProblem(ModelState);
        }

        await _userManager.AddToRoleAsync(user, request.Role);

        // If registration is for a Donor, automatically provision their Donor profile
        if (request.Role == "Donor")
        {
            var allDonors = await _unitOfWork.Donors.ListAllAsync();
            var existingDonor = allDonors.FirstOrDefault(d => d.NationalId == request.NationalId || d.Email == request.Email);
            if (existingDonor == null)
            {
                var donor = new Donor
                {
                    FullName = request.FullName,
                    NationalId = request.NationalId,
                    DateOfBirth = request.DateOfBirth.ToUniversalTime(),
                    BloodGroup = Enum.Parse<BloodGroup>(request.BloodGroup),
                    Gender = request.Gender,
                    ContactNumber = request.ContactNumber,
                    Email = request.Email,
                    Address = request.Address,
                    IsEligible = true
                };
                await _unitOfWork.Donors.AddAsync(donor);
                await _unitOfWork.SaveChangesAsync();
            }
        }

        return Ok(new { success = true, message = "Public user registered successfully. You can now log in." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            return NotFound("User not found.");
        }

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FullName,
            Roles = roles,
            user.FacilityId
        });
    }
}
