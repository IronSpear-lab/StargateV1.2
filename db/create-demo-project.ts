import { db } from './index';
import { projects } from '../shared/schema';

async function createDemoProject() {
  try {
    // Check if there are any existing projects
    const existingProjects = await db.query.projects.findMany();
    
    if (existingProjects.length === 0) {
      console.log('Creating demo project...');

      // Get the first user to use as the creator
      const users = await db.query.users.findMany({ limit: 1 });
      
      if (users.length === 0) {
        console.error('No users found. Please run seed script first.');
        return;
      }

      const user = users[0];

      // Insert a demo project
      const result = await db.insert(projects).values({
        name: 'Demo Project',
        description: 'A demo project for testing features',
        createdById: user.id,
        createdAt: new Date()
      }).returning();

      console.log('Demo project created:', result[0]);
    } else {
      console.log('Demo projects already exist. Skipping creation.');
    }
  } catch (error) {
    console.error('Error creating demo project:', error);
  }
}

createDemoProject()
  .then(() => console.log('Finished demo project setup.'))
  .catch(console.error);