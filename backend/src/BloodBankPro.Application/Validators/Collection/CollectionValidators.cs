using BloodBankPro.Application.DTOs.Collection;
using BloodBankPro.Domain.Enums;
using FluentValidation;

namespace BloodBankPro.Application.Validators.Collection;

public class DonationSessionCreateValidator : AbstractValidator<DonationSessionCreateDto>
{
    public DonationSessionCreateValidator()
    {
        RuleFor(x => x.DonorId).NotEmpty().WithMessage("Donor ID is required.");
        RuleFor(x => x.FacilityId).NotEmpty().WithMessage("Facility ID is required.");
        
        RuleFor(x => x.SystolicBP)
            .InclusiveBetween(50, 250).WithMessage("Systolic BP must be between 50 and 250 mmHg.");
            
        RuleFor(x => x.DiastolicBP)
            .InclusiveBetween(30, 150).WithMessage("Diastolic BP must be between 30 and 150 mmHg.");
            
        RuleFor(x => x.PulseRate)
            .InclusiveBetween(30, 200).WithMessage("Pulse rate must be between 30 and 200 bpm.");
            
        RuleFor(x => x.TemperatureCelsius)
            .InclusiveBetween(30.0, 45.0).WithMessage("Temperature must be between 30°C and 45°C.");
            
        RuleFor(x => x.HemoglobinLevel)
            .InclusiveBetween(5.0, 25.0).WithMessage("Hemoglobin level must be between 5.0 and 25.0 g/dL.");
            
        RuleFor(x => x.WeightKg)
            .InclusiveBetween(30.0, 250.0).WithMessage("Weight must be between 30.0 and 250.0 kg.");
    }
}

public class AboRecordValidator : AbstractValidator<AboRecordDto>
{
    public AboRecordValidator()
    {
        RuleFor(x => x.BloodGroup)
            .IsInEnum().WithMessage("Invalid blood group.")
            .NotEqual(BloodGroup.Unknown).WithMessage("Blood group cannot be Unknown.");
    }
}
