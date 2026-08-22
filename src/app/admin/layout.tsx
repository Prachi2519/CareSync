import { ReactNode } from "react";
import { PortalGuard } from "@/components/PortalGuard";
export default function AdminLayout({ children }: { children: ReactNode }) { return <PortalGuard role="ADMIN">{children}</PortalGuard>; }
