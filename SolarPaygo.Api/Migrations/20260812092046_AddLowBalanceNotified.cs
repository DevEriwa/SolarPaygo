using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolarPaygo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLowBalanceNotified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "LowBalanceNotified",
                table: "SolarSystems",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LowBalanceNotified",
                table: "SolarSystems");
        }
    }
}
