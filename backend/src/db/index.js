import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool = null;
let isConnected = false;

export function getDbPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  // If DATABASE_URL or individual PG credentials exist, create pool
  if (connectionString || process.env.PGHOST) {
    const config = connectionString
      ? {
          connectionString,
          ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
        }
      : {
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432', 10),
          database: process.env.PGDATABASE || 'youtube_watch_party',
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || '',
          ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
        };

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err.message);
    });
  }

  return pool;
}

/**
 * Initializes database schema (creates tables if not exist)
 */
export async function initDatabase() {
  const p = getDbPool();
  if (!p) {
    console.log('ℹ️ PostgreSQL: No DATABASE_URL or PGHOST provided. Running in memory mode.');
    return false;
  }

  try {
    const client = await p.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS rooms (
          id VARCHAR(16) PRIMARY KEY,
          host_id VARCHAR(64),
          video_id VARCHAR(32) NOT NULL,
          current_time DOUBLE PRECISION DEFAULT 0,
          playing BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS room_participants (
          id VARCHAR(64) PRIMARY KEY,
          room_id VARCHAR(16) REFERENCES rooms(id) ON DELETE CASCADE,
          username VARCHAR(64) NOT NULL,
          role VARCHAR(32) NOT NULL,
          joined_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR(64) PRIMARY KEY,
          room_id VARCHAR(16) REFERENCES rooms(id) ON DELETE CASCADE,
          user_id VARCHAR(64),
          username VARCHAR(64),
          role VARCHAR(32),
          text TEXT NOT NULL,
          is_system BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS action_requests (
          id VARCHAR(64) PRIMARY KEY,
          room_id VARCHAR(16) REFERENCES rooms(id) ON DELETE CASCADE,
          user_id VARCHAR(64),
          username VARCHAR(64),
          action VARCHAR(32) NOT NULL,
          payload JSONB,
          status VARCHAR(20) DEFAULT 'pending',
          resolved_by JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_participants_room ON room_participants(room_id);
        CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id);
        CREATE INDEX IF NOT EXISTS idx_requests_room ON action_requests(room_id);
      `);

      isConnected = true;
      console.log('🐘 PostgreSQL connected successfully! Schema initialized.');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection failed: ${err.message}. Falling back to memory mode.`);
    isConnected = false;
    return false;
  }
}

export function isDbConnected() {
  return isConnected;
}

// Database repository persistence helpers
export async function dbSaveRoom(room) {
  if (!isConnected || !pool) return;
  try {
    await pool.query(
      `INSERT INTO rooms (id, host_id, video_id, current_time, playing, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE 
       SET host_id = EXCLUDED.host_id,
           video_id = EXCLUDED.video_id,
           current_time = EXCLUDED.current_time,
           playing = EXCLUDED.playing,
           updated_at = NOW()`,
      [room.id, room.hostId, room.state.videoId, room.state.currentTime, room.state.playing]
    );
  } catch (err) {
    console.error('dbSaveRoom error:', err.message);
  }
}

export async function dbSaveParticipant(roomId, user) {
  if (!isConnected || !pool) return;
  try {
    await pool.query(
      `INSERT INTO room_participants (id, room_id, username, role, joined_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE 
       SET role = EXCLUDED.role`,
      [user.id, roomId, user.username, user.role]
    );
  } catch (err) {
    console.error('dbSaveParticipant error:', err.message);
  }
}

export async function dbRemoveParticipant(roomId, userId) {
  if (!isConnected || !pool) return;
  try {
    await pool.query(
      `DELETE FROM room_participants WHERE room_id = $1 AND id = $2`,
      [roomId, userId]
    );
  } catch (err) {
    console.error('dbRemoveParticipant error:', err.message);
  }
}

export async function dbSaveChatMessage(roomId, message) {
  if (!isConnected || !pool) return;
  try {
    await pool.query(
      `INSERT INTO chat_messages (id, room_id, user_id, username, role, text, is_system, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [message.id, roomId, message.userId, message.username, message.role, message.text, message.isSystem]
    );
  } catch (err) {
    console.error('dbSaveChatMessage error:', err.message);
  }
}

export async function dbSaveActionRequest(roomId, request) {
  if (!isConnected || !pool) return;
  try {
    await pool.query(
      `INSERT INTO action_requests (id, room_id, user_id, username, action, payload, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE
       SET status = EXCLUDED.status,
           resolved_by = EXCLUDED.resolved_by`,
      [request.id, roomId, request.userId, request.username, request.action, JSON.stringify(request.payload), request.status]
    );
  } catch (err) {
    console.error('dbSaveActionRequest error:', err.message);
  }
}

export async function dbResolveActionRequest(requestId, status, resolvedBy) {
  if (!isConnected || !pool) return;
  try {
    await pool.query(
      `UPDATE action_requests 
       SET status = $1, resolved_by = $2
       WHERE id = $3`,
      [status, JSON.stringify(resolvedBy), requestId]
    );
  } catch (err) {
    console.error('dbResolveActionRequest error:', err.message);
  }
}
