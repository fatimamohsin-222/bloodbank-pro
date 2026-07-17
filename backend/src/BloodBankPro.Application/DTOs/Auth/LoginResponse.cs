namespace BloodBankPro.Application.DTOs.Auth;

public class LoginResponse
{
    public required string Token { get; set; }
    public required string Email { get; set; }
    public required string FullName { get; set; }
    public required IList<string> Roles { get; set; }
    public Guid? FacilityId { get; set; }
}
