-- Ta bort och återskapa enum-typen
DROP TYPE IF EXISTS "pdf_annotation_status" CASCADE;
CREATE TYPE "pdf_annotation_status" AS ENUM('new_comment', 'action_required', 'rejected', 'new_review', 'other_forum', 'resolved');

-- Återskapa status-kolumnen med rätt enum-typ
ALTER TABLE "pdf_annotations" ADD COLUMN "status" "pdf_annotation_status" NOT NULL DEFAULT 'new_comment';