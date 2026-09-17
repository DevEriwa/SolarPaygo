namespace SolarPaygo.Api.Models
{
    /// <summary>
    /// A generator size that can be assigned to a customer.
    ///
    /// These used to be a fixed list written into the registration form, so adding a size
    /// meant a release. They are rows now, but the shape is deliberately unchanged:
    /// <see cref="Code"/> holds exactly the string SolarSystems.GeneratorCapacity already
    /// stores ("2KV"), so existing customers keep working untouched and nothing has to be
    /// migrated.
    /// </summary>
    public class GeneratorCapacity
    {
        public int Id { get; set; }

        /// <summary>
        /// The stored value, e.g. "2KV". Written to SolarSystems.GeneratorCapacity as-is.
        /// </summary>
        public string Code { get; set; } = string.Empty;

        /// <summary>Shown beside the code in the picker, e.g. "Medium (Standard Household)".</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// The load ceiling in watts, held explicitly rather than parsed back out of the code.
        /// Reading digits out of "7.5KV" gives 75, and therefore 75000W instead of 7500W - a
        /// ceiling ten times too high, which is a relay that never trips. A number in its own
        /// column cannot be misread that way.
        /// </summary>
        public int Watts { get; set; }

        /// <summary>
        /// Overload threshold percentage of rated watts (default 90%).
        /// </summary>
        public int OverloadThresholdPercent { get; set; } = 90;

        /// <summary>
        /// Retired sizes are hidden from the picker but still resolve for customers already on
        /// them. Deleting a size someone is using would strand that customer, so this is how a
        /// size is withdrawn.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>Order in the picker. Sizes read naturally smallest first, not alphabetically.</summary>
        public int DisplayOrder { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
