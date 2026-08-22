"use client";

import { addDays, format } from "date-fns";
import { ArrowLeft, BrainCircuit, CalendarDays, CheckCircle2, LoaderCircle, Pill, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

type Appointment = { id:string; startTime:string; endTime:string; status:string; symptoms:string; preVisitSummary?:string; urgency:string; suggestedQuestions?:string; postVisitSummary?:string; prescription?:string; doctor:{ id:string; specialization:string; qualifications:string; user:{name:string;email:string} }; medicationReminders:{id:string;medication:string;dosage:string;frequencyPerDay:number;active:boolean}[] };
type Slot = { startTime:string; endTime:string; label:string };

export function PatientAppointmentDetail({ id }: { id: string }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [rescheduleDate, setRescheduleDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [message, setMessage] = useState("");
  const appointmentDoctorId = appointment?.doctor.id;
  const appointmentStatus = appointment?.status;
  useEffect(() => { fetch(`/api/appointments/${id}`).then(async (r) => { const data = await r.json(); if (!r.ok) setError(data.error); else setAppointment(data.appointment); }); }, [id, reloadKey]);
  useEffect(() => {
    if (!appointmentDoctorId || appointmentStatus !== "SCHEDULED") return;
    setSelectedSlot("");
    fetch(`/api/doctors/${appointmentDoctorId}/availability?date=${rescheduleDate}`)
      .then((response) => response.json())
      .then((data) => setSlots(data.slots || []));
  }, [appointmentDoctorId, appointmentStatus, rescheduleDate]);

  async function reschedule() {
    if (!appointment || !selectedSlot) return;
    setRescheduling(true); setError(""); setMessage("");
    const response = await fetch(`/api/appointments/${id}/reschedule`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId: appointment.doctor.id, startTime: selectedSlot }),
    });
    const data = await response.json(); setRescheduling(false);
    if (!response.ok) { setError(data.error || "Unable to reschedule appointment"); return; }
    setMessage("Appointment rescheduled. Email and Calendar updates are queued.");
    setReloadKey((value) => value + 1);
  }
  if (error) return <div className="empty-state"><h3>Unable to open appointment</h3><p>{error}</p><Link className="button button-secondary" href="/patient">Back to dashboard</Link></div>;
  if (!appointment) return <div className="skeleton" />;
  const questions = appointment.suggestedQuestions ? JSON.parse(appointment.suggestedQuestions) as string[] : [];
  const post = appointment.postVisitSummary ? JSON.parse(appointment.postVisitSummary) as {summary:string; medicationSchedule:string; followUpSteps:string[]} : null;
  return <><Link href="/patient" className="back-link"><ArrowLeft size={18} /> Back to appointments</Link><div className="page-header"><div><p className="eyebrow">Appointment details</p><h1>Visit with Dr. {appointment.doctor.user.name}</h1><p>{format(new Date(appointment.startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}</p></div><StatusBadge value={appointment.status} /></div>{error && <div className="form-error" style={{marginBottom:18}}>{error}</div>}{message && <div className="form-success" style={{marginBottom:18}}>{message}</div>}
    <div className="detail-grid"><section className="panel"><div className="detail-section"><div className="panel-header"><div><h2>Before your visit</h2><p>What the doctor will see</p></div><StatusBadge value={appointment.urgency} /></div><p><strong>Your symptoms</strong></p><p>{appointment.symptoms}</p>{appointment.preVisitSummary && <div className="ai-summary"><p className="eyebrow"><BrainCircuit size={16} /> Prepared summary</p><p>{appointment.preVisitSummary}</p>{questions.length > 0 && <><strong>Questions the doctor may ask</strong><ol className="question-list">{questions.map((question) => <li key={question}>{question}</li>)}</ol></>}</div>}</div>
      <div className="detail-section"><h3>After your visit</h3>{post ? <><div className="ai-summary" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}><p>{post.summary}</p><strong>Medication schedule</strong><p>{post.medicationSchedule}</p><strong>Follow-up steps</strong><ul className="question-list">{post.followUpSteps.map((step) => <li key={step}>{step}</li>)}</ul></div>{appointment.medicationReminders.length > 0 && <div className="notice" style={{ marginTop: 15 }}><Pill size={18} style={{ verticalAlign: "text-bottom", marginRight: 8 }} /> Medication reminders are {appointment.medicationReminders.some((item) => item.active) ? "active" : "complete"}.</div>}</> : <div className="empty-state"><CheckCircle2 size={27} /><h3>Summary after the visit</h3><p>Your doctor’s plain-language notes and care plan will appear here once the visit is complete.</p></div>}</div></section>
      <aside className="panel"><div className="panel-header"><h3>Visit information</h3></div><div className="metadata-list"><div className="metadata-row"><span>Doctor</span><strong>Dr. {appointment.doctor.user.name}</strong></div><div className="metadata-row"><span>Specialty</span><strong>{appointment.doctor.specialization}</strong></div><div className="metadata-row"><span>Date</span><strong>{format(new Date(appointment.startTime), "MMM d, yyyy")}</strong></div><div className="metadata-row"><span>Time</span><strong>{format(new Date(appointment.startTime), "h:mm a")}</strong></div><div className="metadata-row"><span>Duration</span><strong>{Math.round((new Date(appointment.endTime).getTime()-new Date(appointment.startTime).getTime())/60000)} minutes</strong></div></div>{appointment.status === "SCHEDULED" && <div className="detail-section"><h3>Reschedule</h3><div className="field"><label htmlFor="reschedule-date">Choose another date</label><input id="reschedule-date" type="date" min={format(addDays(new Date(),1),"yyyy-MM-dd")} value={rescheduleDate} onChange={(event)=>setRescheduleDate(event.target.value)} /></div>{slots.length ? <div className="slot-grid" style={{gridTemplateColumns:"repeat(2, 1fr)", marginTop:12}}>{slots.slice(0,8).map((slot)=><button key={slot.startTime} className={`slot-button ${selectedSlot===slot.startTime?"selected":""}`} onClick={()=>setSelectedSlot(slot.startTime)}>{slot.label}</button>)}</div> : <p style={{color:"var(--muted)",fontSize:14,marginTop:12}}>No open times on this date.</p>}<button className="button button-primary" style={{width:"100%",marginTop:14}} onClick={reschedule} disabled={!selectedSlot||rescheduling}>{rescheduling?<><LoaderCircle size={17}/> Updating...</>:"Confirm new time"}</button></div>}<div className="summary-note"><CalendarDays size={20} /><p><strong>Calendar-ready</strong>Connect Google Calendar in Settings to keep changes synced.</p></div><Link href="/settings" className="button button-secondary" style={{ width: "100%", marginTop: 14 }}><Stethoscope size={17} /> Integration settings</Link></aside></div></>;
}
