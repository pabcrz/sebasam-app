CREATE TYPE "PayableNoteKind" AS ENUM ('WORK', 'SALE');

ALTER TABLE "PayableNote"
  ADD COLUMN "kind" "PayableNoteKind" NOT NULL DEFAULT 'WORK';
