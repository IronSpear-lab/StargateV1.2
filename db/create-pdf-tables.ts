import { pool } from ".";

async function createPdfTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Skapa enum för PDF annotation status
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pdf_annotation_status') THEN
          CREATE TYPE pdf_annotation_status AS ENUM ('open', 'resolved', 'action_required', 'reviewing');
        END IF;
      END
      $$;
    `);

    // Skapa tabell för PDF versioner
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_versions (
        id SERIAL PRIMARY KEY,
        file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        description TEXT,
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
        metadata JSONB
      );
    `);

    // Skapa tabell för PDF annotationer
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_annotations (
        id SERIAL PRIMARY KEY,
        pdf_version_id INTEGER NOT NULL REFERENCES pdf_versions(id) ON DELETE CASCADE,
        rect JSONB NOT NULL,
        color TEXT NOT NULL,
        comment TEXT,
        status pdf_annotation_status NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by_id INTEGER NOT NULL REFERENCES users(id)
      );
    `);

    // Skapa index för bättre prestanda
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pdf_versions_file_id ON pdf_versions(file_id);
      CREATE INDEX IF NOT EXISTS idx_pdf_annotations_pdf_version_id ON pdf_annotations(pdf_version_id);
    `);

    await client.query('COMMIT');

    console.log('PDF tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating PDF tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

createPdfTables()
  .then(() => console.log('PDF tables migration complete'))
  .catch(err => console.error('PDF tables migration failed:', err))
  .finally(() => pool.end());