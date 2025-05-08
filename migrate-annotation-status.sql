-- Skapa temporär kolumn
ALTER TABLE "pdf_annotations" ADD COLUMN "temp_status" text;

-- Kopiera värden från status till temp_status
UPDATE "pdf_annotations" SET "temp_status" = "status"::text;

-- Radera constraint och enum-typ
ALTER TABLE "pdf_annotations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "pdf_annotations" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "pdf_annotations" DROP COLUMN "status";

-- Skapa ny enum-typ
DROP TYPE IF EXISTS "pdf_annotation_status_new";
CREATE TYPE "pdf_annotation_status_new" AS ENUM('new_comment', 'action_required', 'rejected', 'new_review', 'other_forum', 'resolved');

-- Mappa gamla statusvärden till nya
CREATE OR REPLACE FUNCTION map_status(old_status text)
RETURNS "pdf_annotation_status_new" AS $$
BEGIN
    CASE old_status
        WHEN 'open' THEN RETURN 'new_comment'::pdf_annotation_status_new;
        WHEN 'action_required' THEN RETURN 'action_required'::pdf_annotation_status_new;
        WHEN 'reviewing' THEN RETURN 'new_review'::pdf_annotation_status_new;
        WHEN 'resolved' THEN RETURN 'resolved'::pdf_annotation_status_new;
        ELSE RETURN 'new_comment'::pdf_annotation_status_new;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Lägg till ny status-kolumn med korrekt typ
ALTER TABLE "pdf_annotations" ADD COLUMN "status" "pdf_annotation_status_new";

-- Konvertera värden från temp_status till status med mappning
UPDATE "pdf_annotations" SET "status" = map_status(temp_status);

-- Sätt kolumnen att vara NOT NULL med default-värde
ALTER TABLE "pdf_annotations" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "pdf_annotations" ALTER COLUMN "status" SET DEFAULT 'new_comment'::pdf_annotation_status_new;

-- Ta bort temporära funktioner och kolumner
DROP FUNCTION IF EXISTS map_status;
ALTER TABLE "pdf_annotations" DROP COLUMN "temp_status";

-- Byt namn på enum-typen till det ursprungliga
ALTER TYPE "pdf_annotation_status_new" RENAME TO "pdf_annotation_status";