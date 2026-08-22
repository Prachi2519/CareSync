# CareSync system design

CareSync is a Next.js application with REST route handlers, a Prisma data layer, and role-scoped portals. Users authenticate with a signed, HTTP-only session cookie. Every server mutation checks the session and role again; hiding a button in the UI is never treated as authorization.

## Double-booking prevention and slot holds

Availability is derived from a doctor’s weekly hours, slot duration, leave dates, and active slot rows. Selecting a time calls `POST /api/slots/hold`, which creates an `AppointmentSlot` with a five-minute expiry. The database has a unique constraint on `(doctorId, startTime)`, so two simultaneous requests cannot hold the same time. The API converts the losing unique-constraint error into an HTTP 409 with a useful message.

Booking runs in a database transaction. It re-reads the hold, verifies its token, patient, status, and expiry, creates the appointment, changes the slot from `HELD` to `BOOKED`, and creates notification outbox jobs. A crash cannot leave an appointment without its required notification work. Expired holds are ignored by availability and safely replaced when a later patient requests the time. Cancellation detaches and deletes the slot so it becomes bookable again. Rescheduling first acquires the new unique slot within a transaction, updates the appointment, and only then releases the old slot; failure rolls the entire change back.

## Doctor leave conflicts

Leave is unique per doctor and calendar date. Adding leave and finding affected scheduled appointments happen in one transaction. Each affected visit is cancelled, its active slot is released, and email plus Calendar deletion jobs are written for the patient and doctor. This favors a clear cancellation over silently moving a patient. The admin receives the number of affected visits and can coordinate rebooking. Availability checks leave again during slot acquisition, preventing a race between viewing a time and confirming it.

## LLM safety and failure handling

Symptoms and post-visit notes use narrow JSON prompts. Pre-visit output is explicitly non-diagnostic and limited to urgency, a chief complaint, and three suggested questions. Post-visit output may clarify only the clinician’s supplied notes. Calls have a 15-second timeout and strict shape checks. Any timeout, provider error, malformed JSON, or missing API key activates a deterministic fallback. Emergency phrases are escalated even without an LLM, and the UI tells users to contact emergency services. Both generated summaries and the source clinical text are stored, so clinicians retain context.

## Notification reliability

Email and Google Calendar changes use an outbox table instead of being sent inside the web request. A cron endpoint claims due jobs, processes them, and records attempts, errors, and completion. Failed work retries with capped exponential backoff. Claims use a conditional update, limiting duplicate work when workers overlap; jobs stuck in `PROCESSING` for 15 minutes are recovered. Calendar event IDs are stored per appointment and user, making create, update, and delete idempotent. Missing Calendar connections are treated as an optional integration rather than a booking failure.

The same worker creates 24-hour appointment reminders and expands medication plans into due messages. Medication reminders advance from the prescribed frequency until the end date, then deactivate. In production, protect the cron endpoint with a separate secret, run it every five minutes, use a managed PostgreSQL database with connection pooling, and monitor permanently failed jobs.
