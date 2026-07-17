namespace BloodBankPro.Application.DTOs.Auth;

public class RegisterRequest
{
    public required string Email { get; set; }
    public required string FullName { get; set; }
    public required string Password { get; set; }
    public required string Role { get; set; }
    public Guid? FacilityId { get; set; }
}
