using BloodBankPro.Domain.Entities;

namespace BloodBankPro.Domain.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<Facility> Facilities { get; }
    IRepository<Donor> Donors { get; }
    IRepository<Deferral> Deferrals { get; }
    IRepository<DonationSession> DonationSessions { get; }
    IRepository<BloodUnit> BloodUnits { get; }
    IRepository<BloodComponent> BloodComponents { get; }
    IRepository<BloodRequest> BloodRequests { get; }
    IRepository<BloodReservation> BloodReservations { get; }
    IRepository<CrossMatch> CrossMatches { get; }
    IRepository<Transfusion> Transfusions { get; }
    IRepository<AdverseReaction> AdverseReactions { get; }
    IRepository<AuditLog> AuditLogs { get; }
    IRepository<TransferOrder> TransferOrders { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
