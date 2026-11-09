const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, 'database.db'));
const dbDirectory = path.dirname(DB_PATH);

if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

function addColumn(table, column, type) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (err) => {
        // ignore "duplicate column" errors on restart
        if (err && !/duplicate column/i.test(err.message)) {
            console.warn(`ALTER ${table}.${column}:`, err.message);
        }
    });
}

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'Наставник ВолгГМУ',
            direction TEXT,
            avatar TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id INTEGER NOT NULL,
            to_user_id INTEGER NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending',
            chat_link TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_user_id) REFERENCES users(id),
            FOREIGN KEY (to_user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            from_user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES requests(id),
            FOREIGN KEY (from_user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mentor_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            rating INTEGER NOT NULL,
            text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (mentor_id) REFERENCES users(id),
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            is_group INTEGER DEFAULT 0,
            avatar TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chat_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            from_user_id INTEGER NOT NULL,
            text TEXT,
            attachment_url TEXT,
            attachment_type TEXT,
            attachment_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id),
            FOREIGN KEY (from_user_id) REFERENCES users(id)
        )
    `);

    // --- расширения ---
    addColumn('users', 'is_blocked', 'INTEGER DEFAULT 0');
    addColumn('users', 'max_mentees', 'INTEGER DEFAULT 10');
    addColumn('users', 'last_seen', 'DATETIME');
    addColumn('chat_members', 'is_pinned', 'INTEGER DEFAULT 0');
    addColumn('chat_members', 'is_typing', 'INTEGER DEFAULT 0');
    addColumn('chat_members', 'typing_at', 'DATETIME');
    addColumn('chat_messages', 'reply_to_id', 'INTEGER');
    addColumn('chat_messages', 'edited_at', 'DATETIME');
    addColumn('chat_messages', 'is_deleted', 'INTEGER DEFAULT 0');
    addColumn('requests', 'meeting_at', 'DATETIME');
    addColumn('requests', 'meeting_note', 'TEXT');

    db.run(`
        CREATE TABLE IF NOT EXISTS admin_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id INTEGER,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS message_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(message_id, user_id, emoji)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'open',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('📁 База данных готова');
});

module.exports = db;
