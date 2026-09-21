const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./database');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));
// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isImage = file.mimetype.startsWith('image/');
        const dir = isImage ? 'uploads/images' : 'uploads/files';
        
        // Создаём папку, если нет
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

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
                    is_admin: user.is_admin
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
        res.json(requests);
    });
});

// ============ ОДОБРИТЬ / ОТКЛОНИТЬ ЗАЯВКУ ============
app.put('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Неверный статус' });
    }

    const chatLink = status === 'approved' ? `/chat.html?request=${id}` : null;

    db.run(
        'UPDATE requests SET status = ?, chat_link = ? WHERE id = ?',
        [status, chatLink, id],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка обновления' });
            }
            res.json({ success: true, chat_link: chatLink });
        }
    );
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
        SELECT id, login, name, role, direction, avatar, is_admin, created_at 
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

    if (!created_by || !member_ids || !Array.isArray(member_ids)) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }

    // Добавляем создателя в участники
    const allMembers = [...new Set([created_by, ...member_ids])];

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

    db.all(`
        SELECT c.id, c.name, c.is_group, c.avatar, c.created_at,
               (SELECT text FROM chat_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM chat_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chats c
        JOIN chat_members m ON c.id = m.chat_id
        WHERE m.user_id = ?
        ORDER BY COALESCE(last_message_at, c.created_at) DESC
    `, [userId], (err, chats) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }

        // Для каждого чата получаем участников
        const chatsWithMembers = [];
        let pending = chats.length;

        if (pending === 0) {
            return res.json([]);
        }

        chats.forEach(chat => {
            db.all(`
                SELECT u.id, u.name, u.avatar 
                FROM chat_members m
                JOIN users u ON m.user_id = u.id
                WHERE m.chat_id = ?
            `, [chat.id], (err, members) => {
                if (err) {
                    console.error(err);
                    members = [];
                }

                chat.members = members;
                
                // Для личного чата — имя собеседника
                if (!chat.is_group) {
                    const other = members.find(m => m.id != userId);
                    if (other) {
                        chat.display_name = other.name;
                        chat.display_avatar = other.avatar;
                    }
                } else {
                    chat.display_name = chat.name || 'Группа';
                }

                chatsWithMembers.push(chat);
                pending--;

                if (pending === 0) {
                    res.json(chatsWithMembers);
                }
            });
        });
    });
});

// ============ ИНФОРМАЦИЯ О ЧАТЕ ============
app.get('/api/chats/:id/info', (req, res) => {
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
            SELECT u.id, u.name, u.avatar, u.role
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
app.get('/api/chats/:id/messages', (req, res) => {
    const { id } = req.params;

    db.all(`
        SELECT m.*, u.name as from_name, u.avatar as from_avatar
        FROM chat_messages m
        LEFT JOIN users u ON m.from_user_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
    `, [id], (err, messages) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(messages);
    });
});

// ============ ОТПРАВИТЬ СООБЩЕНИЕ ============
app.post('/api/chats/:id/messages', (req, res) => {
    const { id } = req.params;
    const { from_user_id, text } = req.body;

    if (!from_user_id || !text) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }

    // Проверяем, что пользователь в чате
    db.get('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ?', [id, from_user_id], (err, member) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!member) {
            return res.status(403).json({ error: 'Вы не участник этого чата' });
        }

        db.run(
            'INSERT INTO chat_messages (chat_id, from_user_id, text) VALUES (?, ?, ?)',
            [id, from_user_id, text],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Ошибка отправки' });
                }
                res.json({ success: true, id: this.lastID });
            }
        );
    });
});

// ============ ЗАГРУЗИТЬ ФАЙЛ ============
app.post('/api/chats/:id/upload', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { from_user_id } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    if (!from_user_id) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const fileUrl = '/' + req.file.path.replace(/\\/g, '/');

    db.run(
        `INSERT INTO chat_messages (chat_id, from_user_id, attachment_url, attachment_type, attachment_name) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, from_user_id, fileUrl, isImage ? 'image' : 'file', req.file.originalname],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Ошибка сохранения' });
            }
            res.json({ 
                success: true, 
                id: this.lastID,
                url: fileUrl,
                type: isImage ? 'image' : 'file',
                name: req.file.originalname
            });
        }
    );
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
// ============ ЗАПУСК ============
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Файлы отдаются из: ${__dirname}`);
});