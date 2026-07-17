using BloodBankPro.Domain.Entities;
using BloodBankPro.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BloodBankPro.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Facility> Facilities => Set<Facility>();
    public DbSet<Donor> Donors => Set<Donor>();
    public DbSet<Deferral> Deferrals => Set<Deferral>();
    public DbSet<DonationSession> DonationSessions => Set<DonationSession>();
    public DbSet<BloodUnit> BloodUnits => Set<BloodUnit>();
    public DbSet<BloodComponent> BloodComponents => Set<BloodComponent>();
    public DbSet<BloodRequest> BloodRequests => Set<BloodRequest>();
    public DbSet<BloodReservation> BloodReservations => Set<BloodReservation>();
    public DbSet<CrossMatch> CrossMatches => Set<CrossMatch>();
    public DbSet<Transfusion> Transfusions => Set<Transfusion>();
    public DbSet<AdverseReaction> AdverseReactions => Set<AdverseReaction>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<TransferOrder> TransferOrders => Set<TransferOrder>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Core constraints
        builder.Entity<Donor>()
            .HasIndex(d => d.NationalId)
            .IsUnique();

        builder.Entity<BloodUnit>()
            .HasIndex(u => u.UnitId)
            .IsUnique();

        builder.Entity<BloodRequest>()
            .HasIndex(r => r.RequestNumber)
            .IsUnique();

        // Enforce Restrict Delete behavior across relationships to prevent hard deletes
        foreach (var relationship in builder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }
    }
}
