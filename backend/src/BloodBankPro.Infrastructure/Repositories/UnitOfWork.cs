using BloodBankPro.Domain.Entities;
using BloodBankPro.Domain.Interfaces;
using BloodBankPro.Infrastructure.Data;

namespace BloodBankPro.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _dbContext;

    private IRepository<Facility>? _facilities;
    private IRepository<Donor>? _donors;
    private IRepository<Deferral>? _deferrals;
    private IRepository<DonationSession>? _donationSessions;
    private IRepository<BloodUnit>? _bloodUnits;
    private IRepository<BloodComponent>? _bloodComponents;
    private IRepository<BloodRequest>? _bloodRequests;
    private IRepository<BloodReservation>? _bloodReservations;
    private IRepository<CrossMatch>? _crossMatches;
    private IRepository<Transfusion>? _transfusions;
    private IRepository<AdverseReaction>? _adverseReactions;
    private IRepository<AuditLog>? _auditLogs;
    private IRepository<TransferOrder>? _transferOrders;

    public UnitOfWork(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public IRepository<Facility> Facilities => _facilities ??= new Repository<Facility>(_dbContext);
    public IRepository<Donor> Donors => _donors ??= new Repository<Donor>(_dbContext);
    public IRepository<Deferral> Deferrals => _deferrals ??= new Repository<Deferral>(_dbContext);
    public IRepository<DonationSession> DonationSessions => _donationSessions ??= new Repository<DonationSession>(_dbContext);
    public IRepository<BloodUnit> BloodUnits => _bloodUnits ??= new Repository<BloodUnit>(_dbContext);
    public IRepository<BloodComponent> BloodComponents => _bloodComponents ??= new Repository<BloodComponent>(_dbContext);
    public IRepository<BloodRequest> BloodRequests => _bloodRequests ??= new Repository<BloodRequest>(_dbContext);
    public IRepository<BloodReservation> BloodReservations => _bloodReservations ??= new Repository<BloodReservation>(_dbContext);
    public IRepository<CrossMatch> CrossMatches => _crossMatches ??= new Repository<CrossMatch>(_dbContext);
    public IRepository<Transfusion> Transfusions => _transfusions ??= new Repository<Transfusion>(_dbContext);
    public IRepository<AdverseReaction> AdverseReactions => _adverseReactions ??= new Repository<AdverseReaction>(_dbContext);
    public IRepository<AuditLog> AuditLogs => _auditLogs ??= new Repository<AuditLog>(_dbContext);
    public IRepository<TransferOrder> TransferOrders => _transferOrders ??= new Repository<TransferOrder>(_dbContext);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
