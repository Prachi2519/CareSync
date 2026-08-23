"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Brand } from "@/components/Brand";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="Your password" /></div>
        <button className="button button-primary" disabled={loading}>{loading ? <><LoaderCircle size={18} className="spin" /> Signing in...</> : <>Sign in <ArrowRight size={18} /></>}</button>
      </form>
      <p className="auth-switch">New to CareSync? <Link href="/register">Create a patient account</Link></p>
      <div className="demo-box"><strong>Demo access</strong><br />Patient: patient@caresync.dev<br />Doctor: prachi639220+doctor@gmail.com<br />Admin: prachi639220@gmail.com<br />Password for all: <strong>Demo@123</strong></div>
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
