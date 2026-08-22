import { ReactNode } from "react";
import { PortalGuard } from "@/components/PortalGuard";
export default function DoctorLayout({ children }: { children: ReactNode }) { return <PortalGuard role="DOCTOR">{children}</PortalGuard>; }
