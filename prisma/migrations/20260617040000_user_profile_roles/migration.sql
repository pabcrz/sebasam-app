-- Update app roles while preserving any existing coordinator profiles.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ADMIN_ASSISTANT', 'WORKER');

ALTER TABLE "UserProfile" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "UserProfile"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (
    CASE
      WHEN "role"::text = 'COORDINATOR' THEN 'ADMIN_ASSISTANT'
      ELSE "role"::text
    END
  )::"UserRole";
ALTER TABLE "UserProfile" ALTER COLUMN "role" SET DEFAULT 'WORKER';

DROP TYPE "UserRole_old";

CREATE TYPE "WorkerKind" AS ENUM ('MASTER', 'HELPER');

ALTER TABLE "UserProfile" ADD COLUMN "username" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "workerKind" "WorkerKind";

UPDATE "UserProfile"
SET "username" = COALESCE(NULLIF(split_part("email", '@', 1), ''), "id"::text)
WHERE "username" IS NULL;

ALTER TABLE "UserProfile" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");
