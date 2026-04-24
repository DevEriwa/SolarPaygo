namespace SolarPaygo.Api.Models
{
    public class SolarSystem
    {
        public int Id { get; set; }
        public string HardwareId { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // Active, Locked, Disabled
        public decimal AvailableUnits { get; set; }
        public string? OwnerName { get; set; }
    }
}
