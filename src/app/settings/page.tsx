import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PortalShell } from "@/components/PortalShell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const session=await getSession(); if(!session) redirect("/login"); const user=await db.user.findUnique({where:{id:session.userId}}); if(!user) redirect("/login");
  return <PortalShell user={{name:user.name,email:user.email,role:user.role}}><SettingsPanel user={{name:user.name,email:user.email,phone:user.phone,role:user.role}}/></PortalShell>;
}
