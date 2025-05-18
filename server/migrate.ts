import { db } from './db';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running database migrations...');

  try {
    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS discord_servers (
        id VARCHAR(20) PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        joined_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS discord_channels (
        id VARCHAR(20) PRIMARY KEY,
        server_id VARCHAR(20) NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS discord_messages (
        id VARCHAR(20) PRIMARY KEY,
        server_id VARCHAR(20) NOT NULL,
        channel_id VARCHAR(20) NOT NULL,
        author_id VARCHAR(20) NOT NULL,
        author_username TEXT NOT NULL,
        author_discriminator TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bot_status (
        id SERIAL PRIMARY KEY,
        is_online INTEGER NOT NULL,
        uptime_started TIMESTAMP,
        servers_count INTEGER NOT NULL DEFAULT 0,
        channels_count INTEGER NOT NULL DEFAULT 0,
        messages_count INTEGER NOT NULL DEFAULT 0,
        storage_usage INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS command_logs (
        id SERIAL PRIMARY KEY,
        command TEXT NOT NULL,
        response TEXT NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Initialize bot_status if empty
    const status = await db.select().from(schema.botStatus);
    if (status.length === 0) {
      await db.insert(schema.botStatus).values({
        id: 1,
        is_online: 0,
        uptime_started: null,
        servers_count: 0,
        channels_count: 0,
        messages_count: 0,
        storage_usage: 0
      });
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate().then(() => {
  console.log('Database is ready');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});