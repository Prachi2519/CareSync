import { PatientAppointmentDetail } from "@/components/patient/PatientAppointmentDetail";
export default async function PatientAppointmentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PatientAppointmentDetail id={id} />; }
