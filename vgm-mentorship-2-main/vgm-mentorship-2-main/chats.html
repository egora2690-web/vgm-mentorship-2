<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Мои чаты | ВолгГМУ</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Manrope', sans-serif; background-color: #f8fafc; }
        .vgm-green { color: #007a5e; }
        .vgm-bg-green { background-color: #007a5e; }
        .avatar-placeholder {
            background: #e2e8f0;
            display: flex; align-items: center; justify-content: center; color: #94a3b8;
        }
    </style>
</head>
<body class="min-h-screen text-slate-900">

    <header class="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="profile1.html" class="text-sm font-bold text-slate-500 hover:text-slate-800 transition">
                ← Кабинет
            </a>
            <h1 class="font-extrabold text-lg vgm-green">💬 ЧАТЫ</h1>
            <button onclick="openCreateModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
                ➕ Создать
            </button>
        </div>
    </header>

    <!-- ПОИСК -->
    <div class="max-w-4xl mx-auto px-6 pt-6">
        <input type="text" id="searchInput" placeholder="🔍 Поиск чатов..." 
            class="w-full bg-white border border-slate-200 p-3 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500 transition">
    </div>

    <!-- СПИСОК ЧАТОВ -->
    <main class="max-w-4xl mx-auto px-6 py-6 pb-20">
        <div id="loadingState" class="text-center py-20">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            <p class="text-slate-500 mt-4">Загрузка чатов...</p>
        </div>

        <div id="chatsList" class="space-y-3 hidden"></div>

        <div id="emptyState" class="hidden text-center py-20">
            <div class="text-6xl mb-4">💬</div>
            <h3 class="text-xl font-extrabold text-slate-800 mb-2">Пока нет чатов</h3>
            <p class="text-slate-500 mb-6">Создайте чат или начните общение через заявку</p>
            <button onclick="openCreateModal()" class="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition">
                ➕ Создать чат
            </button>
        </div>
    </main>

    <!-- МОДАЛКА СОЗДАНИЯ ЧАТА -->
    <div id="createModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden justify-center items-center p-4">
        <div class="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-extrabold text-slate-800">Создать чат</h3>
                <button onclick="closeCreateModal()" class="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>

            <!-- Тип чата -->
            <div class="flex rounded-xl overflow-hidden mb-4 border border-slate-100">
                <button onclick="switchType('personal')" id="personalTabBtn" class="flex-1 py-3 text-sm font-bold bg-emerald-600 text-white">
                    👤 Личный
                </button>
                <button onclick="switchType('group')" id="groupTabBtn" class="flex-1 py-3 text-sm font-bold bg-slate-100 text-slate-600">
                    👥 Группа
                </button>
            </div>

            <!-- Название группы (только для группы) -->
            <div id="groupNameField" class="hidden mb-4">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Название группы</label>
                <input type="text" id="groupName" placeholder="Например: БТСиТ-2026" 
                    class="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500 transition">
            </div>

            <!-- Поиск пользователей -->
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Найти пользователей</label>
            <input type="text" id="userSearch" placeholder="Введите имя..." 
                oninput="searchUsers(this.value)"
                class="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl font-semibold text-slate-700 outline-none focus:border-emerald-500 transition mb-4">

            <!-- Результаты поиска -->
            <div id="searchResults" class="space-y-2 mb-4 max-h-48 overflow-y-auto"></div>

            <!-- Выбранные участники -->
            <div id="selectedUsers" class="mb-4"></div>

            <!-- Кнопка создать -->
            <button onclick="createChat()" class="w-full vgm-bg-green text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition">
                Создать
            </button>
        </div>
    </div>

    <script>
        const API_URL = '/api';
        let currentUser = null;
        let allChats = [];
        let filteredChats = [];
        let chatType = 'personal';
        let selectedUsers = [];

        // Проверка авторизации
        function checkAuth() {
            const saved = localStorage.getItem('vgm_current_user');
            if (!saved) {
                alert('Войдите в аккаунт');
                window.location.href = 'profile1.html';
                return false;
            }
            currentUser = JSON.parse(saved);
            return true;
        }

        // Загрузка чатов
        async function loadChats() {
            try {
                const response = await fetch(`${API_URL}/chats/${currentUser.id}`);
                const data = await response.json();
                allChats = data;
                filterChats();
                document.getElementById('loadingState').classList.add('hidden');
            } catch (error) {
                console.error(error);
                document.getElementById('loadingState').innerHTML = 
                    '<p class="text-red-500 font-bold">Ошибка загрузки</p>';
            }
        }

        // Фильтр чатов
        function filterChats() {
            const search = document.getElementById('searchInput').value.trim().toLowerCase();

            filteredChats = allChats.filter(c => {
                if (!search) return true;
                const name = (c.display_name || '').toLowerCase();
                return name.includes(search);
            });

            renderChats();
        }

        // Рендер чатов
        function renderChats() {
            const list = document.getElementById('chatsList');
            const empty = document.getElementById('emptyState');

            if (filteredChats.length === 0) {
                list.classList.add('hidden');
                empty.classList.remove('hidden');
                return;
            }

            empty.classList.add('hidden');
            list.classList.remove('hidden');

            list.innerHTML = filteredChats.map(chat => {
                const avatarHTML = chat.display_avatar
                    ? `<img src="${chat.display_avatar}" class="w-full h-full object-cover">`
                    : chat.is_group
                        ? `<div class="text-2xl">👥</div>`
                        : `<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>`;

                const lastMsg = chat.last_message 
                    ? chat.last_message.substring(0, 40) + (chat.last_message.length > 40 ? '...' : '')
                    : 'Нет сообщений';

                return `
                    <a href="chat-new.html?id=${chat.id}" 
                       class="block bg-white rounded-2xl p-4 border border-slate-100 hover:border-emerald-300 hover:shadow-md transition">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl overflow-hidden avatar-placeholder flex-shrink-0">
                                ${avatarHTML}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start gap-2">
                                    <h3 class="font-bold text-slate-800 truncate">${chat.display_name || 'Без названия'}</h3>
                                    ${chat.is_group ? '<span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Группа</span>' : ''}
                                </div>
                                <p class="text-sm text-slate-400 truncate">${lastMsg}</p>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');
        }

        // Переключение типа чата
        function switchType(type) {
            chatType = type;
            document.getElementById('personalTabBtn').className = 
                'flex-1 py-3 text-sm font-bold ' + (type === 'personal' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600');
            document.getElementById('groupTabBtn').className = 
                'flex-1 py-3 text-sm font-bold ' + (type === 'group' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600');
            document.getElementById('groupNameField').classList.toggle('hidden', type !== 'group');
        }

        // Открыть модалку создания
        function openCreateModal() {
            selectedUsers = [];
            document.getElementById('userSearch').value = '';
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('selectedUsers').innerHTML = '';
            document.getElementById('groupName').value = '';
            document.getElementById('createModal').style.display = 'flex';
        }

        function closeCreateModal() {
            document.getElementById('createModal').style.display = 'none';
        }

        // Поиск пользователей
        let searchTimeout;
        function searchUsers(query) {
            clearTimeout(searchTimeout);
            
            if (!query || query.length < 2) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`);
                    const users = await response.json();
                    
                    const results = users.filter(u => u.id !== currentUser.id);

                    document.getElementById('searchResults').innerHTML = results.map(u => `
                        <button onclick="addUser(${u.id}, '${u.name.replace(/'/g, "\\'")}', '${u.avatar || ''}')" 
                            class="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition text-left">
                            <div class="w-10 h-10 rounded-xl overflow-hidden avatar-placeholder flex-shrink-0">
                                ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : '👤'}
                            </div>
                            <div>
                                <p class="font-bold text-sm text-slate-800">${u.name}</p>
                                <p class="text-xs text-slate-400">${u.role}</p>
                            </div>
                        </button>
                    `).join('') || '<p class="text-slate-400 text-sm text-center py-2">Ничего не найдено</p>';
                } catch (e) {
                    console.error(e);
                }
            }, 300);
        }

        // Добавить пользователя
        function addUser(id, name, avatar) {
            if (selectedUsers.find(u => u.id === id)) return;
            
            if (chatType === 'personal' && selectedUsers.length >= 1) {
                alert('Для личного чата — только 1 человек');
                return;
            }

            selectedUsers.push({ id, name, avatar });
            renderSelectedUsers();
            document.getElementById('userSearch').value = '';
            document.getElementById('searchResults').innerHTML = '';
        }

        // Убрать пользователя
        function removeUser(id) {
            selectedUsers = selectedUsers.filter(u => u.id !== id);
            renderSelectedUsers();
        }

        // Рендер выбранных
        function renderSelectedUsers() {
            document.getElementById('selectedUsers').innerHTML = selectedUsers.map(u => `
                <div class="flex items-center justify-between bg-emerald-50 rounded-xl p-2 mb-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg overflow-hidden avatar-placeholder flex-shrink-0">
                            ${u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : '👤'}
                        </div>
                        <span class="font-bold text-sm text-emerald-800">${u.name}</span>
                    </div>
                    <button onclick="removeUser(${u.id})" class="text-red-500 hover:text-red-700 font-bold">×</button>
                </div>
            `).join('');
        }

        // Создать чат
        async function createChat() {
            if (selectedUsers.length === 0) {
                alert('Выберите хотя бы одного пользователя');
                return;
            }

            if (chatType === 'personal' && selectedUsers.length !== 1) {
                alert('Для личного чата — 1 человек');
                return;
            }

            const name = document.getElementById('groupName').value.trim();

            if (chatType === 'group' && !name) {
                alert('Введите название группы');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/chats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: chatType === 'group' ? name : null,
                        is_group: chatType === 'group',
                        member_ids: selectedUsers.map(u => u.id),
                        created_by: currentUser.id
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    closeCreateModal();
                    window.location.href = `chat-new.html?id=${data.chat_id}`;
                } else {
                    alert(data.error || 'Ошибка');
                }
            } catch (e) {
                console.error(e);
                alert('Не удалось создать чат');
            }
        }

        document.getElementById('searchInput').addEventListener('input', filterChats);

        if (checkAuth()) {
            loadChats();
        }
    </script>

</body>
</html>