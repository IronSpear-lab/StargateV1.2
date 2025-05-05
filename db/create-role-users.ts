import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createRoleUsers() {
  try {
    console.log("Starting to create role-based users...");

    // Check if users already exist
    const existingProjectLeader = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'projectleader')
    });
    
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'user')
    });
    
    const existingSuperUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'superuser')
    });

    // Create Project Leader if doesn't exist
    if (!existingProjectLeader) {
      console.log("Creating Project Leader user...");
      const projectLeaderUser = await db.insert(schema.users).values({
        username: "projectleader",
        password: await hashPassword("123456"),
        role: "project_leader"
      }).returning();
      console.log("Project Leader user created successfully!");
    } else {
      console.log("Project Leader user already exists.");
    }

    // Create Regular User if doesn't exist
    if (!existingUser) {
      console.log("Creating Regular User...");
      const regularUser = await db.insert(schema.users).values({
        username: "user",
        password: await hashPassword("123456"),
        role: "user"
      }).returning();
      console.log("Regular User created successfully!");
    } else {
      console.log("Regular User already exists.");
    }

    // Create Super User if doesn't exist
    if (!existingSuperUser) {
      console.log("Creating Super User...");
      const superUser = await db.insert(schema.users).values({
        username: "superuser",
        password: await hashPassword("123456"),
        role: "project_leader" // Using project_leader role to grant access to project leader dashboard
      }).returning();
      console.log("Super User created successfully!");
    } else {
      console.log("Super User already exists.");
    }

    console.log("Role-based users creation completed successfully!");
  } catch (error) {
    console.error("Error creating role-based users:", error);
  }
}

// Run the function
createRoleUsers().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});