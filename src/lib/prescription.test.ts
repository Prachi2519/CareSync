import { describe, expect, it } from "vitest";
import { formatPrescription } from "@/lib/prescription";

describe("formatPrescription", () => {
  it("turns stored prescription JSON into readable clinical copy", () => {
    expect(formatPrescription(JSON.stringify({ medication: "Cetirizine", dosage: "10 mg", frequencyPerDay: 1, durationDays: 5 })))
      .toBe("Cetirizine · 10 mg\n1 time daily for 5 days");
  });

  it("preserves legacy plain-text prescriptions", () => {
    expect(formatPrescription("Continue hydration as advised")).toBe("Continue hydration as advised");
  });
});
