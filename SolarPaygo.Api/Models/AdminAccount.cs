using System;

namespace SolarPaygo.Api.Models
{
    public class AdminAccount
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = "Admin"; // Admin, SuperAdmin, Investor
        public bool IsActive { get; set; } = true;
        public int? DeviceGroupId { get; set; } // Linked portfolio group for Investor role
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
