using BloodBankPro.Application.DTOs.Request;
using FluentValidation;

namespace BloodBankPro.Application.Validators.Request;

public class BloodRequestCreateValidator : AbstractValidator<BloodRequestCreateDto>
{
    public BloodRequestCreateValidator()
    {
        RuleFor(x => x.PatientName)
            .NotEmpty().WithMessage("Patient name is required.");

        RuleFor(x => x.PatientNationalId)
            .NotEmpty().WithMessage("Patient National ID is required.");

        RuleFor(x => x.UnitsRequested)
            .GreaterThan(0).WithMessage("At least 1 unit must be requested.");

        RuleFor(x => x.ClinicalIndication)
            .NotEmpty().WithMessage("Clinical indication is required.");
    }
}
