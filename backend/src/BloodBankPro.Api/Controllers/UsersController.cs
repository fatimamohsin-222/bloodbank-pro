using BloodBankPro.Api.Controllers;
using BloodBankPro.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BloodBankPro.Api.Controllers;

[Authorize(Roles = "SuperAdmin,FacilityAdmin,SystemAdmin")]
public class UsersController : BaseApiController
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] string? search)
    {
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var currentUser = await _userManager.FindByIdAsync(currentUserId ?? string.Empty);
        if (currentUser == null)
        {
            return Unauthorized();
        }

        var query = _userManager.Users.AsQueryable();

        // 1. Facility Scoping
        if (User.IsInRole("FacilityAdmin") && currentUser.FacilityId.HasValue)
        {
            query = query.Where(u => u.FacilityId == currentUser.FacilityId.Value);
        }

        // 2. Search
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(searchLower) || u.Email!.ToLower().Contains(searchLower));
        }

        var users = await query.ToListAsync();
        var userDtos = new List<object>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            userDtos.Add(new
            {
                user.Id,
                user.Email,
                user.FullName,
                user.PhoneNumber,
                Roles = roles,
                user.FacilityId,
                user.LockoutEnabled,
                IsActive = !user.LockoutEnd.HasValue || user.LockoutEnd < DateTimeOffset.UtcNow
            });
        }

        return Ok(userDtos);
    }

    [HttpPost("{id}/deactivate")]
    public async Task<IActionResult> DeactivateUser(string id)
    {
        var currentUser = await _userManager.FindByIdAsync(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty
        );
        if (currentUser == null)
        {
            return Unauthorized();
        }

        var targetUser = await _userManager.FindByIdAsync(id);
        if (targetUser == null)
        {
            return NotFound("User not found.");
        }

        // FacilityAdmin can only deactivate users in their facility
        if (User.IsInRole("FacilityAdmin") && currentUser.FacilityId != targetUser.FacilityId)
        {
            return Forbid("FacilityAdmin can only deactivate users for their own facility.");
        }

        // Prevent self-deactivation
        if (currentUser.Id == targetUser.Id)
        {
            return BadRequest("You cannot deactivate your own account.");
        }

        // Set lockout end to far future to deactivate
        var result = await _userManager.SetLockoutEndDateAsync(targetUser, DateTimeOffset.MaxValue);
        if (!result.Succeeded)
        {
            return BadRequest("Failed to deactivate user.");
        }

        return NoContent();
    }

    [HttpPost("{id}/activate")]
    public async Task<IActionResult> ActivateUser(string id)
    {
        var currentUser = await _userManager.FindByIdAsync(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty
        );
        if (currentUser == null)
        {
            return Unauthorized();
        }

        var targetUser = await _userManager.FindByIdAsync(id);
        if (targetUser == null)
        {
            return NotFound("User not found.");
        }

        if (User.IsInRole("FacilityAdmin") && currentUser.FacilityId != targetUser.FacilityId)
        {
            return Forbid("FacilityAdmin can only activate users for their own facility.");
        }

        // Reset lockout end
        var result = await _userManager.SetLockoutEndDateAsync(targetUser, null);
        if (!result.Succeeded)
        {
            return BadRequest("Failed to activate user.");
        }

        return NoContent();
    }
}
