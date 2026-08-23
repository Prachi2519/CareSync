"use client";

import { addDays, format, isAfter } from "date-fns";
import { CalendarDays, Clock3, Search, Stethoscope, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

type Doctor = {
  id: string; specialization: string; qualifications: string; bio: string;
  yearsExperience: number; slotDurationMinutes: number;
  user: { name: string; email: string };
};
type Appointment = {
  id: string; startTime: string; endTime: string; status: string; urgency: string;
  doctor: { specialization: string; user: { name: string } };
};

export function PatientDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const [doctorResponse, appointmentResponse] = await Promise.all([fetch("/api/doctors"), fetch("/api/appointments")]);
    const [doctorData, appointmentData] = await Promise.all([doctorResponse.json(), appointmentResponse.json()]);
    setDoctors(doctorData.doctors || []); setAppointments(appointmentData.appointments || []); setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const specialties = useMemo(() => [...new Set(doctors.map((doctor) => doctor.specialization))].sort(), [doctors]);
  const filteredDoctors = doctors.filter((doctor) => {
    const search = `${doctor.user.name} ${doctor.specialization} ${doctor.qualifications}`.toLowerCase();
    return search.includes(query.toLowerCase()) && (!specialty || doctor.specialization === specialty);
  });
  const upcoming = appointments.filter((item) => item.status === "SCHEDULED" && isAfter(new Date(item.startTime), new Date()));
  const completed = appointments.filter((item) => item.status === "COMPLETED");

  async function cancel(id: string) {
    if (!window.confirm("Cancel this appointment? The slot will become available to other patients.")) return;
    const response = await fetch(`/api/appointments/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Cancelled by patient" }) });
    const data = await response.json();
    setMessage(response.ok ? "Appointment cancelled. Notifications have been queued." : data.error || "Unable to cancel appointment.");
    if (response.ok) await load();
  }

  return (
    <>
      <div className="page-header"><div><p className="eyebrow">Patient portal</p><h1>Your care, in one place.</h1><p>Book a visit, prepare in advance, and keep your follow-ups clear.</p></div><Link href="#doctors" className="button button-primary"><Stethoscope size={18} /> Find a doctor</Link></div>
      {message && <div className="form-info" role="status" style={{ marginBottom: 20 }}>{message}</div>}
      <div className="stat-grid" aria-busy={loading}>
        <div className="stat-card"><span className="stat-icon"><CalendarDays size={21} /></span><span className="stat-copy"><strong>{loading ? <span className="stat-value-skeleton" /> : upcoming.length}</strong><span>Upcoming visits</span></span></div>
        <div className="stat-card"><span className="stat-icon"><UserRoundCheck size={21} /></span><span className="stat-copy"><strong>{loading ? <span className="stat-value-skeleton" /> : completed.length}</strong><span>Completed visits</span></span></div>
        <div className="stat-card"><span className="stat-icon"><Stethoscope size={21} /></span><span className="stat-copy"><strong>{loading ? <span className="stat-value-skeleton" /> : specialties.length}</strong><span>Specialties</span></span></div>
        <div className="stat-card"><span className="stat-icon"><Clock3 size={21} /></span><span className="stat-copy"><strong>{format(addDays(new Date(), 1), "EEE")}</strong><span>Next slots available</span></span></div>
      </div>

      <div className="dashboard-grid">
        <section className="panel span-12" id="appointments">
          <div className="panel-header"><div><h2>Upcoming appointments</h2><p>Your confirmed schedule</p></div></div>
          {loading ? <div className="skeleton" /> : upcoming.length ? <div className="appointment-list">{upcoming.map((item) => <div className="appointment-item" key={item.id}>
            <div className="appointment-date"><span>{format(new Date(item.startTime), "MMM")}</span><strong>{format(new Date(item.startTime), "d")}</strong></div>
            <div className="appointment-main"><strong>Dr. {item.doctor.user.name}</strong><span>{item.doctor.specialization} · {format(new Date(item.startTime), "h:mm a")}</span></div>
            <div className="appointment-actions"><StatusBadge value={item.status} /><Link href={`/patient/appointments/${item.id}`} className="button button-secondary button-small">View</Link><button onClick={() => cancel(item.id)} className="button button-ghost button-small">Cancel</button></div>
          </div>)}</div> : <div className="empty-state"><CalendarDays size={28} /><h3>No appointments yet</h3><p>Choose a doctor below to book your first visit.</p></div>}
        </section>

        <section className="panel span-12" id="doctors">
          <div className="panel-header"><div><h2>Find the right doctor</h2><p>Search by name, specialty, or qualification</p></div></div>
          <div className="toolbar" style={{ marginBottom: 20 }}>
            <div className="search-input"><Search size={19} aria-hidden="true" /><input className="input" aria-label="Search doctors" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search doctors" /></div>
            <select className="input" aria-label="Filter by specialty" style={{ width: "auto", minWidth: 190 }} value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">All specialties</option>{specialties.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          {loading ? <div className="doctor-grid"><div className="skeleton" /><div className="skeleton" /></div> : <div className="doctor-grid">{filteredDoctors.map((doctor) => <article className="doctor-card" key={doctor.id}>
            <div className="doctor-card-top"><span className="doctor-avatar">{doctor.user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><h3>Dr. {doctor.user.name}</h3><span className="doctor-specialty">{doctor.specialization}</span></div></div>
            <div className="doctor-meta"><span><UserRoundCheck size={15} /> {doctor.yearsExperience} years</span><span><Clock3 size={15} /> {doctor.slotDurationMinutes} min visits</span></div>
            <p>{doctor.bio}</p><Link href={`/patient/book/${doctor.id}`} className="button button-primary button-small">View slots</Link>
          </article>)}</div>}
          {!loading && !filteredDoctors.length && <div className="empty-state"><Search size={28} /><h3>No matching doctors</h3><p>Try a different name or specialty.</p></div>}
        </section>
      </div>
    </>
  );
}
