using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BloodBankPro.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTransferOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TransferOrders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShipmentNumber = table.Column<string>(type: "text", nullable: false),
                    BloodComponentId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceFacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    DestinationFacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SentDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReceivedDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransferOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransferOrders_BloodComponents_BloodComponentId",
                        column: x => x.BloodComponentId,
                        principalTable: "BloodComponents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransferOrders_Facilities_DestinationFacilityId",
                        column: x => x.DestinationFacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TransferOrders_Facilities_SourceFacilityId",
                        column: x => x.SourceFacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TransferOrders_BloodComponentId",
                table: "TransferOrders",
                column: "BloodComponentId");

            migrationBuilder.CreateIndex(
                name: "IX_TransferOrders_DestinationFacilityId",
                table: "TransferOrders",
                column: "DestinationFacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_TransferOrders_SourceFacilityId",
                table: "TransferOrders",
                column: "SourceFacilityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TransferOrders");
        }
    }
}
