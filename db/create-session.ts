import { pool } from './index';

async function createSessionTable() {
  try {
    console.log('Creating session table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);

    console.log('Session table created successfully.');
  } catch (error) {
    console.error('Error creating session table:', error);
    throw error;
  } finally {
    pool.end();
  }
}

createSessionTable();