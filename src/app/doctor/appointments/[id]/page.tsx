import { DoctorAppointmentDetail } from "@/components/doctor/DoctorAppointmentDetail";
export default async function DoctorAppointmentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <DoctorAppointmentDetail id={id} />; }
