"use client";

import { addDays, format, startOfDay } from "date-fns";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Doctor = { id: string; specialization: string; qualifications: string; yearsExperience: number; slotDurationMinutes: number; user: { name: string } };
type Slot = { startTime: string; endTime: string; label: string };

export function BookingFlow({ doctorId }: { doctorId: string }) {
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index + 1)), []);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState(format(dates[0], "yyyy-MM-dd"));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [step, setStep] = useState(1);
  const [hold, setHold] = useState<{ token: string; expiresAt: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<{ id: string; urgency: string; startTime: string } | null>(null);

  useEffect(() => { fetch(`/api/doctors/${doctorId}`).then((r) => r.json()).then((data) => setDoctor(data.doctor)); }, [doctorId]);
  useEffect(() => {
    setSelected(null); setSlots([]);
    fetch(`/api/doctors/${doctorId}/availability?date=${date}`).then((r) => r.json()).then((data) => setSlots(data.slots || []));
  }, [doctorId, date]);
  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(seconds);
      if (!seconds) { setError("Your slot hold expired. Please choose the time again."); setHold(null); setStep(1); }
    };
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [hold]);

  async function continueToSymptoms() {
    if (!selected) return; setLoading(true); setError("");
    const response = await fetch("/api/slots/hold", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId, startTime: selected.startTime }) });
    const body = await response.json(); setLoading(false);
    if (!response.ok) { setError(body.error || "Unable to reserve slot"); return; }
    setHold({ token: body.holdToken, expiresAt: body.expiresAt }); setStep(2);
  }
  async function confirmBooking() {
    if (!hold) return; setLoading(true); setError("");
    const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holdToken: hold.token, symptoms }) });
    const body = await response.json(); setLoading(false);
    if (!response.ok) { setError(body.error || "Unable to book appointment"); return; }
    setConfirmation({ id: body.appointment.id, urgency: body.appointment.urgency, startTime: body.appointment.startTime }); setStep(3); setHold(null);
  }

  return <div className="booking-shell">
    <Link href="/patient" className="back-link"><ArrowLeft size={18} /> Back to doctors</Link>
    <div className="page-header"><div><p className="eyebrow">Book appointment</p><h1>{step === 3 ? "You’re all set." : "Choose your visit."}</h1><p>{step === 1 ? "Select a date and an available time." : step === 2 ? "Help your doctor prepare for the visit." : "Your appointment and notifications are confirmed."}</p></div></div>
    <div className="booking-grid">
      <section className="booking-card">
        <div className="booking-steps" aria-label={`Step ${step} of 3`}>{[1,2,3].map((value) => <span key={value} className={`booking-step ${step >= value ? "active" : ""}`} />)}</div>
        {error && <div className="form-error" role="alert" style={{ marginBottom: 18 }}>{error}</div>}
        {step === 1 && <><h2 style={{ fontSize: 26 }}>Select date and time</h2><div className="date-strip">{dates.map((item) => { const value = format(item, "yyyy-MM-dd"); return <button key={value} className={`date-button ${date === value ? "selected" : ""}`} onClick={() => setDate(value)}><span>{format(item, "EEE")}</span><strong>{format(item, "d")}</strong><span>{format(item, "MMM")}</span></button>; })}</div>
          <p className="field-label">Available times</p>{slots.length ? <div className="slot-grid">{slots.map((slot) => <button key={slot.startTime} onClick={() => setSelected(slot)} className={`slot-button ${selected?.startTime === slot.startTime ? "selected" : ""}`}>{slot.label}</button>)}</div> : <div className="empty-state"><Clock3 size={26} /><h3>No slots this day</h3><p>Choose another date to continue.</p></div>}
          <div className="booking-footer"><span /><button className="button button-primary" disabled={!selected || loading} onClick={continueToSymptoms}>{loading ? <LoaderCircle size={18} /> : <>Continue <ArrowRight size={18} /></>}</button></div></>}
        {step === 2 && <><div className="panel-header"><div><h2>Tell us what’s happening</h2><p>Your description will be summarized for the doctor, not used as a diagnosis.</p></div>{hold && <span className="hold-timer"><Clock3 size={16} /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2,"0")}</span>}</div>
          <div className="field"><label htmlFor="symptoms">Symptoms and concerns</label><textarea id="symptoms" value={symptoms} onChange={(event) => setSymptoms(event.target.value)} minLength={10} maxLength={3000} placeholder="Describe when the symptoms started, how they feel, what makes them better or worse, and any relevant medication or allergies." /><small>{symptoms.length}/3000 characters</small></div>
          <div className="symptom-tips"><strong>Helpful details:</strong> timing, severity, triggers, current medicines, allergies, and relevant medical history.</div>
          <div className="inline-alert" style={{ marginTop: 14 }}><AlertTriangle size={20} /><p>CareSync is not an emergency service. For chest pain, severe breathing trouble, stroke signs, heavy bleeding, or immediate danger, contact local emergency services now.</p></div>
          <div className="booking-footer"><button className="button button-ghost" onClick={() => { setStep(1); setHold(null); }}>Choose another time</button><button className="button button-primary" onClick={confirmBooking} disabled={symptoms.trim().length < 10 || loading}>{loading ? <><LoaderCircle size={18} /> Preparing…</> : <>Confirm appointment <Check size={18} /></>}</button></div></>}
        {step === 3 && confirmation && <div className="confirmation"><span className="confirmation-icon"><Check size={34} /></span><h2>Appointment confirmed</h2><p>We’ve queued email and calendar updates for you and your doctor.</p><div className="confirmation-details"><strong>{format(new Date(confirmation.startTime), "EEEE, MMMM d, yyyy")}</strong><br />{format(new Date(confirmation.startTime), "h:mm a")} with Dr. {doctor?.user.name}<br /><span className={`status-badge status-${confirmation.urgency.toLowerCase()}`} style={{ marginTop: 10 }}>{confirmation.urgency} triage priority</span></div><div className="hero-actions" style={{ justifyContent: "center", marginBottom: 0 }}><Link href={`/patient/appointments/${confirmation.id}`} className="button button-primary">View appointment</Link><Link href="/patient" className="button button-secondary">Back to dashboard</Link></div></div>}
      </section>
      {doctor && <aside className="doctor-summary"><span className="doctor-avatar">{doctor.user.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</span><h3>Dr. {doctor.user.name}</h3><p>{doctor.specialization}</p><div className="summary-row"><span>Qualification</span><strong>{doctor.qualifications}</strong></div><div className="summary-row"><span>Experience</span><strong>{doctor.yearsExperience} years</strong></div><div className="summary-row"><span>Visit length</span><strong>{doctor.slotDurationMinutes} minutes</strong></div><div className="summary-note"><ShieldCheck size={20} /><p><strong>Protected slot</strong>Your chosen time is held for five minutes while you finish.</p></div></aside>}
    </div>
  </div>;
}
