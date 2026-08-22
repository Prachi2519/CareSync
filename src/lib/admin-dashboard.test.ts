import { enumerateLeaveDates, sortDoctorLeaves } from "@/lib/admin-dashboard";

describe("admin leave management", () => {
  it("expands an inclusive multi-day leave range", () => {
    expect(enumerateLeaveDates("2026-08-24", "2026-08-27")).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
    ]);
  });

  it("rejects reversed and excessively long leave ranges", () => {
    expect(() => enumerateLeaveDates("2026-08-27", "2026-08-24")).toThrow(
      "Leave end date must be on or after the start date",
    );
    expect(() => enumerateLeaveDates("2026-08-01", "2026-09-15")).toThrow(
      "Leave ranges can be up to 31 days",
    );
  });

  it("keeps every leave date and sorts it chronologically", () => {
    expect(
      sortDoctorLeaves([
        { date: "2026-08-25", reason: "Conference" },
        { date: "2026-08-24", reason: "Personal" },
        { date: "2026-08-27", reason: "Training" },
      ]).map((leave) => leave.date),
    ).toEqual(["2026-08-24", "2026-08-25", "2026-08-27"]);
  });
});
