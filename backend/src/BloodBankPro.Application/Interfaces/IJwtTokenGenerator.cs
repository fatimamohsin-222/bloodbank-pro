namespace BloodBankPro.Application.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(Guid userId, string email, string fullName, string role, Guid? facilityId);
}
