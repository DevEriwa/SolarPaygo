using System;

namespace SolarPaygo.Api.Models
{
    public class UsageLog
    {
        public int Id { get; set; }
        public int SolarSystemId { get; set; }
        public decimal UnitsConsumed { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        public SolarSystem? SolarSystem { get; set; }
    }
}
