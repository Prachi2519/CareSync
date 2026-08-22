import Link from "next/link";
import { Brand } from "@/components/Brand";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Main navigation" className="public-nav">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#for-clinics">For clinics</Link>
        </nav>
        <div className="header-actions">
          <Link href="/login" className="button button-ghost">Sign in</Link>
          <Link href="/register" className="button button-primary">Get started</Link>
        </div>
      </div>
    </header>
  );
}
