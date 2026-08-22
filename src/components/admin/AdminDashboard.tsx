"use client";

import { format } from "date-fns";
import {
  CalendarDays,
  CalendarOff,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { enumerateLeaveDates, sortDoctorLeaves } from "@/lib/admin-dashboard";

type WorkingHours = Record<string, [string, string]>;

type Doctor = {
  id: string;
  specialization: string;
  qualifications: string;
  yearsExperience: number;
  slotDurationMinutes: number;
  bio: string;
  workingHours: WorkingHours;
  leaves: { date: string; reason?: string | null }[];
  user: { name: string; email: string };
};

type Appointment = {
  id: string;
  status: string;
  urgency: string;
  startTime: string;
  endTime: string;
  cancellationReason?: string | null;
  patient: { name: string; email: string };
  doctor: { id: string; specialization: string; user: { name: string } };
};

const weekdays = [
  ["1", "Monday", "Mon"],
  ["2", "Tuesday", "Tue"],
  ["3", "Wednesday", "Wed"],
  ["4", "Thursday", "Thu"],
  ["5", "Friday", "Fri"],
  ["6", "Saturday", "Sat"],
  ["0", "Sunday", "Sun"],
] as const;

const statusOptions = ["ALL", "SCHEDULED", "COMPLETED", "CANCELLED"] as const;
type StatusFilter = (typeof statusOptions)[number];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function workingHoursFromForm(data: FormData, prefix: string) {
  const result: WorkingHours = {};
  for (const [key] of weekdays) {
    const start = String(data.get(`${prefix}-${key}-start`) || "");
    const end = String(data.get(`${prefix}-${key}-end`) || "");
    if (start && end) result[key] = [start, end];
  }
  return result;
}

function appointmentSort(left: Appointment, right: Appointment) {
  const now = Date.now();
  const leftUpcoming = left.status === "SCHEDULED" && new Date(left.startTime).getTime() >= now;
  const rightUpcoming = right.status === "SCHEDULED" && new Date(right.startTime).getTime() >= now;
  if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;
  return leftUpcoming
    ? new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    : new Date(right.startTime).getTime() - new Date(left.startTime).getTime();
}

export function AdminDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [doctorQuery, setDoctorQuery] = useState("");
  const [appointmentQuery, setAppointmentQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [editingDoctor, setEditingDoctor] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [doctorResponse, appointmentResponse] = await Promise.all([
        fetch("/api/doctors"),
        fetch("/api/appointments"),
      ]);
      const [doctorData, appointmentData] = await Promise.all([
        doctorResponse.json(),
        appointmentResponse.json(),
      ]);
      if (!doctorResponse.ok || !appointmentResponse.ok) {
        throw new Error(doctorData.error || appointmentData.error || "Unable to load clinic operations");
      }
      setDoctors(doctorData.doctors || []);
      setAppointments(appointmentData.appointments || []);
      setSelectedDoctorId((current) =>
        (doctorData.doctors || []).some((doctor: Doctor) => doctor.id === current)
          ? current
          : doctorData.doctors?.[0]?.id || "",
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to load clinic operations",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId) || null;
  const upcoming = appointments.filter(
    (appointment) => appointment.status === "SCHEDULED" && new Date(appointment.startTime) > new Date(),
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(
    (appointment) => appointment.status === "SCHEDULED" && appointment.startTime.slice(0, 10) === today,
  );
  const upcomingLeaveDays = doctors.reduce((total, doctor) => total + doctor.leaves.length, 0);

  const filteredDoctors = useMemo(() => {
    const needle = doctorQuery.trim().toLowerCase();
    if (!needle) return doctors;
    return doctors.filter((doctor) =>
      `${doctor.user.name} ${doctor.user.email} ${doctor.specialization} ${doctor.qualifications}`
        .toLowerCase()
        .includes(needle),
    );
  }, [doctors, doctorQuery]);

  const selectedSchedule = useMemo(
    () => appointments.filter((appointment) => appointment.doctor.id === selectedDoctorId).sort(appointmentSort),
    [appointments, selectedDoctorId],
  );

  const clinicSchedule = useMemo(() => {
    const needle = appointmentQuery.trim().toLowerCase();
    return appointments
      .filter((appointment) => statusFilter === "ALL" || appointment.status === statusFilter)
      .filter((appointment) =>
        needle
          ? `${appointment.patient.name} ${appointment.patient.email} ${appointment.doctor.user.name} ${appointment.doctor.specialization}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort(appointmentSort);
  }, [appointments, appointmentQuery, statusFilter]);

  async function addDoctor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAction("add-doctor");
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        specialization: data.get("specialization"),
        qualifications: data.get("qualifications"),
        bio: data.get("bio"),
        yearsExperience: data.get("yearsExperience"),
        slotDurationMinutes: data.get("slotDurationMinutes"),
        workingHours: workingHoursFromForm(data, "add"),
      }),
    });
    const body = await response.json();
    setSavingAction(null);
    if (!response.ok) {
      setMessage({ type: "error", text: body.error || "Unable to add doctor" });
      return;
    }
    setMessage({ type: "success", text: "Doctor profile created and ready to receive bookings." });
    form.reset();
    setShowAddDoctor(false);
    await load();
  }

  async function updateDoctor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDoctor) return;
    setSavingAction("edit-doctor");
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        specialization: data.get("specialization"),
        qualifications: data.get("qualifications"),
        bio: data.get("bio"),
        yearsExperience: data.get("yearsExperience"),
        slotDurationMinutes: data.get("slotDurationMinutes"),
        workingHours: workingHoursFromForm(data, "edit"),
      }),
    });
    const body = await response.json();
    setSavingAction(null);
    if (!response.ok) {
      setMessage({ type: "error", text: body.error || "Unable to update doctor" });
      return;
    }
    setMessage({ type: "success", text: `Dr. ${body.doctor.user.name}'s profile and schedule were updated.` });
    setEditingDoctor(false);
    await load();
  }

  async function addLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDoctor) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    let dates: string[];
    try {
      dates = enumerateLeaveDates(String(data.get("startDate")), String(data.get("endDate")));
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Invalid leave range" });
      return;
    }

    setSavingAction("add-leave");
    setMessage(null);
    let affectedAppointments = 0;
    for (const date of dates) {
      const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason: data.get("reason") }),
      });
      const body = await response.json();
      if (!response.ok) {
        setSavingAction(null);
        setMessage({ type: "error", text: body.error || `Unable to add leave for ${date}` });
        await load();
        return;
      }
      affectedAppointments += body.affectedAppointments;
    }
    setSavingAction(null);
    setMessage({
      type: "success",
      text: `${dates.length} leave day${dates.length === 1 ? "" : "s"} added for Dr. ${selectedDoctor.user.name}. ${affectedAppointments} affected appointment${affectedAppointments === 1 ? " was" : "s were"} cancelled and notifications queued.`,
    });
    form.reset();
    await load();
  }

  async function removeLeave(date: string) {
    if (!selectedDoctor) return;
    setSavingAction(`remove-leave-${date}`);
    setMessage(null);
    const response = await fetch(
      `/api/admin/doctors/${selectedDoctor.id}/leave?date=${encodeURIComponent(date)}`,
      { method: "DELETE" },
    );
    const body = await response.json();
    setSavingAction(null);
    if (!response.ok) {
      setMessage({ type: "error", text: body.error || "Unable to remove leave" });
      return;
    }
    setMessage({ type: "success", text: `Leave on ${format(new Date(`${date}T12:00:00`), "MMMM d")} removed.` });
    await load();
  }

  function chooseDoctor(id: string) {
    setSelectedDoctorId(id);
    setEditingDoctor(false);
  }

  return (
    <>
      <div className="page-header admin-page-header">
        <div>
          <p className="eyebrow">Clinic operations</p>
          <h1>Admin command centre</h1>
          <p>See every doctor, appointment, working hour, and leave day from one workspace.</p>
        </div>
        <div className="toolbar">
          <a href="#clinic-schedule" className="button button-secondary"><CalendarRange size={18} aria-hidden="true" /> Full schedule</a>
          <button type="button" className="button button-primary" onClick={() => setShowAddDoctor(true)}><Plus size={18} aria-hidden="true" /> Add doctor</button>
        </div>
      </div>

      {message && (
        <div className={message.type === "success" ? "form-success admin-feedback" : "form-error admin-feedback"} role={message.type === "error" ? "alert" : "status"}>
          {message.type === "success" && <CheckCircle2 size={18} aria-hidden="true" />}
          <span>{message.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={17} aria-hidden="true" /></button>
        </div>
      )}

      <div className="stat-grid admin-stat-grid" aria-label="Clinic summary">
        <div className="stat-card"><span className="stat-icon"><UsersRound size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{doctors.length}</strong><span>Active doctors</span></span></div>
        <div className="stat-card"><span className="stat-icon"><Clock3 size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{todayAppointments.length}</strong><span>Visits today</span></span></div>
        <div className="stat-card"><span className="stat-icon"><CalendarDays size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{upcoming.length}</strong><span>Upcoming visits</span></span></div>
        <div className="stat-card"><span className="stat-icon"><CalendarOff size={21} aria-hidden="true" /></span><span className="stat-copy"><strong>{upcomingLeaveDays}</strong><span>Upcoming leave days</span></span></div>
      </div>

      <div className="admin-command-grid">
        <section className="panel admin-directory-panel" aria-labelledby="doctor-directory-title">
          <div className="panel-header admin-section-heading"><div><p className="eyebrow">Directory</p><h2 id="doctor-directory-title">Doctors</h2></div><span className="admin-count">{filteredDoctors.length}</span></div>
          <div className="search-input admin-search"><Search size={18} aria-hidden="true" /><input value={doctorQuery} onChange={(event) => setDoctorQuery(event.target.value)} aria-label="Search doctors" placeholder="Search name or specialty" /></div>
          <div className="admin-doctor-list">
            {loading ? <><div className="skeleton" /><div className="skeleton" /></> : filteredDoctors.length ? filteredDoctors.map((doctor) => {
              const scheduledCount = appointments.filter((appointment) => appointment.doctor.id === doctor.id && appointment.status === "SCHEDULED").length;
              return (
                <button type="button" key={doctor.id} className={`admin-doctor-select ${doctor.id === selectedDoctorId ? "selected" : ""}`} onClick={() => chooseDoctor(doctor.id)} aria-pressed={doctor.id === selectedDoctorId}>
                  <span className="doctor-avatar">{initials(doctor.user.name)}</span>
                  <span className="admin-doctor-select-copy"><strong>Dr. {doctor.user.name}</strong><small>{doctor.specialization}</small><span>{scheduledCount} scheduled · {doctor.leaves.length} leave days</span></span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              );
            }) : <div className="empty-state"><Search size={28} aria-hidden="true" /><h3>No matching doctors</h3><p>Try a name, email, or specialty.</p></div>}
          </div>
        </section>

        <section className="panel admin-doctor-workspace" aria-labelledby="doctor-workspace-title">
          {selectedDoctor ? (
            <>
              <div className="admin-doctor-hero">
                <div className="admin-doctor-identity"><span className="doctor-avatar admin-avatar-large">{initials(selectedDoctor.user.name)}</span><div><p className="eyebrow">Doctor workspace</p><h2 id="doctor-workspace-title">Dr. {selectedDoctor.user.name}</h2><p>{selectedDoctor.specialization} · {selectedDoctor.qualifications}</p></div></div>
                <button type="button" className="button button-secondary" onClick={() => setEditingDoctor((value) => !value)}>{editingDoctor ? <X size={17} aria-hidden="true" /> : <Edit3 size={17} aria-hidden="true" />}{editingDoctor ? "Close editor" : "Edit profile"}</button>
              </div>

              {editingDoctor && <DoctorEditor doctor={selectedDoctor} saving={savingAction === "edit-doctor"} onSubmit={updateDoctor} onCancel={() => setEditingDoctor(false)} />}

              <div className="admin-profile-strip">
                <div><span>Experience</span><strong>{selectedDoctor.yearsExperience} years</strong></div>
                <div><span>Appointment length</span><strong>{selectedDoctor.slotDurationMinutes} minutes</strong></div>
                <div><span>Scheduled visits</span><strong>{selectedSchedule.filter((appointment) => appointment.status === "SCHEDULED").length}</strong></div>
                <div><span>Upcoming leave</span><strong>{selectedDoctor.leaves.length} days</strong></div>
              </div>

              <div className="admin-workspace-columns">
                <section className="admin-subsection" aria-labelledby="working-hours-title">
                  <div className="admin-subsection-header"><div><h3 id="working-hours-title">Working hours</h3><p>Current weekly availability</p></div><Clock3 size={20} aria-hidden="true" /></div>
                  <div className="admin-hours-list">{weekdays.map(([key, , shortLabel]) => <div key={key} className="admin-hours-row"><span>{shortLabel}</span><strong>{selectedDoctor.workingHours[key]?.join(" – ") || "Closed"}</strong></div>)}</div>
                </section>

                <section className="admin-subsection" aria-labelledby="leave-calendar-title">
                  <div className="admin-subsection-header"><div><h3 id="leave-calendar-title">Leave calendar</h3><p>Every upcoming leave day</p></div><CalendarOff size={20} aria-hidden="true" /></div>
                  <div className="admin-leave-list">
                    {sortDoctorLeaves(selectedDoctor.leaves).length ? sortDoctorLeaves(selectedDoctor.leaves).map((leave) => (
                      <div className="admin-leave-row" key={leave.date}>
                        <time dateTime={leave.date}><strong>{format(new Date(`${leave.date}T12:00:00`), "MMM d")}</strong><span>{format(new Date(`${leave.date}T12:00:00`), "EEEE")}</span></time>
                        <span>{leave.reason || "No reason added"}</span>
                        <button type="button" className="button button-ghost button-small admin-remove-leave" onClick={() => removeLeave(leave.date)} disabled={savingAction === `remove-leave-${leave.date}`}><Trash2 size={15} aria-hidden="true" /> Remove</button>
                      </div>
                    )) : <div className="admin-compact-empty"><CheckCircle2 size={18} aria-hidden="true" /><span>No upcoming leave scheduled.</span></div>}
                  </div>
                </section>
              </div>

              <section className="admin-subsection admin-leave-planner" aria-labelledby="schedule-leave-title">
                <div className="admin-subsection-header"><div><h3 id="schedule-leave-title">Schedule leave</h3><p>Add one day or an inclusive date range of up to 31 days.</p></div><CalendarRange size={20} aria-hidden="true" /></div>
                <form className="admin-leave-form" key={`leave-${selectedDoctor.id}`} onSubmit={addLeave}>
                  <div className="field"><label htmlFor="leave-start-date">Start date</label><input id="leave-start-date" name="startDate" type="date" min={today} required /></div>
                  <div className="field"><label htmlFor="leave-end-date">End date</label><input id="leave-end-date" name="endDate" type="date" min={today} required /></div>
                  <div className="field admin-leave-reason"><label htmlFor="leave-reason">Reason <span>(optional)</span></label><input id="leave-reason" name="reason" placeholder="Conference, clinic closure..." /></div>
                  <button className="button button-danger" disabled={savingAction === "add-leave"}>{savingAction === "add-leave" ? <><LoaderCircle size={17} aria-hidden="true" /> Scheduling...</> : <><CalendarOff size={17} aria-hidden="true" /> Add leave & notify</>}</button>
                </form>
                <p className="admin-helper"><Mail size={16} aria-hidden="true" /> Scheduled appointments on those dates are cancelled safely and notification jobs are queued for both participants.</p>
              </section>

              <section className="admin-subsection admin-doctor-schedule" aria-labelledby="doctor-schedule-title">
                <div className="admin-subsection-header"><div><h3 id="doctor-schedule-title">Complete doctor schedule</h3><p>Upcoming appointments first, followed by visit history.</p></div><span className="admin-count">{selectedSchedule.length}</span></div>
                <AppointmentList appointments={selectedSchedule} emptyMessage="This doctor has no appointments yet." />
              </section>
            </>
          ) : <div className="empty-state"><Stethoscope size={30} aria-hidden="true" /><h3>Select a doctor</h3><p>Choose a doctor to manage their profile, schedule, and leave.</p></div>}
        </section>
      </div>

      <section className="panel admin-clinic-schedule" id="clinic-schedule" aria-labelledby="clinic-schedule-title">
        <div className="panel-header admin-clinic-schedule-header"><div><p className="eyebrow">Clinic-wide</p><h2 id="clinic-schedule-title">All appointments</h2><p>Search every doctor and patient, then filter by appointment status.</p></div><span className="admin-count">{clinicSchedule.length}</span></div>
        <div className="admin-schedule-toolbar">
          <div className="search-input"><Search size={18} aria-hidden="true" /><input value={appointmentQuery} onChange={(event) => setAppointmentQuery(event.target.value)} aria-label="Search appointments" placeholder="Search patient, doctor, or specialty" /></div>
          <div className="admin-filter-group" aria-label="Filter appointments by status">{statusOptions.map((status) => <button type="button" key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)} aria-pressed={statusFilter === status}>{status.toLowerCase()}</button>)}</div>
        </div>
        <AppointmentList appointments={clinicSchedule} emptyMessage="No appointments match these filters." showDoctor />
      </section>

      {showAddDoctor && <AddDoctorForm saving={savingAction === "add-doctor"} onSubmit={addDoctor} onCancel={() => setShowAddDoctor(false)} />}
    </>
  );
}

function DoctorEditor({ doctor, saving, onSubmit, onCancel }: { doctor: Doctor; saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <form className="admin-edit-form" key={doctor.id} onSubmit={onSubmit}>
      <div className="admin-subsection-header"><div><h3>Edit doctor profile</h3><p>Update identity, consultation settings, and weekly availability.</p></div></div>
      <div className="field-row"><div className="field"><label htmlFor="edit-doctor-name">Full name</label><input id="edit-doctor-name" name="name" defaultValue={doctor.user.name} required /></div><div className="field"><label htmlFor="edit-doctor-email">Email</label><input id="edit-doctor-email" name="email" type="email" defaultValue={doctor.user.email} required /></div></div>
      <div className="field-row"><div className="field"><label htmlFor="edit-specialization">Specialty</label><input id="edit-specialization" name="specialization" defaultValue={doctor.specialization} required /></div><div className="field"><label htmlFor="edit-qualifications">Qualifications</label><input id="edit-qualifications" name="qualifications" defaultValue={doctor.qualifications} required /></div></div>
      <div className="field-row"><div className="field"><label htmlFor="edit-experience">Years of experience</label><input id="edit-experience" name="yearsExperience" type="number" min="0" max="70" defaultValue={doctor.yearsExperience} required /></div><div className="field"><label htmlFor="edit-duration">Slot duration</label><select id="edit-duration" name="slotDurationMinutes" defaultValue={doctor.slotDurationMinutes}>{[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></div></div>
      <div className="field"><label htmlFor="edit-bio">Profile summary</label><textarea id="edit-bio" name="bio" defaultValue={doctor.bio} required minLength={10} /></div>
      <HoursEditor prefix="edit" workingHours={doctor.workingHours} />
      <div className="admin-form-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? <><LoaderCircle size={18} aria-hidden="true" /> Saving...</> : <><CheckCircle2 size={18} aria-hidden="true" /> Save changes</>}</button></div>
    </form>
  );
}

function HoursEditor({ prefix, workingHours }: { prefix: string; workingHours?: WorkingHours }) {
  return (
    <fieldset className="admin-hours-fieldset">
      <legend>Weekly working hours</legend><p>Leave both times empty to mark a day as closed.</p>
      <div className="working-hours-grid admin-working-hours-editor">{weekdays.map(([key, label]) => {
        const weekdayDefault = !workingHours && !["6", "0"].includes(key);
        return <div className="working-day" key={key}><label>{label}</label><input aria-label={`${label} start time`} name={`${prefix}-${key}-start`} type="time" defaultValue={workingHours?.[key]?.[0] || (weekdayDefault ? "09:00" : "")} /><input aria-label={`${label} end time`} name={`${prefix}-${key}-end`} type="time" defaultValue={workingHours?.[key]?.[1] || (weekdayDefault ? "17:00" : "")} /></div>;
      })}</div>
    </fieldset>
  );
}

function AddDoctorForm({ saving, onSubmit, onCancel }: { saving: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return (
    <section className="panel admin-add-doctor" id="add-doctor" aria-labelledby="add-doctor-title">
      <div className="panel-header"><div><p className="eyebrow">New portal account</p><h2 id="add-doctor-title">Add doctor</h2><p>Create a profile, secure login, and weekly appointment schedule.</p></div><button type="button" className="button button-ghost" onClick={onCancel}><X size={17} aria-hidden="true" /> Close</button></div>
      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field-row"><div className="field"><label htmlFor="doctor-name">Full name</label><input id="doctor-name" name="name" required placeholder="Ananya Mehta" /></div><div className="field"><label htmlFor="doctor-email">Email</label><input id="doctor-email" name="email" type="email" autoComplete="email" required placeholder="doctor@clinic.com" /></div></div>
        <div className="field-row"><div className="field"><label htmlFor="doctor-password">Temporary password</label><input id="doctor-password" name="password" type="password" autoComplete="new-password" minLength={8} required defaultValue="Doctor@123" /></div><div className="field"><label htmlFor="specialization">Specialty</label><input id="specialization" name="specialization" required placeholder="General Medicine" /></div></div>
        <div className="field-row"><div className="field"><label htmlFor="qualifications">Qualifications</label><input id="qualifications" name="qualifications" required placeholder="MBBS, MD" /></div><div className="field"><label htmlFor="experience">Years of experience</label><input id="experience" name="yearsExperience" type="number" min="0" max="70" defaultValue="5" required /></div></div>
        <div className="field"><label htmlFor="bio">Profile summary</label><textarea id="bio" name="bio" required minLength={10} placeholder="Clinical interests and approach to patient care..." /></div>
        <div className="field"><label htmlFor="duration">Slot duration</label><select id="duration" name="slotDurationMinutes" defaultValue="30">{[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></div>
        <HoursEditor prefix="add" />
        <div className="admin-form-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? <><LoaderCircle size={18} aria-hidden="true" /> Creating...</> : <><UserRoundCheck size={18} aria-hidden="true" /> Create doctor profile</>}</button></div>
      </form>
    </section>
  );
}

function AppointmentList({ appointments, emptyMessage, showDoctor = false }: { appointments: Appointment[]; emptyMessage: string; showDoctor?: boolean }) {
  if (!appointments.length) return <div className="admin-compact-empty"><CalendarDays size={19} aria-hidden="true" /><span>{emptyMessage}</span></div>;
  return (
    <div className="admin-schedule-list">{appointments.map((appointment) => (
      <article className="admin-schedule-card" key={appointment.id}>
        <time className="admin-schedule-date" dateTime={appointment.startTime}><span>{format(new Date(appointment.startTime), "MMM")}</span><strong>{format(new Date(appointment.startTime), "d")}</strong><small>{format(new Date(appointment.startTime), "EEE")}</small></time>
        <div className="admin-schedule-main"><strong>{appointment.patient.name}</strong><span>{appointment.patient.email}</span>{showDoctor && <small>Dr. {appointment.doctor.user.name} · {appointment.doctor.specialization}</small>}</div>
        <div className="admin-schedule-time"><strong>{format(new Date(appointment.startTime), "h:mm a")}</strong><span>to {format(new Date(appointment.endTime), "h:mm a")}</span></div>
        <div className="admin-schedule-status"><StatusBadge value={appointment.status} />{appointment.urgency && appointment.status === "SCHEDULED" && <StatusBadge value={appointment.urgency} />}</div>
        {appointment.cancellationReason && <p className="admin-cancellation-note">{appointment.cancellationReason}</p>}
      </article>
    ))}</div>
  );
}
