export type DoctorDashboardPatient = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

export type DoctorDashboardAppointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  urgency: string;
  symptoms: string;
  preVisitSummary?: string | null;
  postVisitSummary?: string | null;
  postVisitNotes?: string | null;
  prescription?: string | null;
  cancellationReason?: string | null;
  patient: DoctorDashboardPatient;
};

export type DoctorPatientRecord = {
  patient: DoctorDashboardPatient;
  appointments: DoctorDashboardAppointment[];
  historyVisits: DoctorDashboardAppointment[];
  nextAppointment: DoctorDashboardAppointment | null;
  completedVisits: number;
  upcomingVisits: number;
};

function byStartTimeAscending(a: DoctorDashboardAppointment, b: DoctorDashboardAppointment) {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

function byStartTimeDescending(a: DoctorDashboardAppointment, b: DoctorDashboardAppointment) {
  return byStartTimeAscending(b, a);
}

export function getUpcomingDoctorAppointments(appointments: DoctorDashboardAppointment[], now = new Date()) {
  const nowTime = now.getTime();
  return appointments
    .filter((appointment) => appointment.status === "SCHEDULED" && new Date(appointment.endTime).getTime() >= nowTime)
    .sort(byStartTimeAscending);
}

export function buildDoctorPatientRecords(appointments: DoctorDashboardAppointment[], now = new Date()) {
  const grouped = new Map<string, DoctorDashboardAppointment[]>();

  for (const appointment of appointments) {
    const current = grouped.get(appointment.patient.id) ?? [];
    current.push(appointment);
    grouped.set(appointment.patient.id, current);
  }

  const records: DoctorPatientRecord[] = [];
  for (const patientAppointments of grouped.values()) {
    const ordered = [...patientAppointments].sort(byStartTimeDescending);
    const upcoming = getUpcomingDoctorAppointments(ordered, now);
    const historyVisits = ordered.filter((appointment) =>
      appointment.status !== "SCHEDULED" || new Date(appointment.endTime).getTime() < now.getTime(),
    );

    records.push({
      patient: ordered[0].patient,
      appointments: ordered,
      historyVisits,
      nextAppointment: upcoming[0] ?? null,
      completedVisits: ordered.filter((appointment) => appointment.status === "COMPLETED").length,
      upcomingVisits: upcoming.length,
    });
  }

  return records.sort((a, b) => {
    const aActivity = a.nextAppointment?.startTime ?? a.appointments[0]?.startTime ?? "";
    const bActivity = b.nextAppointment?.startTime ?? b.appointments[0]?.startTime ?? "";
    return new Date(bActivity).getTime() - new Date(aActivity).getTime();
  });
}
