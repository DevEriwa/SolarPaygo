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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
