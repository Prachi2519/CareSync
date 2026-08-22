import { HeartPulse } from "lucide-react";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="CareSync home">
      <span className="brand-mark" aria-hidden="true"><HeartPulse size={22} strokeWidth={2.5} /></span>
      {!compact && <span>CareSync</span>}
    </Link>
  );
}
