import { pool } from './index';

async function createUserProjectRelationship() {
  try {
    console.log('Checking for existing user-project relationships...');
    
    // Check if the user-project relationship already exists
    const existingRelationship = await pool.query(`
      SELECT * FROM user_projects 
      WHERE user_id = (SELECT id FROM users LIMIT 1) 
      AND project_id = 1
    `);
    
    if (existingRelationship.rows.length === 0) {
      // Get first user
      const users = await pool.query('SELECT * FROM users LIMIT 1');
      
      if (users.rows.length === 0) {
        console.error('No users found. Please run seed script first.');
        return;
      }
      
      const userId = users.rows[0].id;
      
      // Create user-project relationship
      await pool.query(`
        INSERT INTO user_projects (user_id, project_id, role)
        VALUES ($1, 1, 'admin')
      `, [userId]);
      
      console.log('Created user-project relationship for project ID 1');
    } else {
      console.log('User-project relationship already exists');
    }
  } catch (error) {
    console.error('Error creating user-project relationship:', error);
  }
}

createUserProjectRelationship()
  .then(() => console.log('Finished user-project setup.'))
  .catch(console.error);