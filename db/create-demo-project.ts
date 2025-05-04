import { pool } from './index';

async function createDemoProject() {
  try {
    console.log('Checking for existing projects...');
    
    // Direct SQL query to check for existing projects
    const existingProjects = await pool.query('SELECT * FROM projects LIMIT 1');
    
    if (existingProjects.rows.length === 0) {
      console.log('Creating demo project...');

      // Get the current user ID
      const users = await pool.query('SELECT * FROM users LIMIT 1');
      
      if (users.rows.length === 0) {
        console.error('No users found. Please run seed script first.');
        return;
      }

      const userId = users.rows[0].id;

      // Insert a demo project with ID 1
      await pool.query(`
        INSERT INTO projects (id, name, description, created_by_id, created_at)
        VALUES (1, 'Demo Project', 'A demo project for testing features', $1, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [userId]);

      console.log('Demo project created with ID 1');
    } else {
      // Check if project with ID 1 exists
      const projectWithId1 = await pool.query('SELECT * FROM projects WHERE id = 1');
      
      if (projectWithId1.rows.length === 0) {
        // Get the current user ID
        const users = await pool.query('SELECT * FROM users LIMIT 1');
        const userId = users.rows[0].id;
        
        // Insert project with specific ID 1
        await pool.query(`
          INSERT INTO projects (id, name, description, created_by_id, created_at)
          VALUES (1, 'Demo Project', 'A demo project for testing features', $1, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [userId]);
        
        console.log('Created project with specific ID 1');
      } else {
        console.log('Project with ID 1 already exists.');
      }
    }
  } catch (error) {
    console.error('Error creating demo project:', error);
  } finally {
    // Don't close the pool as it might be used elsewhere
  }
}

createDemoProject()
  .then(() => console.log('Finished demo project setup.'))
  .catch(console.error);