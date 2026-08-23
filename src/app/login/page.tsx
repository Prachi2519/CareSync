"use client";

import { ArrowRight, LoaderCircle, ShieldCheck, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Brand } from "@/components/Brand";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function fillDemoCredentials(role: "admin" | "doctor") {
    setEmail(role === "admin" ? "mgupta810722@gmail.com" : "mgupta810722+doctor@gmail.com");
    setPassword("Demo@123");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to sign in"); setLoading(false); return; }
    const target = params?.get("next");
    router.push(target || `/${String(body.user.role).toLowerCase()}`); router.refresh();
  }

  return (
    <div className="auth-card">
      <h2>Welcome back</h2><p>Sign in to continue to your CareSync portal.</p>
      <form className="form-stack" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        <button className="button button-primary" disabled={loading}>{loading ? <><LoaderCircle size={18} className="spin" /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}</button>
      </form>
      <div className="demo-access" aria-label="Demo portal access">
        <div className="demo-access-heading"><span>Explore the product</span><small>Prefill a secure demo account</small></div>
        <div className="demo-access-grid">
          <button type="button" className="demo-role" onClick={() => fillDemoCredentials("admin")}><ShieldCheck size={19} aria-hidden="true" /><span><strong>Admin portal</strong><small>Clinic operations</small></span><ArrowRight size={16} aria-hidden="true" /></button>
          <button type="button" className="demo-role" onClick={() => fillDemoCredentials("doctor")}><Stethoscope size={19} aria-hidden="true" /><span><strong>Doctor portal</strong><small>Clinical workspace</small></span><ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <p className="auth-switch">New to CareSync? <Link href="/register">Create a patient account</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page" id="main-content">
      <aside className="auth-aside"><Brand /><div className="auth-message"><p className="eyebrow">Welcome back</p><h1>Your care, right where you left it.</h1><p>Appointments, summaries, and reminders stay together so the next step is always clear.</p></div><div className="auth-quote"><p>“Good care starts with clear communication before, during, and after every visit.”</p><small>The CareSync principle</small></div></aside>
      <section className="auth-main"><Suspense><LoginForm /></Suspense></section>
    </main>
  );
}
