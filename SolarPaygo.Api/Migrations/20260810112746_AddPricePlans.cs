using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolarPaygo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPricePlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PricePlanId",
                table: "SolarSystems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PricePlans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Band = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PricePerKwh = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LoyaltyDiscountEnabled = table.Column<bool>(type: "bit", nullable: false),
                    TimeFloorProtectionEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricePlans", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolarSystems_PricePlanId",
                table: "SolarSystems",
                column: "PricePlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_SolarSystems_PricePlans_PricePlanId",
                table: "SolarSystems",
                column: "PricePlanId",
                principalTable: "PricePlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SolarSystems_PricePlans_PricePlanId",
                table: "SolarSystems");

            migrationBuilder.DropTable(
                name: "PricePlans");

            migrationBuilder.DropIndex(
                name: "IX_SolarSystems_PricePlanId",
                table: "SolarSystems");

            migrationBuilder.DropColumn(
                name: "PricePlanId",
                table: "SolarSystems");
        }
    }
}
