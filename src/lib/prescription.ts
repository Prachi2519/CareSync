type Prescription = { medication?: string; dosage?: string; frequencyPerDay?: number; durationDays?: number; instructions?: string };

export function formatPrescription(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Prescription;
    if (!parsed || typeof parsed !== "object") return value;
    const medication = [parsed.medication, parsed.dosage].filter(Boolean).join(" · ");
    const schedule = [
      parsed.frequencyPerDay ? `${parsed.frequencyPerDay} time${parsed.frequencyPerDay === 1 ? "" : "s"} daily` : "",
      parsed.durationDays ? `for ${parsed.durationDays} day${parsed.durationDays === 1 ? "" : "s"}` : "",
    ].filter(Boolean).join(" ");
    return [medication, schedule, parsed.instructions].filter(Boolean).join("\n");
  } catch {
    return value;
  }
}
