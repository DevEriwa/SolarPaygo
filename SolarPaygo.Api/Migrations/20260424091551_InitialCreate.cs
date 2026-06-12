using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SolarPaygo.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SolarSystems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    HardwareId = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    AvailableUnits = table.Column<decimal>(type: "TEXT", nullable: false),
                    OwnerName = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolarSystems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SolarSystemId = table.Column<int>(type: "INTEGER", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "TEXT", nullable: false),
                    UnitsAdded = table.Column<decimal>(type: "TEXT", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Transactions_SolarSystems_SolarSystemId",
                        column: x => x.SolarSystemId,
                        principalTable: "SolarSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UsageLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SolarSystemId = table.Column<int>(type: "INTEGER", nullable: false),
                    UnitsConsumed = table.Column<decimal>(type: "TEXT", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsageLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UsageLogs_SolarSystems_SolarSystemId",
                        column: x => x.SolarSystemId,
                        principalTable: "SolarSystems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_SolarSystemId",
                table: "Transactions",
                column: "SolarSystemId");

            migrationBuilder.CreateIndex(
                name: "IX_UsageLogs_SolarSystemId",
                table: "UsageLogs",
                column: "SolarSystemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropTable(
                name: "UsageLogs");

            migrationBuilder.DropTable(
                name: "SolarSystems");
        }
    }
}
