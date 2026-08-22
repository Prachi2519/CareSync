import { BookingFlow } from "@/components/patient/BookingFlow";
export default async function BookPage({ params }: { params: Promise<{ doctorId: string }> }) { const { doctorId } = await params; return <BookingFlow doctorId={doctorId} />; }
