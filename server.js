const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./database');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const IMAGE_UPLOAD_DIR = path.join(UPLOAD_DIR, 'images');
const FILE_UPLOAD_DIR = path.join(UPLOAD_DIR, 'files');

fs.mkdirSync(IMAGE_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(FILE_UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Не отдаём исходники сервера, базу данных и служебные файлы через express.static.
app.use((req, res, next) => {
    let pathname;
    try {
        pathname = decodeURIComponent(req.path);
    } catch {
        return res.status(400).end();
    }

    const blocked = /^\/(?:database(?:-backup)?\.db(?:-shm|-wal)?|server\.js|database\.js|package(?:-lock)?\.json|README\.md|\.env)(?:\/|$)/i;
    if (blocked.test(pathname) || pathname.startsWith('/node_modules/')) {
        return res.sendStatus(404);
    }
    next();
});

app.use(express.static(__dirname));
// MIME для голосовых — плеер в чате без скачивания
app.use('/uploads', express.static(UPLOAD_DIR, {
    setHeaders: function (res, filePath) {
        if (/\.webm$/i.test(filePath)) res.setHeader('Content-Type', 'audio/webm');
        else if (/\.ogg$/i.test(filePath)) res.setHeader('Content-Type', 'audio/ogg');
        else if (/\.m4a$/i.test(filePath)) res.setHeader('Content-Type', 'audio/mp4');
        else if (/\.mp3$/i.test(filePath)) res.setHeader('Content-Type', 'audio/mpeg');
        else if (/\.wav$/i.test(filePath)) res.setHeader('Content-Type', 'audio/wav');
    }
}));

// Настройка multer для загрузки файлов.
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isImage = file.mimetype.startsWith('image/');
        cb(null, isImage ? IMAGE_UPLOAD_DIR : FILE_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const safeOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + safeOriginalName;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // до 15 МБ (файлы и голосовые)
});

// Проверка участия пользователя в чате. ID передаётся клиентом,
// поэтому это дополнительная проверка доступа, а не полноценная сессионная авторизация.
function requireChatMember(req, res, next) {
    const userId = Number(req.get('x-user-id'));
    const chatId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(chatId) || chatId <= 0) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    db.get(
        'SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?',
        [chatId, userId],
        (err, member) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (!member) {
                return res.status(403).json({ error: 'Вы не участник этого чата' });
            }
            req.chatUserId = userId;
            next();
        }
    );
}

// ============ РЕГИСТРАЦИЯ ============
app.post('/api/register', async (req, res) => {
    try {
        const { login, name, password, role, direction, avatar } = req.body;

        if (!login || !name || !password) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }

        db.get('SELECT id FROM users WHERE LOWER(login) = LOWER(?)', [login], async (err, existing) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (existing) {
                return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const directionJSON = direction ? JSON.stringify(direction) : null;

            db.run(
                `INSERT INTO users (login, name, password, role, direction, avatar) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [login, name, hashedPassword, role || 'Наставник ВолгГМУ', directionJSON, avatar || null],
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Ошибка при создании пользователя' });
                    }

                    res.json({
                        success: true,
                        user: {
                            id: this.lastID,
                            login,
                            name,
                            role: role || 'Наставник ВолгГМУ',
                            direction: direction || null,
                            avatar: avatar || null,
                            is_admin: 0
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ ВХОД ============
app.post('/api/login', (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ error: 'Введите логин и пароль' });
        }

        db.get('SELECT * FROM users WHERE LOWER(login) = LOWER(?)', [login], async (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (!user) {
                return res.status(400).json({ error: 'Пользователь не найден' });
            }
            if (user.is_blocked) {
                return res.status(403).json({ error: 'Аккаунт заблокирован' });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(400).json({ error: 'Неверный пароль' });
            }

            let direction = null;
            if (user.direction) {
                try { direction = JSON.parse(user.direction); } catch (e) {}
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    login: user.login,
                    name: user.name,
                    role: user.role,
                    direction,
                    avatar: user.avatar,
                    is_admin: user.is_admin,
                    max_mentees: user.max_mentees || 10
                }
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ ОБНОВИТЬ ПРОФИЛЬ ============
app.put('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, direction, avatar } = req.body;

        db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            const newName = name || user.name;
            const newRole = role || user.role;
            const newDirection = direction ? JSON.stringify(direction) : user.direction;
            const newAvatar = avatar !== undefined ? avatar : user.avatar;

            db.run(
                `UPDATE users SET name = ?, role = ?, direction = ?, avatar = ? WHERE id = ?`,
                [newName, newRole, newDirection, newAvatar, id],
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Ошибка обновления' });
                    }

                    let directionData = null;
                    if (newDirection) {
                        try { directionData = JSON.parse(newDirection); } catch (e) {}
                    }

                    res.json({
                        success: true,
                        user: {
                            id: user.id,
                            login: user.login,
                            name: newName,
                            role: newRole,
                            direction: directionData,
                            avatar: newAvatar,
                            is_admin: user.is_admin
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============ ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ============
app.get('/api/users', (req, res) => {
    db.all('SELECT id, login, name, role, direction, avatar, created_at FROM users', [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        const users = rows.map(row => {
            let direction = null;
            if (row.direction) {
                try { direction = JSON.parse(row.direction); } catch (e) {}
            }
            return { ...row, direction };
        });
        res.json(users);
    });
});

// ============ НАСТАВНИКИ С РЕЙТИНГОМ (ОПТИМИЗИРОВАНО) ============
app.get('/api/mentors-with-rating', (req, res) => {
    const { search, level, direction } = req.query;

    let sql = `
        SELECT u.id, u.login, u.name, u.role, u.direction, u.avatar, u.created_at,
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(r.id) as reviews_count
        FROM users u
        LEFT JOIN reviews r ON r.mentor_id = u.id
        WHERE u.role LIKE ?
    `;
    const params = ['%Наставник%'];

    if (search) {
        sql += " AND (u.name LIKE ? OR u.login LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    sql += " GROUP BY u.id ORDER BY avg_rating DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        let users = rows.map(row => {
            let directionData = null;
            if (row.direction) {
                try { directionData = JSON.parse(row.direction); } catch (e) {}
            }
            return {
                ...row,
                direction: directionData,
                avg_rating: parseFloat(row.avg_rating).toFixed(1),
                reviews_count: row.reviews_count
            };
        });

        if (level) {
            users = users.filter(u => u.direction && u.direction.level === level);
        }
        if (direction) {
            users = users.filter(u => u.direction && u.direction.name === direction);
        }

        res.json(users);
    });
});

// ============ ПОЛУЧИТЬ НАСТАВНИКОВ (СТАРЫЙ, ОСТАВИМ ДЛЯ СОВМЕСТИМОСТИ) ============
app.get('/api/mentors', (req, res) => {
    const { search, level, direction } = req.query;

    let sql = "SELECT id, login, name, role, direction, avatar, created_at FROM users WHERE role LIKE ?";
    const params = ['%Наставник%'];

    if (search) {
        sql += " AND (name LIKE ? OR login LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        let users = rows.map(row => {
            let directionData = null;
            if (row.direction) {
                try { directionData = JSON.parse(row.direction); } catch (e) {}
            }
            return { ...row, direction: directionData };
        });

        if (level) {
            users = users.filter(u => u.direction && u.direction.level === level);
        }
        if (direction) {
            users = users.filter(u => u.direction && u.direction.name === direction);
        }

        res.json(users);
    });
});

// ============ ПОИСК ПОЛЬЗОВАТЕЛЕЙ ============
app.get('/api/users/search', (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.json([]);
    }

    db.all(`
        SELECT id, login, name, avatar, role
        FROM users
        WHERE LOWER(name) LIKE ? OR LOWER(login) LIKE ?
        LIMIT 10
    `, [`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`], (err, users) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(users);
    });
});

// ============ ПОЛУЧИТЬ ОДНОГО ПОЛЬЗОВАТЕЛЯ ============
app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT id, login, name, role, direction, avatar, created_at FROM users WHERE id = ?', [id], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        let direction = null;
        if (user.direction) {
            try { direction = JSON.parse(user.direction); } catch (e) {}
        }
        res.json({ ...user, direction });
    });
});

// ============ ОТПРАВИТЬ ЗАЯВКУ ============
app.post('/api/requests', (req, res) => {
    const { from_user_id, to_user_id, message } = req.body;

    if (!from_user_id || !to_user_id) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }
    if (from_user_id === to_user_id) {
        return res.status(400).json({ error: 'Нельзя отправить заявку самому себе' });
    }

    db.get(
        'SELECT id FROM requests WHERE from_user_id = ? AND to_user_id = ? AND status = ?',
        [from_user_id, to_user_id, 'pending'],
        (err, existing) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (existing) {
                return res.status(400).json({ error: 'Заявка уже отправлена' });
            }

            db.run(
                `INSERT INTO requests (from_user_id, to_user_id, message, status) 
                 VALUES (?, ?, ?, 'pending')`,
                [from_user_id, to_user_id, message || null],
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Ошибка отправки' });
                    }
                    res.json({ success: true, id: this.lastID });
                }
            );
        }
    );
});

// ============ ПОЛУЧИТЬ ЗАЯВКИ ПОЛЬЗОВАТЕЛЯ ============
// Создать (или найти) личный чат между двумя пользователями
function ensurePersonalChat(userA, userB, createdBy, cb) {
    const a = Number(userA);
    const b = Number(userB);
    db.get(`
        SELECT c.id FROM chats c
        JOIN chat_members m1 ON c.id = m1.chat_id AND m1.user_id = ?
        JOIN chat_members m2 ON c.id = m2.chat_id AND m2.user_id = ?
        WHERE c.is_group = 0
    `, [a, b], (err, existing) => {
        if (err) return cb(err);
        if (existing) return cb(null, existing.id);

        db.run(
            'INSERT INTO chats (name, is_group, created_by) VALUES (?, 0, ?)',
            [null, Number(createdBy) || a],
            function (err2) {
                if (err2) return cb(err2);
                const chatId = this.lastID;
                const stmt = db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)');
                stmt.run(chatId, a);
                stmt.run(chatId, b);
                stmt.finalize((err3) => cb(err3, chatId));
            }
        );
    });
}

app.get('/api/requests/:userId', (req, res) => {
    const { userId } = req.params;
    db.all(`
        SELECT r.*, 
               u1.name as from_name, u1.avatar as from_avatar,
               u2.name as to_name, u2.avatar as to_avatar
        FROM requests r
        LEFT JOIN users u1 ON r.from_user_id = u1.id
        LEFT JOIN users u2 ON r.to_user_id = u2.id
        WHERE r.to_user_id = ? OR r.from_user_id = ?
        ORDER BY r.created_at DESC
    `, [userId, userId], (err, requests) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        // Миграция старых chat_link (/chat.html?request=...) → реальные чаты
        const needFix = (requests || []).filter(r =>
            r.status === 'approved' &&
            (!r.chat_link || String(r.chat_link).includes('chat.html?request='))
        );

        if (needFix.length === 0) {
            return res.json(requests);
        }

        let left = needFix.length;
        needFix.forEach(r => {
            ensurePersonalChat(r.from_user_id, r.to_user_id, r.to_user_id, (e, chatId) => {
                if (!e && chatId) {
                    const link = `/chat-new.html?id=${chatId}`;
                    r.chat_link = link;
                    db.run('UPDATE requests SET chat_link = ? WHERE id = ?', [link, r.id]);
                }
                left--;
                if (left === 0) res.json(requests);
            });
        });
    });
});

// ============ ОДОБРИТЬ / ОТКЛОНИТЬ ЗАЯВКУ ============
app.put('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const requesterId = Number(req.get('x-user-id'));

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Неверный статус' });
    }

    // При отклонении — просто обновляем статус
    if (status === 'rejected') {
        return db.run(
            'UPDATE requests SET status = ?, chat_link = NULL WHERE id = ?',
            [status, id],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Ошибка обновления' });
                }
                res.json({ success: true, chat_link: null });
            }
        );
    }

    // Одобрение: создаём реальный чат между участниками заявки
    db.get('SELECT * FROM requests WHERE id = ?', [id], (err, request) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!request) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }
        if (request.status === 'approved' && request.chat_link && String(request.chat_link).includes('chat-new.html')) {
            return res.json({ success: true, chat_link: request.chat_link });
        }

        ensurePersonalChat(request.from_user_id, request.to_user_id, requesterId || request.to_user_id, (err2, chatId) => {
            if (err2 || !chatId) {
                console.error(err2);
                return res.status(500).json({ error: 'Ошибка создания чата' });
            }
            const chatLink = `/chat-new.html?id=${chatId}`;
            db.run(
                'UPDATE requests SET status = ?, chat_link = ? WHERE id = ?',
                ['approved', chatLink, id],
                function (err3) {
                    if (err3) {
                        console.error(err3);
                        return res.status(500).json({ error: 'Ошибка обновления' });
                    }
                    res.json({ success: true, chat_link: chatLink, chat_id: chatId });
                }
            );
        });
    });
});

// ============ ОТПРАВИТЬ СООБЩЕНИЕ ============
app.post('/api/messages', (req, res) => {
    const { request_id, from_user_id, message } = req.body;

    if (!request_id || !from_user_id || !message) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }

    db.run(
        `INSERT INTO messages (request_id, from_user_id, message) 
         VALUES (?, ?, ?)`,
        [request_id, from_user_id, message],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка отправки' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ============ ПОЛУЧИТЬ СООБЩЕНИЯ ЧАТА ============
app.get('/api/messages/:requestId', (req, res) => {
    const { requestId } = req.params;

    db.all(`
        SELECT m.*, u.name as from_name, u.avatar as from_avatar
        FROM messages m
        LEFT JOIN users u ON m.from_user_id = u.id
        WHERE m.request_id = ?
        ORDER BY m.created_at ASC
    `, [requestId], (err, messages) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(messages);
    });
});

// ============ ПРОВЕРКА АДМИНА ============
function checkAdmin(req, res, next) {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    
    db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        next();
    });
}

// ============ ВСЕ ПОЛЬЗОВАТЕЛИ (АДМИН) ============
app.get('/api/admin/users', checkAdmin, (req, res) => {
    db.all(`
        SELECT id, login, name, role, direction, avatar, is_admin, created_at,
               IFNULL(is_blocked, 0) as is_blocked, last_seen
        FROM users 
        ORDER BY created_at DESC
    `, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        const users = rows.map(row => {
            let direction = null;
            if (row.direction) {
                try { direction = JSON.parse(row.direction); } catch (e) {}
            }
            return { ...row, direction };
        });
        res.json(users);
    });
});

// ============ СТАТИСТИКА (АДМИН) ============
app.get('/api/admin/stats', checkAdmin, (req, res) => {
    db.get(`
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE role LIKE '%Наставник%') as total_mentors,
            (SELECT COUNT(*) FROM users WHERE role LIKE '%Подопечный%') as total_mentees,
            (SELECT COUNT(*) FROM requests) as total_requests,
            (SELECT COUNT(*) FROM requests WHERE status = 'pending') as pending_requests,
            (SELECT COUNT(*) FROM requests WHERE status = 'approved') as approved_requests,
            (SELECT COUNT(*) FROM messages) as total_messages
    `, [], (err, stats) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(stats);
    });
});

// ============ УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ (АДМИН) ============
app.delete('/api/admin/users/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    if (id == req.headers['x-user-id']) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка удаления' });
        }
        res.json({ success: true });
    });
});

// ============ СДЕЛАТЬ АДМИНОМ ============
app.put('/api/admin/users/:id/make-admin', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка' });
        }
        res.json({ success: true });
    });
});

// ============ СНЯТЬ АДМИНА ============
app.put('/api/admin/users/:id/remove-admin', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    if (id == req.headers['x-user-id']) {
        return res.status(400).json({ error: 'Нельзя снять права с самого себя' });
    }
    
    db.run('UPDATE users SET is_admin = 0 WHERE id = ?', [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка' });
        }
        res.json({ success: true });
    });
});

// ============ ВСЕ ЗАЯВКИ (АДМИН) ============
app.get('/api/admin/requests', checkAdmin, (req, res) => {
    db.all(`
        SELECT r.*, 
               u1.name as from_name, u1.avatar as from_avatar,
               u2.name as to_name, u2.avatar as to_avatar
        FROM requests r
        LEFT JOIN users u1 ON r.from_user_id = u1.id
        LEFT JOIN users u2 ON r.to_user_id = u2.id
        ORDER BY r.created_at DESC
    `, [], (err, requests) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(requests);
    });
});

// ============ УДАЛИТЬ ЗАЯВКУ (АДМИН) ============
app.delete('/api/admin/requests/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM messages WHERE request_id = ?', [id]);
    db.run('DELETE FROM requests WHERE id = ?', [id], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка удаления' });
        }
        res.json({ success: true });
    });
});

// ============ ОСТАВИТЬ ОТЗЫВ ============
app.post('/api/reviews', (req, res) => {
    const { mentor_id, author_id, rating, text } = req.body;

    if (!mentor_id || !author_id || !rating) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Оценка от 1 до 5' });
    }

    if (mentor_id === author_id) {
        return res.status(400).json({ error: 'Нельзя оставить отзыв самому себе' });
    }

    db.get('SELECT id FROM reviews WHERE mentor_id = ? AND author_id = ?', 
        [mentor_id, author_id], 
        (err, existing) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (existing) {
                return res.status(400).json({ error: 'Вы уже оставили отзыв' });
            }

            db.run(
                `INSERT INTO reviews (mentor_id, author_id, rating, text) 
                 VALUES (?, ?, ?, ?)`,
                [mentor_id, author_id, rating, text || null],
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Ошибка сохранения' });
                    }
                    res.json({ success: true, id: this.lastID });
                }
            );
        }
    );
});

// ============ ОТЗЫВЫ НАСТАВНИКА ============
app.get('/api/reviews/:mentorId', (req, res) => {
    const { mentorId } = req.params;

    db.all(`
        SELECT r.*, u.name as author_name, u.avatar as author_avatar
        FROM reviews r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE r.mentor_id = ?
        ORDER BY r.created_at DESC
    `, [mentorId], (err, reviews) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(reviews);
    });
});

// ============ СРЕДНИЙ РЕЙТИНГ ============
app.get('/api/reviews/:mentorId/rating', (req, res) => {
    const { mentorId } = req.params;

    db.get(`
        SELECT 
            COUNT(*) as count,
            AVG(rating) as average
        FROM reviews
        WHERE mentor_id = ?
    `, [mentorId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json({
            count: result.count || 0,
            average: result.average ? parseFloat(result.average).toFixed(1) : '0.0'
        });
    });
});
// ============ СОЗДАТЬ ЧАТ ============
app.post('/api/chats', (req, res) => {
    const { name, is_group, member_ids, created_by } = req.body;
    const requesterId = Number(req.get('x-user-id'));

    if (!created_by || !Array.isArray(member_ids)) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }
    if (!Number.isInteger(requesterId) || requesterId <= 0 || requesterId !== Number(created_by)) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }

    // Добавляем создателя в участники и нормализуем ID.
    const allMembers = [...new Set([Number(created_by), ...member_ids.map(Number)])];
    if (allMembers.some(id => !Number.isInteger(id) || id <= 0)) {
        return res.status(400).json({ error: 'Некорректный список участников' });
    }

    // Если личный чат — проверяем, нет ли уже такого
    if (!is_group && allMembers.length === 2) {
        const otherUser = allMembers.find(id => id != created_by);

        db.get(`
            SELECT c.id FROM chats c
            JOIN chat_members m1 ON c.id = m1.chat_id AND m1.user_id = ?
            JOIN chat_members m2 ON c.id = m2.chat_id AND m2.user_id = ?
            WHERE c.is_group = 0
        `, [created_by, otherUser], (err, existing) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (existing) {
                return res.json({ success: true, chat_id: existing.id, existing: true });
            }
            createChat();
        });
    } else {
        createChat();
    }

    function createChat() {
        db.run(
            'INSERT INTO chats (name, is_group, created_by) VALUES (?, ?, ?)',
            [name || null, is_group ? 1 : 0, created_by],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Ошибка создания чата' });
                }

                const chatId = this.lastID;

                // Добавляем участников
                const stmt = db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)');
                allMembers.forEach(userId => {
                    stmt.run(chatId, userId);
                });
                stmt.finalize();

                res.json({ success: true, chat_id: chatId });
            }
        );
    }
});

// ============ СПИСОК МОИХ ЧАТОВ ============
app.get('/api/chats/:userId', (req, res) => {
    const { userId } = req.params;
    if (!Number.isInteger(Number(userId)) || Number(req.get('x-user-id')) !== Number(userId)) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }

    db.all(`
        SELECT c.id, c.name, c.is_group, c.avatar, c.created_at, m.last_read_at, IFNULL(m.is_pinned, 0) as is_pinned
        FROM chats c
        JOIN chat_members m ON c.id = m.chat_id
        WHERE m.user_id = ?
    `, [userId], (err, chats) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        if (chats.length === 0) return res.json([]);

        let pending = chats.length;

        chats.forEach(chat => {
            db.all(`
                SELECT u.id, u.name, u.avatar 
                FROM chat_members m
                JOIN users u ON m.user_id = u.id
                WHERE m.chat_id = ?
            `, [chat.id], (err, members) => {
                if (err) members = [];
                chat.members = members;

                if (!chat.is_group) {
                    const other = members.find(m => String(m.id) !== String(userId));
                    if (other) {
                        chat.display_name = other.name;
                        chat.display_avatar = other.avatar;
                    }
                } else {
                    chat.display_name = chat.name || 'Группа';
                }

                db.get(`
                    SELECT text, attachment_type, attachment_name, created_at
                    FROM chat_messages
                    WHERE chat_id = ?
                    ORDER BY created_at DESC, id DESC
                    LIMIT 1
                `, [chat.id], (err, msg) => {
                    if (err || !msg) {
                        chat.last_message = null;
                        chat.last_message_at = null;
                    } else {
                        if (msg.text) {
                            chat.last_message = msg.text;
                        } else if (msg.attachment_type === 'image') {
                            chat.last_message = '📷 Фото';
                        } else if (msg.attachment_type === 'voice') {
                            chat.last_message = '🎤 Голосовое';
                        } else if (msg.attachment_name) {
                            chat.last_message = '📎 ' + msg.attachment_name;
                        } else {
                            chat.last_message = '📎 Файл';
                        }
                        chat.last_message_at = msg.created_at;
                    }

                    // Непрочитанные: сообщения от других после last_read_at
                    const lastRead = chat.last_read_at || '1970-01-01';
                    db.get(`
                        SELECT COUNT(*) AS cnt FROM chat_messages
                        WHERE chat_id = ? AND from_user_id != ? AND created_at > ?
                    `, [chat.id, userId, lastRead], (err2, row) => {
                        chat.unread_count = (err2 || !row) ? 0 : (row.cnt || 0);

                        pending--;
                        if (pending === 0) {
                            chats.sort((a, b) => {
                                const pinDiff = (b.is_pinned || 0) - (a.is_pinned || 0);
                                if (pinDiff !== 0) return pinDiff;
                                const da = a.last_message_at || a.created_at;
                                const db_ = b.last_message_at || b.created_at;
                                return da < db_ ? 1 : -1;
                            });
                            res.json(chats);
                        }
                    });
                });
            });
        });
    });
});


// ============ ИНФОРМАЦИЯ О ЧАТЕ ============
app.get('/api/chats/:id/info', requireChatMember, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM chats WHERE id = ?', [id], (err, chat) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!chat) {
            return res.status(404).json({ error: 'Чат не найден' });
        }

        db.all(`
            SELECT u.id, u.name, u.avatar, u.role, u.last_seen,
                   m.last_read_at, IFNULL(m.is_pinned,0) as is_pinned
            FROM chat_members m
            JOIN users u ON m.user_id = u.id
            WHERE m.chat_id = ?
        `, [id], (err, members) => {
            if (err) {
                console.error(err);
                members = [];
            }
            chat.members = members;
            res.json(chat);
        });
    });
});

// ============ СООБЩЕНИЯ ЧАТА ============
app.get('/api/chats/:id/messages', requireChatMember, (req, res) => {
    const { id } = req.params;
    const q = (req.query.q || '').trim();

    let sql = `
        SELECT m.*, u.name as from_name, u.avatar as from_avatar,
               r.text as reply_text, r.from_user_id as reply_from_id, ru.name as reply_from_name
        FROM chat_messages m
        LEFT JOIN users u ON m.from_user_id = u.id
        LEFT JOIN chat_messages r ON m.reply_to_id = r.id
        LEFT JOIN users ru ON r.from_user_id = ru.id
        WHERE m.chat_id = ? AND IFNULL(m.is_deleted, 0) = 0
    `;
    const params = [id];
    if (q) {
        sql += ` AND m.text LIKE ?`;
        params.push('%' + q + '%');
    }
    sql += ` ORDER BY m.created_at ASC`;

    db.all(sql, params, (err, messages) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        db.run(
            'UPDATE chat_members SET last_read_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?',
            [id, req.chatUserId],
            () => { res.json(messages); }
        );
    });
});

// ============ ОТПРАВИТЬ СООБЩЕНИЕ ============
app.post('/api/chats/:id/messages', requireChatMember, (req, res) => {
    const { id } = req.params;
    const { from_user_id, text, reply_to_id } = req.body;

    if (!from_user_id || !text) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }
    if (Number(from_user_id) !== req.chatUserId) {
        return res.status(403).json({ error: 'Нельзя отправлять сообщения от имени другого пользователя' });
    }

    db.run(
        'INSERT INTO chat_messages (chat_id, from_user_id, text, reply_to_id) VALUES (?, ?, ?, ?)',
        [id, from_user_id, text, reply_to_id || null],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка отправки' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Редактировать своё сообщение
app.put('/api/chats/:id/messages/:msgId', requireChatMember, (req, res) => {
    const { id, msgId } = req.params;
    const { text } = req.body;
    if (!text || !String(text).trim()) {
        return res.status(400).json({ error: 'Пустой текст' });
    }
    db.get('SELECT * FROM chat_messages WHERE id = ? AND chat_id = ?', [msgId, id], (err, msg) => {
        if (err || !msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        if (Number(msg.from_user_id) !== req.chatUserId) {
            return res.status(403).json({ error: 'Можно редактировать только свои сообщения' });
        }
        db.run(
            'UPDATE chat_messages SET text = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?',
            [String(text).trim(), msgId],
            function (e2) {
                if (e2) return res.status(500).json({ error: 'Ошибка' });
                res.json({ success: true });
            }
        );
    });
});

// Удалить своё сообщение (мягкое)
app.delete('/api/chats/:id/messages/:msgId', requireChatMember, (req, res) => {
    const { id, msgId } = req.params;
    db.get('SELECT * FROM chat_messages WHERE id = ? AND chat_id = ?', [msgId, id], (err, msg) => {
        if (err || !msg) return res.status(404).json({ error: 'Сообщение не найдено' });
        if (Number(msg.from_user_id) !== req.chatUserId) {
            return res.status(403).json({ error: 'Можно удалять только свои сообщения' });
        }
        db.run(
            'UPDATE chat_messages SET is_deleted = 1, text = NULL, attachment_url = NULL WHERE id = ?',
            [msgId],
            function (e2) {
                if (e2) return res.status(500).json({ error: 'Ошибка' });
                res.json({ success: true });
            }
        );
    });
});

// Закрепить / открепить чат
app.put('/api/chats/:id/pin', requireChatMember, (req, res) => {
    const pinned = req.body.pinned ? 1 : 0;
    db.run(
        'UPDATE chat_members SET is_pinned = ? WHERE chat_id = ? AND user_id = ?',
        [pinned, req.params.id, req.chatUserId],
        function (err) {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            res.json({ success: true, pinned: !!pinned });
        }
    );
});

// Индикатор «печатает»
app.post('/api/chats/:id/typing', requireChatMember, (req, res) => {
    db.run(
        'UPDATE chat_members SET is_typing = 1, typing_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?',
        [req.params.id, req.chatUserId],
        () => res.json({ success: true })
    );
});

app.get('/api/chats/:id/typing', requireChatMember, (req, res) => {
    db.all(`
        SELECT u.id, u.name FROM chat_members m
        JOIN users u ON u.id = m.user_id
        WHERE m.chat_id = ? AND m.user_id != ? AND m.is_typing = 1
          AND m.typing_at > datetime('now', '-5 seconds')
    `, [req.params.id, req.chatUserId], (err, rows) => {
        if (err) return res.json([]);
        res.json(rows || []);
    });
});

// ============ ЗАГРУЗИТЬ ФАЙЛ ============
app.post('/api/chats/:id/upload', requireChatMember, upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { from_user_id } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    if (!from_user_id) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }
    if (Number(from_user_id) !== req.chatUserId) {
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({ error: 'Нельзя загружать файлы от имени другого пользователя' });
    }

    const mime = req.file.mimetype || '';
    let attachmentType = 'file';
    if (mime.startsWith('image/')) attachmentType = 'image';
    else if (mime.startsWith('audio/')) attachmentType = 'voice';

    const relativePath = path.relative(UPLOAD_DIR, req.file.path).split(path.sep).join('/');
    const fileUrl = '/uploads/' + relativePath;
    const displayName = req.file.originalname || (attachmentType === 'voice' ? 'voice.webm' : 'file');

    db.run(
        `INSERT INTO chat_messages (chat_id, from_user_id, attachment_url, attachment_type, attachment_name) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, from_user_id, fileUrl, attachmentType, displayName],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка сохранения' });
            }
            res.json({ 
                success: true, 
                id: this.lastID,
                url: fileUrl,
                type: attachmentType,
                name: displayName
            });
        }
    );
});

// Heartbeat — обновление last_seen
app.post('/api/presence', (req, res) => {
    const userId = Number(req.get('x-user-id'));
    if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ error: 'Не авторизован' });
    db.run('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [userId], () => {
        res.json({ success: true });
    });
});

// Реакции на сообщения
app.post('/api/messages/:msgId/reactions', (req, res) => {
    const userId = Number(req.get('x-user-id'));
    const emoji = (req.body.emoji || '').slice(0, 8);
    const msgId = Number(req.params.msgId);
    if (!userId || !emoji || !msgId) return res.status(400).json({ error: 'Не хватает данных' });
    db.run(
        'INSERT OR IGNORE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        [msgId, userId, emoji],
        function (err) {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            if (this.changes === 0) {
                // toggle off
                db.run('DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
                    [msgId, userId, emoji], () => res.json({ success: true, removed: true }));
            } else {
                res.json({ success: true, removed: false });
            }
        }
    );
});

app.get('/api/chats/:id/reactions', requireChatMember, (req, res) => {
    db.all(`
        SELECT r.message_id, r.emoji, r.user_id, u.name as user_name
        FROM message_reactions r
        JOIN chat_messages m ON m.id = r.message_id
        JOIN users u ON u.id = r.user_id
        WHERE m.chat_id = ?
    `, [req.params.id], (err, rows) => {
        if (err) return res.json([]);
        res.json(rows || []);
    });
});

// Входящие pending заявки (для уведомлений)
app.get('/api/requests-pending-count/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || Number(req.get('x-user-id')) !== userId) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    db.get(
        `SELECT COUNT(*) as cnt FROM requests WHERE to_user_id = ? AND status = 'pending'`,
        [userId],
        (err, row) => res.json({ count: (row && row.cnt) || 0 })
    );
});

// ============ ЖАЛОБЫ ============
app.post('/api/reports', (req, res) => {
    const userId = Number(req.get('x-user-id'));
    const { target_type, target_id, reason } = req.body;
    if (!userId || !target_type || !target_id) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }
    db.run(
        'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)',
        [userId, target_type, target_id, reason || ''],
        function (err) {
            if (err) return res.status(500).json({ error: 'Ошибка' });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ============ ВСТРЕЧА ПО ЗАЯВКЕ ============
app.put('/api/requests/:id/meeting', (req, res) => {
    const userId = Number(req.get('x-user-id'));
    const { meeting_at, meeting_note } = req.body;
    db.get('SELECT * FROM requests WHERE id = ?', [req.params.id], (err, r) => {
        if (err || !r) return res.status(404).json({ error: 'Заявка не найдена' });
        if (Number(r.from_user_id) !== userId && Number(r.to_user_id) !== userId) {
            return res.status(403).json({ error: 'Нет доступа' });
        }
        if (r.status !== 'approved') {
            return res.status(400).json({ error: 'Только для одобренных заявок' });
        }
        db.run(
            'UPDATE requests SET meeting_at = ?, meeting_note = ? WHERE id = ?',
            [meeting_at || null, meeting_note || null, req.params.id],
            function (e2) {
                if (e2) return res.status(500).json({ error: 'Ошибка' });
                res.json({ success: true });
            }
        );
    });
});

// ============ АДМИН: блок / разблок ============
app.put('/api/admin/users/:id/block', checkAdmin, (req, res) => {
    const blocked = req.body.blocked ? 1 : 0;
    db.run('UPDATE users SET is_blocked = ? WHERE id = ?', [blocked, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: 'Ошибка' });
        const adminId = Number(req.get('x-user-id'));
        db.run(
            'INSERT INTO admin_log (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [adminId, blocked ? 'block_user' : 'unblock_user', 'user', req.params.id, '']
        );
        res.json({ success: true });
    });
});

app.get('/api/admin/log', checkAdmin, (req, res) => {
    db.all(`
        SELECT l.*, u.name as admin_name FROM admin_log l
        LEFT JOIN users u ON u.id = l.admin_id
        ORDER BY l.created_at DESC LIMIT 100
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Ошибка' });
        res.json(rows || []);
    });
});

app.get('/api/admin/reports', checkAdmin, (req, res) => {
    db.all(`
        SELECT r.*, u.name as reporter_name FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        ORDER BY r.created_at DESC LIMIT 100
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Ошибка' });
        res.json(rows || []);
    });
});

// ============ НЕПРОЧИТАННЫЕ (для бейджа в меню) ============
app.get('/api/chats-unread-total/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || Number(req.get('x-user-id')) !== userId) {
        return res.status(403).json({ error: 'Доступ запрещён' });
    }
    db.all(`
        SELECT m.chat_id, m.last_read_at FROM chat_members m WHERE m.user_id = ?
    `, [userId], (err, rows) => {
        if (err || !rows) return res.json({ total: 0 });
        if (!rows.length) return res.json({ total: 0 });
        let left = rows.length;
        let total = 0;
        rows.forEach(row => {
            const lastRead = row.last_read_at || '1970-01-01';
            db.get(
                `SELECT COUNT(*) as cnt FROM chat_messages
                 WHERE chat_id = ? AND from_user_id != ? AND created_at > ? AND IFNULL(is_deleted,0)=0`,
                [row.chat_id, userId, lastRead],
                (e2, r2) => {
                    total += (r2 && r2.cnt) || 0;
                    left--;
                    if (left === 0) res.json({ total });
                }
            );
        });
    });
});

// ============ БЭКАП БД (только админ) ============
app.get('/api/admin/backup', checkAdmin, (req, res) => {
    const src = path.resolve(process.env.DB_PATH || path.join(__dirname, 'database.db'));
    if (!fs.existsSync(src)) return res.status(404).json({ error: 'БД не найдена' });
    res.download(src, `vgm-backup-${Date.now()}.db`);
});

// Лимит подопечных при создании заявки — проверка
const originalRequestsPost = null; // marker

// ============ ЗАПУСК ============
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Файлы отдаются из: ${__dirname}`);
});
