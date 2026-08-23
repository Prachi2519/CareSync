"use client";

import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, BrainCircuit, Check, ClipboardPlus, LoaderCircle, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrescription } from "@/lib/prescription";

type Appointment = { id:string; startTime:string; endTime:string; status:string; symptoms:string; preVisitSummary?:string; urgency:string; suggestedQuestions?:string; postVisitNotes?:string; prescription?:string; postVisitSummary?:string; patient:{name:string;email:string;phone?:string}; doctor:{specialization:string;user:{name:string}} };

export function DoctorAppointmentDetail({ id }: { id: string }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [loading, setLoading] = useState(false);
  async function load() { const response = await fetch(`/api/appointments/${id}`); const data = await response.json(); if (!response.ok) setError(data.error); else setAppointment(data.appointment); }
  useEffect(() => {
    async function fetchAppointment() {
      const response = await fetch(`/api/appointments/${id}`);
      const data = await response.json();
      if (!response.ok) setError(data.error);
      else setAppointment(data.appointment);
    }
    void fetchAppointment();
  }, [id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setSuccess(""); const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/appointments/${id}/notes`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ notes:data.get("notes"), medication:data.get("medication") || undefined, dosage:data.get("dosage") || undefined, instructions:data.get("instructions") || undefined, frequencyPerDay:data.get("frequencyPerDay") || undefined, durationDays:data.get("durationDays") || undefined }) });
    const body = await response.json(); setLoading(false); if (!response.ok) { setError(body.error || "Unable to save visit notes"); return; } setSuccess(`Visit completed. The patient summary was prepared using the ${body.summarySource === "llm" ? "configured LLM" : "safe fallback"}.`); await load();
  }
  if (!appointment) return error ? <div className="form-error">{error}</div> : <div className="skeleton" />;
  const questions = appointment.suggestedQuestions ? JSON.parse(appointment.suggestedQuestions) as string[] : [];
  return <><Link href="/doctor" className="back-link"><ArrowLeft size={18} /> Back to schedule</Link><div className="page-header"><div><p className="eyebrow">Visit workspace</p><h1>{appointment.patient.name}</h1><p>{format(new Date(appointment.startTime), "EEEE, MMMM d 'at' h:mm a")}</p></div><div className="toolbar"><StatusBadge value={appointment.urgency} /><StatusBadge value={appointment.status} /></div></div>
    {(appointment.urgency === "HIGH") && <div className="inline-alert" style={{ marginBottom:20, color:"#8d2925", background:"#ffebe9" }}><AlertTriangle size={21} /><p><strong>High-priority symptoms.</strong> Review immediately and follow your clinic’s emergency escalation protocol. The AI summary is not a diagnosis.</p></div>}
    {error && <div className="form-error" role="alert" style={{marginBottom:18}}>{error}</div>}{success && <div className="form-success" role="status" style={{marginBottom:18}}>{success}</div>}
    <div className="detail-grid"><section className="panel"><div className="detail-section"><div className="panel-header"><div><h2>Pre-visit brief</h2><p>Patient-submitted context</p></div><BrainCircuit size={23} color="var(--primary)" /></div><div className="ai-summary"><p className="eyebrow">Chief concern</p><p>{appointment.preVisitSummary || appointment.symptoms}</p>{questions.length > 0 && <><strong>Suggested questions</strong><ol className="question-list">{questions.map((q) => <li key={q}>{q}</li>)}</ol></>}</div><div style={{marginTop:18}}><strong>Original symptom description</strong><p style={{margin:"7px 0 0", color:"var(--muted)"}}>{appointment.symptoms}</p></div></div>
      <div className="detail-section"><div className="panel-header"><div><h2>Clinical notes & care plan</h2><p>The patient receives a plain-language summary after completion</p></div><ClipboardPlus size={23} color="var(--accent)" /></div>
        {appointment.status === "COMPLETED" ? <div className="completed-care-plan"><div className="form-success"><Check size={18} style={{verticalAlign:"text-bottom",marginRight:7}} />This visit is complete and the follow-up summary has been shared.</div>{appointment.postVisitNotes && <div><strong>Clinical notes</strong><p>{appointment.postVisitNotes}</p></div>}{appointment.prescription && <div><strong>Prescription</strong><p>{formatPrescription(appointment.prescription)}</p></div>}</div> : <form className="form-stack" onSubmit={submit}><div className="field"><label htmlFor="notes">Clinical notes</label><textarea id="notes" name="notes" required minLength={10} maxLength={5000} placeholder="Assessment, discussion, care instructions, warning signs, and follow-up plan..." /></div><div className="prescription-grid"><div className="field"><label htmlFor="medication">Medication <span style={{fontWeight:400,color:"var(--muted)"}}>(optional)</span></label><input id="medication" name="medication" maxLength={160} placeholder="e.g. Amoxicillin" /></div><div className="field"><label htmlFor="dosage">Dosage</label><input id="dosage" name="dosage" maxLength={160} placeholder="e.g. 500 mg" /></div><div className="field"><label htmlFor="frequencyPerDay">Times per day</label><select id="frequencyPerDay" name="frequencyPerDay" defaultValue="1">{[1,2,3,4].map((n)=><option key={n} value={n}>{n}</option>)}</select></div><div className="field"><label htmlFor="durationDays">Duration (days)</label><input id="durationDays" name="durationDays" type="number" min="1" max="365" defaultValue="7" /></div></div><div className="field"><label htmlFor="instructions">Medication instructions</label><textarea id="instructions" name="instructions" maxLength={500} style={{minHeight:85}} placeholder="e.g. Take after food. Stop and contact the clinic if a rash develops." /></div><button className="button button-accent" disabled={loading}>{loading ? <><LoaderCircle size={18} /> Preparing summary...</> : <><Check size={18} /> Complete visit & share summary</>}</button></form>}
      </div></section>
      <aside className="panel"><div className="panel-header"><h3>Patient details</h3></div><div className="metadata-list"><div className="metadata-row"><span><UserRound size={16} style={{verticalAlign:"text-bottom"}} /> Patient</span><strong>{appointment.patient.name}</strong></div><div className="metadata-row"><span>Email</span><strong>{appointment.patient.email}</strong></div><div className="metadata-row"><span><Phone size={15} style={{verticalAlign:"text-bottom"}} /> Phone</span><strong>{appointment.patient.phone || "Not provided"}</strong></div><div className="metadata-row"><span>Appointment</span><strong>{format(new Date(appointment.startTime), "h:mm a")}–{format(new Date(appointment.endTime), "h:mm a")}</strong></div></div><div className="notice" style={{marginTop:18}}>AI-generated content is a drafting aid. Review every summary before completing the visit.</div></aside></div>
  </>;
}
