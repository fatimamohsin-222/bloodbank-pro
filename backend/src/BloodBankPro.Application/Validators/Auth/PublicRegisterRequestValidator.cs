using BloodBankPro.Application.DTOs.Auth;
using FluentValidation;

namespace BloodBankPro.Application.Validators.Auth;

public class PublicRegisterRequestValidator : AbstractValidator<PublicRegisterRequest>
{
    public PublicRegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email address is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MinimumLength(3).WithMessage("Full name must be at least 3 characters.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters.");

        RuleFor(x => x.NationalId)
            .NotEmpty().WithMessage("National ID is required.")
            .Length(9, 15).WithMessage("National ID must be between 9 and 15 characters.");

        RuleFor(x => x.ContactNumber)
            .NotEmpty().WithMessage("Contact number is required.");

        RuleFor(x => x.Role)
            .Must(role => role == "Donor" || role == "Recipient")
            .WithMessage("Role must be either 'Donor' or 'Recipient'.");
    }
}
