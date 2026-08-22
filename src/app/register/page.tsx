"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Brand } from "@/components/Brand";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.get("name"), email: data.get("email"), phone: data.get("phone"), password: data.get("password") }),
    });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Unable to create account"); setLoading(false); return; }
    router.push("/patient"); router.refresh();
  }
  return (
    <main className="auth-page" id="main-content">
      <aside className="auth-aside"><Brand /><div className="auth-message"><p className="eyebrow">Start with clarity</p><h1>Better prepared for every appointment.</h1><p>Share symptoms ahead of time, see your care plan clearly, and never miss an important follow-up.</p></div><div className="auth-quote"><p>Your account is always created as a patient. Clinic roles are managed securely by an administrator.</p><small>Role-based access by design</small></div></aside>
      <section className="auth-main"><div className="auth-card"><h2>Create your account</h2><p>It only takes a minute to get started.</p>
        <form className="form-stack" onSubmit={submit}>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required minLength={2} placeholder="Your full name" /></div>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div>
          <div className="field"><label htmlFor="phone">Phone number <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" /></div>
          <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" /><small>Use a unique password with at least 8 characters.</small></div>
          <button className="button button-primary" disabled={loading}>{loading ? <><LoaderCircle size={18} /> Creating account...</> : <>Create account <ArrowRight size={18} /></>}</button>
        </form>
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </div></section>
    </main>
  );
}
