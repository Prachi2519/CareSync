"use client";

import { format, isSameDay } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  Mail,
  Phone,
  Pill,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  buildDoctorPatientRecords,
  DoctorDashboardAppointment,
  getUpcomingDoctorAppointments,
} from "@/lib/doctor-dashboard";

type ScheduleFilter = "ALL" | "TODAY" | "HIGH";

function getVisitSummary(appointment: DoctorDashboardAppointment) {
  if (appointment.postVisitSummary) {
    try {
      const parsed = JSON.parse(appointment.postVisitSummary) as { summary?: string };
      if (parsed.summary) return parsed.summary;
    } catch {
      return appointment.postVisitSummary;
    }
  }
  return appointment.postVisitNotes || appointment.preVisitSummary || appointment.symptoms;
}

function getPrescriptionLabel(prescription?: string | null) {
  if (!prescription) return "";
  try {
    const parsed = JSON.parse(prescription) as { medication?: string; dosage?: string };
    return [parsed.medication, parsed.dosage].filter(Boolean).join(" · ");
  } catch {
    return prescription;
  }
}

function matchesAppointment(appointment: DoctorDashboardAppointment, query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  return [
    appointment.patient.name,
    appointment.patient.email,
    appointment.patient.phone,
    appointment.symptoms,
    appointment.preVisitSummary,
  ].some((value) => value?.toLowerCase().includes(search));
}

export function DoctorDashboard() {
  const [appointments, setAppointments] = useState<DoctorDashboardAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("ALL");
  const [now, setNow] = useState<Date | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load your clinical workspace.");
      setAppointments(data.appointments || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your clinical workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    void loadAppointments();
  }, [loadAppointments]);

  const scheduled = useMemo(() => now ? getUpcomingDoctorAppointments(appointments, now) : [], [appointments, now]);
  const today = now ? scheduled.filter((appointment) => isSameDay(new Date(appointment.startTime), now)) : [];
  const highUrgency = scheduled.filter((appointment) => appointment.urgency === "HIGH");
  const patientRecords = useMemo(() => now ? buildDoctorPatientRecords(appointments, now) : [], [appointments, now]);
  const patientsSeen = patientRecords.filter((record) => record.completedVisits > 0);

  const visibleSchedule = scheduled.filter((appointment) => {
    if (!matchesAppointment(appointment, scheduleQuery)) return false;
    if (scheduleFilter === "TODAY") return now ? isSameDay(new Date(appointment.startTime), now) : false;
    if (scheduleFilter === "HIGH") return appointment.urgency === "HIGH";
    return true;
  });

  const visiblePatientRecords = patientRecords.filter((record) => {
    const search = patientQuery.trim().toLowerCase();
    if (!search) return true;
    return [record.patient.name, record.patient.email, record.patient.phone]
      .some((value) => value?.toLowerCase().includes(search));
  });

  const nextAppointment = scheduled[0] ?? null;

  return (
    <>
      <div className="page-header doctor-page-header">
        <div>
          <p className="eyebrow">Clinical operations</p>
          <h1>Doctor command centre</h1>
          <p>See who is next, review every patient record, and move from context to care without losing the thread.</p>
        </div>
        <div className="doctor-header-actions">
          <a href="#patients" className="button button-secondary"><UsersRound size={18} aria-hidden="true" /> Patient history</a>
          <span className="doctor-date-pill"><CalendarDays size={18} aria-hidden="true" /> {now ? format(now, "EEEE, MMMM d") : "Today"}</span>
        </div>
      </div>

      {error && (
        <div className="form-error doctor-dashboard-feedback" role="alert">
          <AlertTriangle size={20} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" className="button button-small button-secondary" onClick={() => void loadAppointments()}>
            <RefreshCw size={16} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      <div className="stat-grid doctor-stat-grid" aria-label="Clinical summary">
        <div className="stat-card"><span className="stat-icon"><UsersRound size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{today.length}</strong><span>Visits today</span></span></div>
        <div className="stat-card"><span className="stat-icon"><CalendarClock size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{scheduled.length}</strong><span>Upcoming</span></span></div>
        <div className="stat-card"><span className="stat-icon doctor-danger-icon"><AlertTriangle size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{highUrgency.length}</strong><span>High priority</span></span></div>
        <div className="stat-card"><span className="stat-icon doctor-success-icon"><CheckCircle2 size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{patientsSeen.length}</strong><span>Patients seen</span></span></div>
      </div>

      {!loading && nextAppointment && (
        <section className="doctor-next-visit" aria-labelledby="next-visit-title">
          <div className="doctor-next-time" aria-hidden="true">
            <span>{format(new Date(nextAppointment.startTime), "MMM")}</span>
            <strong>{format(new Date(nextAppointment.startTime), "d")}</strong>
            <small>{format(new Date(nextAppointment.startTime), "h:mm a")}</small>
          </div>
          <div className="doctor-next-copy">
            <p className="eyebrow">Up next</p>
            <h2 id="next-visit-title">{nextAppointment.patient.name}</h2>
            <p>{nextAppointment.preVisitSummary || nextAppointment.symptoms}</p>
            <div className="doctor-inline-meta">
              <span><Clock3 size={15} aria-hidden="true" /> {format(new Date(nextAppointment.startTime), "EEEE 'at' h:mm a")}</span>
              <StatusBadge value={nextAppointment.urgency} />
            </div>
          </div>
          <Link href={`/doctor/appointments/${nextAppointment.id}`} className="button button-primary">
            Review patient <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}

      <section className="panel doctor-schedule-panel" id="schedule" aria-labelledby="doctor-schedule-title">
        <div className="panel-header doctor-section-header">
          <div><p className="eyebrow">Care queue</p><h2 id="doctor-schedule-title">Complete upcoming schedule</h2><p>Search patient context and focus the queue by clinical priority.</p></div>
          <span className="admin-count">{visibleSchedule.length}</span>
        </div>
        <div className="doctor-toolbar">
          <div className="search-input">
            <Search size={18} aria-hidden="true" />
            <input value={scheduleQuery} onChange={(event) => setScheduleQuery(event.target.value)} aria-label="Search upcoming appointments" placeholder="Search patient or symptom" />
          </div>
          <div className="doctor-filter-group" aria-label="Filter upcoming appointments">
            {(["ALL", "TODAY", "HIGH"] as ScheduleFilter[]).map((filter) => (
              <button key={filter} type="button" className={scheduleFilter === filter ? "active" : ""} aria-pressed={scheduleFilter === filter} onClick={() => setScheduleFilter(filter)}>
                {filter === "ALL" ? "All upcoming" : filter === "TODAY" ? "Today" : "High priority"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="doctor-loading-list" aria-label="Loading appointment schedule"><div className="skeleton" /><div className="skeleton" /></div>
        ) : visibleSchedule.length ? (
          <div className="doctor-visit-list">
            {visibleSchedule.map((appointment) => (
              <article className="doctor-visit-card" key={appointment.id}>
                <time className="doctor-visit-date" dateTime={appointment.startTime}>
                  <span>{format(new Date(appointment.startTime), "MMM")}</span>
                  <strong>{format(new Date(appointment.startTime), "d")}</strong>
                  <small>{format(new Date(appointment.startTime), "EEE")}</small>
                </time>
                <div className="doctor-visit-main">
                  <strong>{appointment.patient.name}</strong>
                  <span>{appointment.preVisitSummary || appointment.symptoms}</span>
                  <small>{appointment.patient.phone || appointment.patient.email}</small>
                </div>
                <div className="doctor-visit-time">
                  <strong>{format(new Date(appointment.startTime), "h:mm a")}</strong>
                  <span>to {format(new Date(appointment.endTime), "h:mm a")}</span>
                </div>
                <div className="doctor-visit-actions">
                  <StatusBadge value={appointment.urgency} />
                  <Link href={`/doctor/appointments/${appointment.id}`} className="button button-primary button-small" aria-label={`Open visit with ${appointment.patient.name}`}>
                    Open visit <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Clock3 size={28} aria-hidden="true" /><h3>No appointments match</h3><p>Change the search or priority filter to see the rest of your schedule.</p></div>
        )}
      </section>

      <section className="doctor-patient-records" id="patients" aria-labelledby="patient-records-title">
        <div className="doctor-records-heading">
          <div><p className="eyebrow">Continuity of care</p><h2 id="patient-records-title">Patient records</h2><p>Every patient you have seen or are scheduled to see, with their complete visit history.</p></div>
          <div className="search-input doctor-patient-search">
            <Search size={18} aria-hidden="true" />
            <input value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} aria-label="Search patient records" placeholder="Search patient name or contact" />
          </div>
        </div>

        {loading ? (
          <div className="doctor-record-grid" aria-label="Loading patient records"><div className="skeleton" /><div className="skeleton" /></div>
        ) : visiblePatientRecords.length ? (
          <div className="doctor-record-grid">
            {visiblePatientRecords.map((record) => (
              <article className="doctor-patient-card" key={record.patient.id}>
                <header className="doctor-patient-header">
                  <span className="doctor-patient-avatar" aria-hidden="true">{record.patient.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                  <div className="doctor-patient-identity">
                    <h3>{record.patient.name}</h3>
                    <div className="doctor-contact-list">
                      <a href={`mailto:${record.patient.email}`}><Mail size={14} aria-hidden="true" /> {record.patient.email}</a>
                      {record.patient.phone && <a href={`tel:${record.patient.phone}`}><Phone size={14} aria-hidden="true" /> {record.patient.phone}</a>}
                    </div>
                  </div>
                  <span className="doctor-patient-total"><UserRound size={15} aria-hidden="true" /> {record.appointments.length} {record.appointments.length === 1 ? "visit" : "visits"}</span>
                </header>

                <div className="doctor-patient-stats">
                  <div><span>Completed</span><strong>{record.completedVisits}</strong></div>
                  <div><span>Upcoming</span><strong>{record.upcomingVisits}</strong></div>
                  <div><span>Last visit</span><strong>{record.historyVisits[0] ? format(new Date(record.historyVisits[0].startTime), "MMM d, yyyy") : "Not yet"}</strong></div>
                </div>

                {record.nextAppointment && (
                  <div className="doctor-next-patient-visit">
                    <CalendarClock size={18} aria-hidden="true" />
                    <div><span>Next appointment</span><strong>{format(new Date(record.nextAppointment.startTime), "EEE, MMM d 'at' h:mm a")}</strong></div>
                    <Link href={`/doctor/appointments/${record.nextAppointment.id}`} aria-label={`Open next visit for ${record.patient.name}`}><ArrowRight size={18} aria-hidden="true" /></Link>
                  </div>
                )}

                <div className="doctor-history-heading"><span><History size={17} aria-hidden="true" /> Visit history</span><strong>{record.historyVisits.length}</strong></div>
                {record.historyVisits.length ? (
                  <div className="doctor-history-list">
                    {record.historyVisits.map((visit) => {
                      const prescription = getPrescriptionLabel(visit.prescription);
                      return (
                        <article className="doctor-history-visit" key={visit.id}>
                          <div className="doctor-history-topline">
                            <time dateTime={visit.startTime}>{format(new Date(visit.startTime), "MMMM d, yyyy · h:mm a")}</time>
                            <div><StatusBadge value={visit.status} /><StatusBadge value={visit.urgency} /></div>
                          </div>
                          <p>{getVisitSummary(visit)}</p>
                          {prescription && <span className="doctor-prescription"><Pill size={15} aria-hidden="true" /> {prescription}</span>}
                          {visit.cancellationReason && <span className="doctor-cancellation"><AlertTriangle size={15} aria-hidden="true" /> {visit.cancellationReason}</span>}
                          <Link href={`/doctor/appointments/${visit.id}`} className="doctor-record-link">View visit record <ArrowRight size={15} aria-hidden="true" /></Link>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="doctor-no-history"><ClipboardList size={20} aria-hidden="true" /><span>No completed or cancelled visits yet. The first clinical record will appear here after the visit.</span></div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Stethoscope size={28} aria-hidden="true" /><h3>No patient records match</h3><p>Try a different name, email, or phone number.</p></div>
        )}
      </section>
    </>
  );
}
