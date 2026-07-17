using BloodBankPro.Application.DTOs.Transfer;
using FluentValidation;

namespace BloodBankPro.Application.Validators.Transfer;

public class TransferOrderCreateValidator : AbstractValidator<TransferOrderCreateDto>
{
    public TransferOrderCreateValidator()
    {
        RuleFor(x => x.BloodComponentId)
            .NotEmpty().WithMessage("Blood component selection is required.");

        RuleFor(x => x.DestinationFacilityId)
            .NotEmpty().WithMessage("Destination facility selection is required.");
    }
}

public class DiscardComponentValidator : AbstractValidator<DiscardComponentDto>
{
    public DiscardComponentValidator()
    {
        RuleFor(x => x.DiscardReason)
            .NotEmpty().WithMessage("Discard reason is required.")
            .MinimumLength(3).WithMessage("Discard reason must be at least 3 characters long.");
    }
}
