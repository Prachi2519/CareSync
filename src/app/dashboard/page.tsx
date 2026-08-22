import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
export default async function DashboardRedirect() { const session = await getSession(); redirect(session ? `/${session.role.toLowerCase()}` : "/login"); }
