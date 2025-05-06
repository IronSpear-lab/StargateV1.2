import { db } from "./index";
import { messages, conversations, conversationParticipants } from "@shared/schema";
import { sql } from "drizzle-orm";

async function createMessagingTables() {
  try {
    console.log("Creating messaging tables...");
    
    // Create conversations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT,
        is_group BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
        project_id INTEGER REFERENCES projects(id)
      )
    `);
    console.log("Conversations table created or already exists");
    
    // Create conversation_participants table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
        left_at TIMESTAMP,
        is_admin BOOLEAN NOT NULL DEFAULT false
      )
    `);
    console.log("Conversation participants table created or already exists");
    
    // Create messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        edited BOOLEAN NOT NULL DEFAULT false,
        read_by INTEGER[] DEFAULT '{}',
        attachment_url TEXT
      )
    `);
    console.log("Messages table created or already exists");
    
    // Create some demo conversations and messages
    const users = await db.query.users.findMany();
    
    if (users.length < 2) {
      console.log("Not enough users to create sample conversations");
      return;
    }
    
    // Check if we already have conversations
    const existingConversations = await db.query.conversations.findMany({
      limit: 1
    });
    
    if (existingConversations.length > 0) {
      console.log("Demo conversations already exist, skipping creation");
      return;
    }

    // Create a direct message conversation between first two users
    const [user1, user2] = users;
    const [dmConversation] = await db.insert(conversations)
      .values({
        isGroup: false,
        lastMessageAt: new Date()
      })
      .returning();
    
    // Add participants
    await db.insert(conversationParticipants)
      .values([
        {
          userId: user1.id,
          conversationId: dmConversation.id,
          isAdmin: true
        },
        {
          userId: user2.id,
          conversationId: dmConversation.id,
          isAdmin: false
        }
      ]);
    
    // Create a group conversation with first three users if possible
    if (users.length >= 3) {
      const [groupConversation] = await db.insert(conversations)
        .values({
          title: "Project Team",
          isGroup: true,
          lastMessageAt: new Date()
        })
        .returning();
      
      // Add participants
      const groupParticipants = users.slice(0, 3).map((user, index) => ({
        userId: user.id,
        conversationId: groupConversation.id,
        isAdmin: index === 0 // First user is admin
      }));
      
      await db.insert(conversationParticipants)
        .values(groupParticipants);
      
      // Add a welcome message to group chat
      await db.insert(messages)
        .values({
          content: "Welcome to the project team chat!",
          senderId: user1.id,
          conversationId: groupConversation.id
        });
    }
    
    // Add some sample messages to the DM conversation
    await db.insert(messages)
      .values([
        {
          content: "Hi there! How's the project coming along?",
          senderId: user1.id,
          conversationId: dmConversation.id,
          sentAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
        },
        {
          content: "Great! I've finished the initial design mockups.",
          senderId: user2.id,
          conversationId: dmConversation.id,
          sentAt: new Date(Date.now() - 1000 * 60 * 25) // 25 minutes ago
        },
        {
          content: "Can you share them with me so I can review?",
          senderId: user1.id,
          conversationId: dmConversation.id,
          sentAt: new Date(Date.now() - 1000 * 60 * 20) // 20 minutes ago
        }
      ]);
    
    console.log("Demo conversations and messages created successfully");
    
  } catch (error) {
    console.error("Error creating messaging tables:", error);
    throw error;
  }
}

createMessagingTables()
  .then(() => {
    console.log("Messaging setup completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("Failed to set up messaging:", error);
    process.exit(1);
  });