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
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HardwareId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AvailableUnits = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    OwnerName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StronMeterId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VirtualAccountNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VirtualBankName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerEmail = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerPhone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CustomerBvn = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PrepaidNairaBalance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CumulativeKwhConsumed = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LastSyncTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastSyncKwh = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MaxLoadWatts = table.Column<int>(type: "int", nullable: false),
                    LastBillingDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DailyKwhConsumed = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DailyTimeActiveHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DailyAmountCharged = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Voltage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Current = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Power = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    RelayState = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CoverState = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolarSystems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SolarSystemId = table.Column<int>(type: "int", nullable: false),
                    AmountPaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UnitsAdded = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StsToken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PaymentReference = table.Column<string>(type: "nvarchar(max)", nullable: true)
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
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SolarSystemId = table.Column<int>(type: "int", nullable: false),
                    UnitsConsumed = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
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
