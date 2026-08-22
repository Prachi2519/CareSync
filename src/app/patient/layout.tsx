import { ReactNode } from "react";
import { PortalGuard } from "@/components/PortalGuard";
export default function PatientLayout({ children }: { children: ReactNode }) { return <PortalGuard role="PATIENT">{children}</PortalGuard>; }
