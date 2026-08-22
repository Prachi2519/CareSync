import { buildDoctorPatientRecords, getUpcomingDoctorAppointments } from "@/lib/doctor-dashboard";

const patient = {
  id: "patient-1",
  name: "Riya Sharma",
  email: "riya@example.com",
  phone: "+91 99999 11111",
};

function appointment(overrides: Record<string, unknown> = {}) {
  return {
    id: "appointment-1",
    startTime: "2026-08-20T09:00:00.000Z",
    endTime: "2026-08-20T09:30:00.000Z",
    status: "COMPLETED",
    urgency: "LOW",
    symptoms: "Recurring headache",
    preVisitSummary: "Recurring headache for five days",
    postVisitSummary: "Rest, hydrate, and follow up if symptoms worsen.",
    postVisitNotes: "Likely tension headache.",
    prescription: "Paracetamol 500 mg",
    cancellationReason: null,
    patient,
    ...overrides,
  };
}

describe("doctor dashboard records", () => {
  it("keeps completed visits as detailed patient history instead of only a count", () => {
    const records = buildDoctorPatientRecords([
      appointment(),
      appointment({
        id: "appointment-2",
        startTime: "2026-08-25T09:00:00.000Z",
        endTime: "2026-08-25T09:30:00.000Z",
        status: "SCHEDULED",
      }),
    ], new Date("2026-08-22T00:00:00.000Z"));

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ completedVisits: 1, upcomingVisits: 1 });
    expect(records[0].historyVisits.map((visit) => visit.id)).toEqual(["appointment-1"]);
    expect(records[0].nextAppointment?.id).toBe("appointment-2");
  });

  it("sorts every historical visit newest first", () => {
    const records = buildDoctorPatientRecords([
      appointment({ id: "older", startTime: "2026-07-01T09:00:00.000Z" }),
      appointment({ id: "newer", startTime: "2026-08-20T09:00:00.000Z" }),
    ], new Date("2026-08-22T00:00:00.000Z"));

    expect(records[0].historyVisits.map((visit) => visit.id)).toEqual(["newer", "older"]);
  });

  it("returns only scheduled appointments that have not ended", () => {
    const upcoming = getUpcomingDoctorAppointments([
      appointment({ id: "completed" }),
      appointment({ id: "ended", status: "SCHEDULED" }),
      appointment({
        id: "future",
        status: "SCHEDULED",
        startTime: "2026-08-25T09:00:00.000Z",
        endTime: "2026-08-25T09:30:00.000Z",
      }),
    ], new Date("2026-08-22T00:00:00.000Z"));

    expect(upcoming.map((visit) => visit.id)).toEqual(["future"]);
  });
});
