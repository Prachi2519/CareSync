import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  processNotificationJobs: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/job-worker", () => ({ processNotificationJobs: mocks.processNotificationJobs }));

import { queueLifecycleJobs } from "@/lib/jobs";

describe("lifecycle notification delivery", () => {
  beforeEach(() => {
    mocks.after.mockReset();
    mocks.processNotificationJobs.mockReset();
    mocks.after.mockImplementation((callback: () => unknown) => callback());
  });

  it("schedules immediate targeted delivery after queueing an appointment lifecycle event", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 4 });
    const tx = { notificationJob: { createMany } };

    await queueLifecycleJobs(tx as never, {
      id: "appointment-123",
      startTime: new Date("2026-08-25T10:00:00.000Z"),
      endTime: new Date("2026-08-25T10:30:00.000Z"),
      patient: { id: "patient-1", name: "Riya Sharma", email: "patient@example.com" },
      doctor: {
        specialization: "General Medicine",
        user: { id: "doctor-1", name: "Ananya Mehta", email: "doctor@example.com" },
      },
    }, "BOOKING");

    expect(createMany).toHaveBeenCalledOnce();
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.processNotificationJobs).toHaveBeenCalledWith(10, "appointment-123");
  });
});
