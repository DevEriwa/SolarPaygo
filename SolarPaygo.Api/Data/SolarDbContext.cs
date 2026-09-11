using Microsoft.EntityFrameworkCore;
using SolarPaygo.Api.Models;

namespace SolarPaygo.Api.Data
{
    public class SolarDbContext : DbContext
    {
        public SolarDbContext(DbContextOptions<SolarDbContext> options) : base(options)
        {
        }

        public DbSet<SolarSystem> SolarSystems { get; set; }
        public DbSet<UsageLog> UsageLogs { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<PricePlan> PricePlans { get; set; }
        public DbSet<GeneratorCapacity> GeneratorCapacities { get; set; }
        public DbSet<DeviceGroup> DeviceGroups { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<SolarSystem>()
                .HasOne(s => s.PricePlan)
                .WithMany()
                .HasForeignKey(s => s.PricePlanId)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            modelBuilder.Entity<SolarSystem>()
                .HasOne(s => s.DeviceGroup)
                .WithMany()
                .HasForeignKey(s => s.DeviceGroupId)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);
        }
    }
}
