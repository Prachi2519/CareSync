"use client";

import {
  CalendarDays,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  Settings,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Brand } from "@/components/Brand";

type ShellUser = { name: string; email: string; role: "PATIENT" | "DOCTOR" | "ADMIN" };

const navigation = {
  PATIENT: [
    { href: "/patient", label: "Overview", icon: LayoutDashboard },
    { href: "/patient#doctors", label: "Find a doctor", icon: Stethoscope },
    { href: "/patient#appointments", label: "Appointments", icon: CalendarDays },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  DOCTOR: [
    { href: "/doctor", label: "Today", icon: LayoutDashboard },
    { href: "/doctor#schedule", label: "Appointments", icon: CalendarDays },
    { href: "/doctor#patients", label: "Patients", icon: UsersRound },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin#doctors", label: "Doctors", icon: UsersRound },
    { href: "/admin#add-doctor", label: "Add doctor", icon: ClipboardPlus },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
} as const;

export function PortalShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [hash, setHash] = useState("");
  const nav = navigation[user.role];
  const isFocusedWorkflow =
    pathname.startsWith("/patient/book/") ||
    pathname.startsWith("/patient/appointments/") ||
    pathname.startsWith("/doctor/appointments/");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  function isActive(href: string) {
    const [itemPath, itemHash] = href.split("#");
    if (itemPath !== pathname) return false;
    if (itemHash) return hash === `#${itemHash}`;
    return !hash;
  }

  function handlePortalNavigation(href: string) {
    const itemHash = href.includes("#") ? `#${href.split("#")[1]}` : "";
    setHash(itemHash);
    window.dispatchEvent(new CustomEvent("caresync:navigate", { detail: { hash: itemHash } }));
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><Brand /></div>
        <nav className="sidebar-nav" aria-label={`${user.role.toLowerCase()} portal navigation`}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.label} href={item.href} onClick={() => handlePortalNavigation(item.href)} className={`sidebar-link ${active ? "active" : ""}`}>
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="sidebar-user-copy"><strong>{user.name}</strong><small>{user.email}</small></span>
          <button className="icon-button" onClick={logout} disabled={loggingOut} aria-label="Sign out">
            <LogOut size={19} />
          </button>
        </div>
      </aside>
      <div className={`portal-content ${isFocusedWorkflow ? "portal-focus-mode" : ""}`}>
        <header className="mobile-portal-header">
          <Brand />
          <div className="mobile-header-actions">
            <span className="avatar" aria-label={`Signed in as ${user.name}`}>{user.name.slice(0, 1).toUpperCase()}</span>
            <button className="icon-button" onClick={logout} disabled={loggingOut} aria-label="Sign out">
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main className="portal-main" id="main-content">{children}</main>
        {!isFocusedWorkflow && <nav className="mobile-nav" aria-label="Mobile portal navigation">
          {nav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.label} href={item.href} onClick={() => handlePortalNavigation(item.href)} className={active ? "active" : ""}>
                <Icon size={20} aria-hidden="true" /><span>{item.label}</span>
              </Link>
            );
          })}
        </nav>}
      </div>
    </div>
  );
}
