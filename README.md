[README.md](https://github.com/user-attachments/files/32535698/README.md)
# vgm-mentorship

Веб-платформа наставничества Волгоградского государственного медицинского университета (ВолгГМУ).

Сервис позволяет студентам, ординаторам и молодым врачам находить наставников, отправлять заявки, общаться в чатах и оставлять отзывы. Реализована админ-панель для управления пользователями и заявками. Поддерживаются русская и английская версии интерфейса, мобильная адаптация и тёмная тема.

**Живой сайт:** https://vgm-mentorship-2-1.onrender.com/

---

## Содержание

- [Стек технологий](#стек-технологий)
- [Структура проекта](#структура-проекта)
- [Требования](#требования)
- [Установка и локальный запуск](#установка-и-локальный-запуск)
- [Переменные окружения](#переменные-окружения)
- [База данных](#база-данных)
- [Схема базы данных](#схема-базы-данных)
- [API endpoints](#api-endpoints)
- [Важные нюансы кода](#важные-нюансы-кода)
- [Деплой на Render](#деплой-на-render)
- [Мобильная адаптация](#мобильная-адаптация)
- [Известные ограничения](#известные-ограничения)
- [Частые проблемы и решения](#частые-проблемы-и-решения)

---

## Стек технологий

**Backend:**
- Node.js 22.x (см. `.node-version`)
- Express 4.x
- SQLite 5.1.7 (`sqlite3`)
- bcryptjs — хеширование паролей
- multer — загрузка файлов
- cors — CORS
- nodemailer — почтовые уведомления (в текущем коде не задействован)

**Frontend:**
- Чистый HTML + CSS + JavaScript (без сборки)
- Tailwind CSS через CDN (`cdn.tailwindcss.com`) на внутренних страницах
- Кастомный `style.css` для главной страницы
- Шрифты Google Fonts: Manrope, Inter
- Авторизация на клиенте — `localStorage`

---

## Структура проекта

```
vgm-mentorship/
├── server.js                          # Точка входа, Express-сервер, все API-роуты
├── database.js                        # Инициализация SQLite, CREATE TABLE
├── database.db                        # Файл БД (создаётся автоматически)
├── package.json
├── package-lock.json
├── .node-version                      # Версия Node.js (22.22.2)
├── .gitattributes
├── README.md
├── style.css                          # Стили главной страницы
│
├── index.html / indexENG.html         # Главная (RU/EN)
├── catalog.html / catalogENG.html     # Каталог наставников
├── catalogSS.html / catalogSSENG.html # Программа «Студент-Студент»
├── catalogO.html / catalog0ENG.html   # Программа «Ординатор-Студент»
├── catalogWW.html / catalogWWENG.html # Программа «Врач-Специалист — Молодой Врач»
├── catalogN.html / catalogNENG.html   # Программа «Научное наставничество»
├── profile1.html / profile1ENG.html   # Личный кабинет + вход/регистрация
├── profile-view.html / profile-viewENG.html # Публичный профиль наставника
├── my-requests.html / my-requestsENG.html   # Заявки
├── chats.html / chatsENG.html         # Список чатов
├── chat-new.html / chat-newENG.html   # Чат (новый мессенджер)
├── chat.html / chatENG.html           # Старый чат по заявке
├── admin.html                         # Админ-панель
├── profile2.html                      # Демо-профиль (не используется)
│
├── uploads/                           # Загруженные файлы (создаётся автоматически)
│   ├── images/
│   └── files/
│
├── logo_volggmu.png
└── volggmu_building.jpg
```

---

## Требования

- **Node.js** 22.x
- **npm**
- Свободный порт `3000` (или задайте через `PORT`)

---

## Установка и локальный запуск

### 1. Клонирование

```bash
git clone https://github.com/egora2690-web/VolgGMU.git
cd VolgGMU
```

### 2. Установка зависимостей

```bash
npm install
```

> ⚠️ `sqlite3` — нативный модуль. На чистой системе могут потребоваться build-tools:
> - **Linux:** `apt install build-essential python3`
> - **macOS:** `xcode-select --install`
> - **Windows:** Visual Studio Build Tools + Python

### 3. Запуск

```bash
npm start
```

или

```bash
node server.js
```

При первом запуске:
- создастся файл `database.db` со всеми таблицами
- создадутся папки `uploads/images` и `uploads/files`
- сервер поднимется на `http://localhost:3000`

Открой: **http://localhost:3000/index.html**

### 4. Создание первого администратора

Публичной регистрации админов нет. Чтобы получить доступ к `admin.html`:

1. Зарегистрируйся через `profile1.html`
2. Войди в SQLite:
   ```bash
   sqlite3 database.db "UPDATE users SET is_admin = 1 WHERE login = 'твой_логин';"
   ```
3. Перезайди в аккаунт — появится доступ к `admin.html`

---

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `DB_PATH` | `./database.db` | Путь к файлу БД (для Persistent Disk) |
| `UPLOAD_DIR` | `uploads` | Папка для загруженных файлов |

`.env`-файл **не используется**. Render задаёт переменные через Dashboard → Environment.

Пример запуска на другом порту:

```bash
PORT=8080 npm start
```

---

## База данных

**СУБД:** SQLite 5.1.7
**Файл:** `database.db` (по умолчанию в корне проекта)
**Путь:** захардкожен в `database.js`:

```js
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');
```

**Особенности SQLite:**
- Не требует отдельного сервера
- Вся БД — один файл
- Поддерживает параллельное чтение, запись блокирует файл
- ⚠️ **Не подходит для PaaS без Persistent Disk** — файл теряется при ребилдах

**Резервная копия:**

```bash
cp database.db database.backup.db
```

**Восстановление:** положите файл обратно и перезапустите сервер.

---

## Схема базы данных

Все таблицы создаются в `database.js` через `CREATE TABLE IF NOT EXISTS`.

### `users` — пользователи

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | ID |
| `login` | TEXT UNIQUE NOT NULL | Логин |
| `name` | TEXT NOT NULL | ФИО |
| `password` | TEXT NOT NULL | Хеш bcrypt |
| `role` | TEXT DEFAULT 'Наставник ВолгГМУ' | Роль |
| `direction` | TEXT | JSON направления (level, name, form, duration, code, description) |
| `avatar` | TEXT | Data URL или путь к файлу |
| `is_admin` | INTEGER DEFAULT 0 | Флаг админа |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | Дата регистрации |

### `requests` — заявки наставнику

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | ID |
| `from_user_id` | INTEGER FK → users.id | Отправитель |
| `to_user_id` | INTEGER FK → users.id | Получатель |
| `message` | TEXT | Текст заявки |
| `status` | TEXT DEFAULT 'pending' | `pending` / `approved` / `rejected` |
| `chat_link` | TEXT | Ссылка на чат после одобрения |
| `created_at` | DATETIME | Дата |

### `messages` — старые сообщения по заявкам

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | ID |
| `request_id` | INTEGER FK → requests.id | Заявка |
| `from_user_id` | INTEGER FK → users.id | Автор |
| `message` | TEXT NOT NULL | Текст |
| `created_at` | DATETIME | Дата |

### `reviews` — отзывы

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | ID |
| `mentor_id` | INTEGER FK → users.id | Наставник |
| `author_id` | INTEGER FK → users.id | Автор |
| `rating` | INTEGER NOT NULL | 1–5 |
| `text` | TEXT | Текст отзыва |
| `created_at` | DATETIME | Дата |

### `chats` — чаты (новый мессенджер)

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | ID |
| `name` | TEXT | Название (для групп) |
| `is_group` | INTEGER DEFAULT 0 | 0 — личный, 1 — группа |
| `avatar` | TEXT | Аватар группы |
| `created_by` | INTEGER FK → users.id | Создатель |
| `created_at` | DATETIME | Дата |

### `chat_members` — участники чатов

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | ID |
| `chat_id` | INTEGER FK → chats.id | Чат |
| `user_id` | INTEGER FK → users.id | Пользователь |
| `joined_at` | DATETIME | Дата вступления |
| `last_read_at` | DATETIME | Последнее прочтение |

### `chat_messages` — сообщения чатов

| Поле | Тип | Описание |
|---|---|---|
| `id` | INTEGER PK | ID |
| `chat_id` | INTEGER FK → chats.id | Чат |
| `from_user_id` | INTEGER FK → users.id | Автор |
| `text` | TEXT | Текст (может быть NULL для файлов) |
| `attachment_url` | TEXT | Путь к файлу |
| `attachment_type` | TEXT | `image` / `file` |
| `attachment_name` | TEXT | Имя файла |
| `created_at` | DATETIME | Дата |

### `schema.sql` — дамп схемы

Полный SQL для создания структуры (если нужно вручную):

```sql
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
);

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
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentor_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mentor_id) REFERENCES users(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    is_group INTEGER DEFAULT 0,
    avatar TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

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
);
```

---

## API endpoints

Базовый префикс: `/api`.

### Аутентификация

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/register` | Регистрация |
| POST | `/api/login` | Вход |

### Пользователи

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/api/users` | Все пользователи |
| GET | `/api/users/search?q=...` | Поиск (мин. 2 символа) ⚠️ **объявлен ДО** `/api/users/:id` |
| GET | `/api/users/:id` | Один пользователь |
| PUT | `/api/users/:id` | Обновить профиль |

### Наставники

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/api/mentors` | Список наставников |
| GET | `/api/mentors-with-rating` | С рейтингом и кол-вом отзывов |

### Заявки

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/requests` | Создать |
| GET | `/api/requests/:userId` | Заявки пользователя |
| PUT | `/api/requests/:id` | Одобрить / отклонить |

### Сообщения (старый чат по заявке)

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/messages` | Отправить |
| GET | `/api/messages/:requestId` | Получить |

### Чаты

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/chats` | Создать |
| GET | `/api/chats/:userId` | Чаты пользователя (с последним сообщением) |
| GET | `/api/chats/:id/info` | Информация о чате |
| GET | `/api/chats/:id/messages` | Сообщения |
| POST | `/api/chats/:id/messages` | Отправить |
| POST | `/api/chats/:id/upload` | Загрузить файл (multipart) |

### Отзывы

| Метод | Endpoint | Описание |
|---|---|---|
| POST | `/api/reviews` | Оставить |
| GET | `/api/reviews/:mentorId` | Список |
| GET | `/api/reviews/:mentorId/rating` | Средний рейтинг |

### Админ (требуют `x-user-id` и `is_admin = 1`)

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/api/admin/stats` | Статистика |
| GET | `/api/admin/users` | Все пользователи |
| DELETE | `/api/admin/users/:id` | Удалить |
| PUT | `/api/admin/users/:id/make-admin` | Сделать админом |
| PUT | `/api/admin/users/:id/remove-admin` | Снять права |
| GET | `/api/admin/requests` | Все заявки |
| DELETE | `/api/admin/requests/:id` | Удалить заявку |

---

## Важные нюансы кода

### 1. Порядок роутов в Express

`/api/users/search` **обязан** быть объявлен **до** `/api/users/:id`. Иначе Express сматчит `search` как `:id` и вернёт `{"error":"Пользователь не найден"}`.

```js
// ✅ ПРАВИЛЬНО
app.get('/api/users/search', ...);  // сначала
app.get('/api/users/:id', ...);     // потом

// ❌ НЕПРАВИЛЬНО
app.get('/api/users/:id', ...);     // перехватит /search
app.get('/api/users/search', ...);  // никогда не вызовется
```

### 2. Поиск по кириллице в SQLite

SQLite `LOWER()` **не работает с русскими буквами** — только с ASCII. Поэтому поиск фильтруется **в JavaScript**:

```js
db.all(`SELECT id, login, name, avatar, role FROM users`, [], (err, users) => {
    const search = q.toLowerCase().trim();
    const filtered = users.filter(u => {
        const name = (u.name || '').toLowerCase();
        const login = (u.login || '').toLowerCase();
        return name.includes(search) || login.includes(search);
    }).slice(0, 10);
    res.json(filtered);
});
```

### 3. Последнее сообщение в списке чатов

Поле `text` может быть `NULL` (если отправили только файл). Поэтому в `/api/chats/:userId` последнее сообщение формируется отдельно:

```js
db.get(`SELECT text, attachment_type, attachment_name, created_at
        FROM chat_messages WHERE chat_id = ?
        ORDER BY created_at DESC, id DESC LIMIT 1`, [chat.id], (err, msg) => {
    if (msg.text) chat.last_message = msg.text;
    else if (msg.attachment_type === 'image') chat.last_message = '📷 Фото';
    else if (msg.attachment_name) chat.last_message = '📎 ' + msg.attachment_name;
    else chat.last_message = '📎 Файл';
});
```

---

## Деплой на Render

### ⚠️ Главная проблема: SQLite на Render

Render использует **эфемерную файловую систему**. При каждом деплое / рестарте:
- `database.db` **удаляется** → все пользователи, заявки, чаты, отзывы пропадают
- `uploads/` **удаляется** → все аватарки и вложения пропадают

**Без Persistent Disk проект теряет все данные при каждом деплое.**

### Шаг 1. Подключить Persistent Disk

1. Render Dashboard → твой сервис → **Disks** → **Add Disk**
2. Заполни:
   - **Name**: `vgm-data`
   - **Mount Path**: `/data`
   - **Size**: `1 GB`
3. **Save**

### Шаг 2. Поправить пути в коде

`database.js`:
```js
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');
```

`server.js` (multer):
```js
const baseDir = process.env.UPLOAD_DIR || 'uploads';
const dir = isImage ? `${baseDir}/images` : `${baseDir}/files`;
```

### Шаг 3. Задать переменные в Render

Render Dashboard → Environment:
```
DB_PATH=/data/database.db
UPLOAD_DIR=/data/uploads
```

### Шаг 4. Настройки сервиса

Render Dashboard → Settings:

| Поле | Значение |
|---|---|
| **Repository** | `egora2690-web/VolgGMU` |
| **Branch** | `main` |
| **Auto-Deploy** | `Yes` |
| **Root Directory** | *(пусто)* |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### Шаг 5. Первый админ после деплоя

Render Dashboard → твой сервис → **Shell**:

```bash
sqlite3 /data/database.db "UPDATE users SET is_admin = 1 WHERE login = 'твой_логин';"
```

### Альтернатива: миграция на PostgreSQL

Render предоставляет managed Postgres. Это правильное решение для продакшена. Но требует переписать `database.js` под `pg` и заменить `db.run/get/all` на SQL-совместимые запросы.

---

## Мобильная адаптация

Сделана **без ломки десктопа** — все правила внутри `@media (max-width: 768px)`.

### Что реализовано

- **Бургер-меню** `☰` — на мобильных весь хедер (меню, поиск, языки, кнопки) собирается в выпадающую панель под хедером
- **Hero** — заголовок 24px, кнопки в столбик
- **Программы** — одна колонка
- **How-to / Become mentor** — флекс-контейнеры в колонку
- **Футер** — одна колонка, по центру
- **Чаты** — `100dvh` вместо `100vh` (учитывает динамический адресный бар iOS)
- **Тач-таргеты** — минимум 44×44px

### Базовые CSS-правила (вне медиа)

```css
.mobile-menu-btn { display: none; }
.header-nav-wrap { display: contents; }
body.menu-locked { overflow: hidden; }
```

Внутри `@media (max-width: 768px)`:
```css
.mobile-menu-btn { display: inline-flex !important; ... }
.header-nav-wrap { display: none !important; position: absolute; ... }
.header-nav-wrap.menu-open { display: flex !important; }
```

### Скрипт бургера

```js
function toggleMobileMenu() {
    const wrap = document.getElementById('headerNavWrap');
    const btn  = document.querySelector('.mobile-menu-btn');
    const open = wrap.classList.toggle('menu-open');
    btn.textContent = open ? '✕' : '☰';
    document.body.classList.toggle('menu-locked', open);
}
```

---



## Известные ограничения

- **SQLite** не подходит для высокой нагрузки и горизонтального масштабирования
- **Пароли** хранятся с bcrypt (ок), но **JWT/сессии отсутствуют** — клиент доверяет `localStorage`. Для продакшена нужна серверная авторизация
- **Загрузка файлов** не ограничена по типам (только размер 10 МБ). Стоит добавить whitelist MIME-типов
- **CORS** открыт для всех (`app.use(cors())`). Для продакшена ограничить origin
- **`nodemailer`** в зависимостях, но в коде не используется
- **Старый и новый чаты** сосуществуют (`messages` + `chat_messages`). Стоит определиться с одним
- **Нет rate limiting** — эндпоинты уязвимы к брутфорсу и спаму
- **Нет HTTPS** из коробки — нужен reverse-proxy (Nginx/Caddy) или облачный LB
- **`database.db` не в git** — при клонировании создастся пустая БД

---

## Частые проблемы и решения

### `Cannot GET /mentors/catalog.html`

**Причина:** ссылка ведёт на `mentors/catalog.html`, но папки `mentors/` нет — файл в корне.

**Решение:** заменить `mentors/catalog.html` → `catalog.html` в `index.html` и `indexENG.html`.

### `SyntaxError: Unexpected token '<', "<!DOCTYPE ... is not valid JSON`

**Причина:** в `package.json` лежит HTML. Render не может распарсить.

**Решение:** заменить содержимое `package.json` на валидный JSON:
```json
{
  "name": "vgm-mentorship",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "multer": "^2.4.0",
    "nodemailer": "^10.0.10",
    "sqlite3": "^5.1.7"
  }
}
```

### `{"error":"Пользователь не найден"}` при `/api/users/search?q=...`

**Причина:** `/api/users/search` объявлен **после** `/api/users/:id`. Express перехватывает `search` как `:id`.

**Решение:** переместить `/api/users/search` **выше** `/api/users/:id`.

### Поиск не находит русские имена

**Причина:** SQLite `LOWER()` не работает с кириллицей.

**Решение:** фильтровать в JavaScript (см. [Важные нюансы кода](#важные-нюансы-кода)).

### «Нет сообщений» в лобби чатов при отправке фото

**Причина:** поле `text` пустое для сообщений с вложением.

**Решение:** в `/api/chats/:userId` формировать `last_message` с учётом `attachment_type` и `attachment_name`.

### Не работает мобильное меню (бургер `☰` не появляется)

**Причина:** незакрытая `}` в `style.css` — весь мобильный CSS «прилипает» к предыдущему правилу.

**Решение:** проверить баланс фигурных скобок в `style.css`. Особенно после `.hidden-el.show-el { ... }`.

### Данные пропадают после деплоя

**Причина:** Render эфемерен, `database.db` удаляется.

**Решение:** подключить **Persistent Disk** (см. [Деплой на Render](#деплой-на-render)).

---

## Лицензия

Проект разработан для ВолгГМУ.

---

## Авторы

- **Разработчик:** Зюбин Никита Алексеевич(huhu53306@gmail.com), Антонов Егор Александрович(egora2690@gmail.com)
- **Организация:** Волгоградский государственный медицинский университет
