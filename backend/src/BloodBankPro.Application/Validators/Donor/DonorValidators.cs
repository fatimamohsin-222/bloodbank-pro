using BloodBankPro.Application.DTOs.Donor;
using BloodBankPro.Domain.Enums;
using FluentValidation;

namespace BloodBankPro.Application.Validators.Donor;

public class DonorRegisterValidator : AbstractValidator<DonorRegisterDto>
{
    public DonorRegisterValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full Name is required.")
            .MaximumLength(100).WithMessage("Full Name must not exceed 100 characters.");

        RuleFor(x => x.NationalId)
            .NotEmpty().WithMessage("National ID is required.")
            .Matches(@"^\d{5}-\d{7}-\d{1}$").WithMessage("National ID must be in the format XXXXX-XXXXXXX-X.");

        RuleFor(x => x.DateOfBirth)
            .NotEmpty().WithMessage("Date of Birth is required.")
            .Must(BeAValidAge).WithMessage("Donor must be between 18 and 65 years of age.");

        RuleFor(x => x.ContactNumber)
            .NotEmpty().WithMessage("Contact number is required.");
    }

    private bool BeAValidAge(DateTime dateOfBirth)
    {
        var age = DateTime.Today.Year - dateOfBirth.Year;
        if (dateOfBirth.Date > DateTime.Today.AddYears(-age)) age--;
        return age >= 18 && age <= 65;
    }
}

public class DeferralCreateValidator : AbstractValidator<DeferralCreateDto>
{
    public DeferralCreateValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Deferral reason is required.")
            .MaximumLength(500).WithMessage("Reason must not exceed 500 characters.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Invalid deferral type.");

        RuleFor(x => x.DurationDays)
            .GreaterThan(0).WithMessage("Duration must be greater than 0 days.")
            .When(x => x.Type == DeferralType.Temporary);
    }
}
