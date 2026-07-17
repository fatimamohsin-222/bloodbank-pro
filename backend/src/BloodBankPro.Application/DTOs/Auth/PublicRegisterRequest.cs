using System;

namespace BloodBankPro.Application.DTOs.Auth;

public class PublicRegisterRequest
{
    public required string Email { get; set; }
    public required string FullName { get; set; }
    public required string Password { get; set; }
    
    // Self-Service profile info
    public required string NationalId { get; set; }
    public required string ContactNumber { get; set; }
    public DateTime DateOfBirth { get; set; }
    public string BloodGroup { get; set; } = "Unknown";
    public string? Gender { get; set; }
    public string? Address { get; set; }
    
    // Scoped role: "Donor" or "Recipient"
    public required string Role { get; set; }
}
