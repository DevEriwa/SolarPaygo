using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolarPaygo.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGeneratorCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CumulativeKwhBought",
                table: "SolarSystems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CustomerDob",
                table: "SolarSystems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerGender",
                table: "SolarSystems",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GeneratorCapacity",
                table: "SolarSystems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CumulativeKwhBought",
                table: "SolarSystems");

            migrationBuilder.DropColumn(
                name: "CustomerDob",
                table: "SolarSystems");

            migrationBuilder.DropColumn(
                name: "CustomerGender",
                table: "SolarSystems");

            migrationBuilder.DropColumn(
                name: "GeneratorCapacity",
                table: "SolarSystems");
        }
    }
}
