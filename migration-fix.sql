-- Ta bort default-värde för status
ALTER TABLE pdf_annotations ALTER COLUMN status DROP DEFAULT;

-- Byt typ på kolumnen från pdf_annotation_status_new till pdf_annotation_status
ALTER TABLE pdf_annotations 
  ALTER COLUMN status TYPE text;

-- Ta bort temporär enum-typ
DROP TYPE IF EXISTS pdf_annotation_status_new;

-- Sätt standardvärde för nya inlägg
ALTER TABLE pdf_annotations 
  ALTER COLUMN status SET DEFAULT 'new_comment'::text;

-- Uppdatera alla NULL-värden till standardvärdet
UPDATE pdf_annotations 
  SET status = 'new_comment'
  WHERE status IS NULL;

-- Uppdatera eventuella befintliga värden till nya giltiga stringer
UPDATE pdf_annotations
  SET status = 'new_comment'
  WHERE status = 'open';

UPDATE pdf_annotations
  SET status = 'new_review'
  WHERE status = 'reviewing';

-- Ändra slutligen kolumnen till rätt enum-typ
ALTER TABLE pdf_annotations 
  ALTER COLUMN status TYPE pdf_annotation_status USING status::pdf_annotation_status;

-- Sätt default-värde igen
ALTER TABLE pdf_annotations 
  ALTER COLUMN status SET DEFAULT 'new_comment'::pdf_annotation_status;