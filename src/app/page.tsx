import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { Brand } from "@/components/Brand";

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main id="main-content">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><span className="eyebrow-dot" />Care that keeps moving</p>
              <h1>Healthcare appointments, without the loose ends.</h1>
              <p>Find the right doctor, share what matters before your visit, and keep every follow-up in one calm, connected place.</p>
              <div className="hero-actions">
                <Link href="/register" className="button button-primary">Book an appointment <ArrowRight size={18} /></Link>
                <Link href="/login" className="button button-secondary">Sign in to your portal</Link>
              </div>
              <div className="trust-row">
                <span><ShieldCheck size={17} />Role-based access</span>
                <span><CalendarCheck2 size={17} />Calendar sync</span>
                <span><BellRing size={17} />Timely reminders</span>
              </div>
            </div>
            <div className="hero-panel" aria-label="Appointment preview">
              <div className="hero-panel-top">
                <div><h3>Your care plan</h3><p>Everything on track this week</p></div>
                <span className="availability-chip">All synced</span>
              </div>
              <div className="mini-appointment">
                <div className="mini-date"><span>AUG</span><strong>24</strong></div>
                <div className="mini-copy"><strong>Dr. Ananya Mehta</strong><small>General Medicine</small></div>
                <span className="mini-time">10:30 AM</span>
              </div>
              <div className="mini-appointment">
                <div className="mini-date"><span>AUG</span><strong>29</strong></div>
                <div className="mini-copy"><strong>Follow-up check-in</strong><small>Medication review</small></div>
                <span className="mini-time">4:00 PM</span>
              </div>
              <div className="summary-note">
                <BrainCircuit size={21} aria-hidden="true" />
                <p><strong>Prepared before you arrive</strong>Your symptoms are organized into a concise summary for the doctor.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-white" id="for-clinics">
          <div className="container">
            <div className="section-heading center">
              <p className="eyebrow">One connected workflow</p>
              <h2>Less coordination. More time for care.</h2>
              <p>CareSync connects preparation, appointments, and follow-up without making the experience feel clinical or complicated.</p>
            </div>
            <div className="outcome-list">
              <article className="outcome-row">
                <span className="outcome-number">01</span>
                <CalendarClock size={22} aria-hidden="true" />
                <h3>Book with confidence</h3>
                <p>See real availability, reserve a slot safely, and receive confirmation without double-booking surprises.</p>
              </article>
              <article className="outcome-row">
                <span className="outcome-number">02</span>
                <BrainCircuit size={22} aria-hidden="true" />
                <h3>Arrive prepared</h3>
                <p>A concise, non-diagnostic symptom summary helps the doctor understand the concern before the visit begins.</p>
              </article>
              <article className="outcome-row">
                <span className="outcome-number">03</span>
                <ClipboardCheck size={22} aria-hidden="true" />
                <h3>Know what comes next</h3>
                <p>Patient-friendly visit notes, medication schedules, and follow-up reminders keep care plans understandable.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="container">
            <div className="section-heading"><p className="eyebrow">Simple by design</p><h2>From symptoms to follow-up in four clear steps.</h2></div>
            <div className="steps">
              <div className="step"><h3>Find your doctor</h3><p>Search by specialty and choose a time that works.</p></div>
              <div className="step"><h3>Share your symptoms</h3><p>Tell the doctor what is happening before you arrive.</p></div>
              <div className="step"><h3>Attend your visit</h3><p>Both calendars and inboxes stay aligned automatically.</p></div>
              <div className="step"><h3>Follow your care plan</h3><p>Review plain-language notes and medication reminders.</p></div>
            </div>
          </div>
        </section>

        <section className="section section-white">
          <div className="container">
            <div className="section-heading center"><p className="eyebrow">Built for the whole clinic</p><h2>One platform, three focused portals.</h2></div>
            <div className="role-grid">
              <article className="role-card"><span className="role-label"><UserRoundCheck size={20} />Patient</span><h3>Care without the coordination burden.</h3><ul><li>Doctor discovery and live slots</li><li>Visit and medication summaries</li><li>Email and calendar updates</li></ul></article>
              <article className="role-card"><span className="role-label"><Stethoscope size={20} />Doctor</span><h3>Context before the consultation starts.</h3><ul><li>Urgency-aware visit preparation</li><li>Structured clinical notes</li><li>Fast, clear follow-up plans</li></ul></article>
              <article className="role-card"><span className="role-label"><LockKeyhole size={20} />Administrator</span><h3>One operational view of the clinic.</h3><ul><li>Doctor schedules and profiles</li><li>Leave conflict handling</li><li>Reliable notification delivery</li></ul></article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta-panel">
              <div><h2>Ready for a calmer care journey?</h2><p>Create your patient account and book your first appointment.</p></div>
              <Link href="/register" className="button button-accent">Create free account <ArrowRight size={18} /></Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><Brand /><span>© 2026 CareSync. Built for thoughtful healthcare coordination.</span><span><CheckCircle2 size={15} style={{ verticalAlign: "text-bottom" }} /> Secure by design</span></div></footer>
    </>
  );
}
