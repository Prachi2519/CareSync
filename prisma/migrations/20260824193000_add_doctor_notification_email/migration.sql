ALTER TABLE "DoctorProfile" ADD COLUMN "notificationEmail" TEXT;

UPDATE "DoctorProfile"
SET "notificationEmail" = 'mgupta810722@gmail.com';
