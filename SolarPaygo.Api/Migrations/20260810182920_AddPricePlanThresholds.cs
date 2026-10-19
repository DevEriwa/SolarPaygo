using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolarPaygo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPricePlanThresholds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "LoyaltyDiscountPercent",
                table: "PricePlans",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LoyaltyThresholdKwh",
                table: "PricePlans",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TimeFloorMinimumKwh",
                table: "PricePlans",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TimeFloorRatePerHour",
                table: "PricePlans",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LoyaltyDiscountPercent",
                table: "PricePlans");

            migrationBuilder.DropColumn(
                name: "LoyaltyThresholdKwh",
                table: "PricePlans");

            migrationBuilder.DropColumn(
                name: "TimeFloorMinimumKwh",
                table: "PricePlans");

            migrationBuilder.DropColumn(
                name: "TimeFloorRatePerHour",
                table: "PricePlans");
        }
    }
}
