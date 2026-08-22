import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PortalShell } from "@/components/PortalShell";

export async function PortalGuard({ role, children }: { role: Role; children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect(`/login?next=/${role.toLowerCase()}`);
  if (session.role !== role) redirect(`/${session.role.toLowerCase()}`);
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  return <PortalShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</PortalShell>;
}
