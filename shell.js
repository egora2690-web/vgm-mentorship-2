/* =====================================================================
   shell.js — общая оболочка «как в Курсориуме» для сайта наставничества ВолгГМУ
   (боковая панель, верхняя панель, футер). Менять меню и контакты нужно только здесь.

   Как подключать на странице:
     <body data-k-lang="ru|en" data-k-active="home|catalog|requests|chats|account|catSS|catO|catWW|catN"
           data-k-ru="адрес_русской_версии" data-k-en="адрес_английской_версии">
       <main class="k-content"> ...содержимое страницы... </main>
       <script src="shell.js"></script>
   ===================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var main = document.querySelector('main.k-content');
  if (!main) { body.classList.add('k-ready'); return; }

  var lang = body.getAttribute('data-k-lang') === 'en' ? 'en' : 'ru';
  var active = body.getAttribute('data-k-active') || '';
  var ruHref = body.getAttribute('data-k-ru') || 'index.html';
  var enHref = body.getAttribute('data-k-en') || 'indexENG.html';
  // у страниц с параметрами (например, ?id=5) переключатель языка должен их сохранять
  var qs = location.search || '';
  if (ruHref.indexOf('?') < 0) ruHref += qs;
  if (enHref.indexOf('?') < 0) enHref += qs;

  var ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    clip: '<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    panel: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>'
  };

  var LINKS = {
    ru: { home: 'index.html', catalog: 'catalog.html', requests: 'my-requests.html', mentors: 'my-mentors.html', chats: 'chats.html', account: 'profile1.html',
          catSS: 'catalogSS.html', catO: 'catalogO.html', catWW: 'catalogWW.html', catN: 'catalogN.html' },
    en: { home: 'indexENG.html', catalog: 'catalogENG.html', requests: 'my-requestsENG.html', mentors: 'my-mentorsENG.html', chats: 'chatsENG.html', account: 'profile1ENG.html',
          catSS: 'catalogSSENG.html', catO: 'catalog0ENG.html', catWW: 'catalogWWENG.html', catN: 'catalogNENG.html' }
  };

  var TEXT = {
    ru: {
      brand: 'НАСТАВНИЧЕСТВО', tag: 'ВолгГМУ',
      ariaSidebar: 'Боковая панель', ariaMain: 'Основное меню', ariaToggle: 'Показать или скрыть меню', ariaLang: 'Язык',
      nav: { home: 'Главная', catalog: 'Каталог наставников', requests: 'Мои заявки', mentors: 'Моё наставничество', chats: 'Чаты', account: 'Личный кабинет' },
      howTitle: 'Как это работает', how: ['Как найти наставника', 'Как стать наставником'],
      univTitle: 'Университет', univ: ['Об университете', 'Образование', 'Медицина', 'Наука'],
      helpTitle: 'Наставничество ВолгГМУ', help: 'Нужна помощь?', accountBtn: 'Кабинет',
      f: { main: 'Главный корпус', adm: 'Приемная комиссия', rec: 'Приемная ректора', hours: 'График работы:',
           addrMain: 'г. Волгоград, площадь Павших Борцов, д. 1',
           addrAdm: 'г. Волгоград, площадь Павших Борцов, д. 1, кабинет 3-47',
           addrRec: 'г. Волгоград, площадь Павших Борцов, д. 1, каб. 3-11 (индекс 400066)',
           hMain: 'Пн — Пт: 10:00 - 18:00<br>Сб: 10:00 - 14:00',
           hAdm: 'Вт - Пт: 13:00 - 17:00<br>(для приема граждан)',
           hRec: 'Пн - Пт: 08:30 - 17:00<br>(перерыв 12:30 - 13:00)<br>Сб - Вс: выходные дни',
           legal1: 'Пользовательское соглашение', legal2: 'Политика по обработке персональных данных',
           copy: '&copy; 2026 Проект разработан для ВолгГМУ' }
    },
    en: {
      brand: 'MENTORSHIP', tag: 'VolgSMU',
      ariaSidebar: 'Sidebar', ariaMain: 'Main menu', ariaToggle: 'Show or hide menu', ariaLang: 'Language',
      nav: { home: 'Home', catalog: 'Mentor catalog', requests: 'My requests', mentors: 'My mentorship', chats: 'Chats', account: 'Account' },
      howTitle: 'How it works', how: ['How to find a mentor', 'How to become a mentor'],
      univTitle: 'University', univ: ['About the University', 'Education', 'Medicine', 'Science'],
      helpTitle: 'VolgSMU Mentorship', help: 'Need help?', accountBtn: 'Account',
      f: { main: 'Main building', adm: 'Admissions office', rec: "Rector's office", hours: 'Working hours:',
           addrMain: '1 Pavshikh Bortsov Square, Volgograd',
           addrAdm: '1 Pavshikh Bortsov Square, Volgograd, room 3-47',
           addrRec: '1 Pavshikh Bortsov Square, Volgograd, room 3-11 (postal code 400066)',
           hMain: 'Mon — Fri: 10:00 - 18:00<br>Sat: 10:00 - 14:00',
           hAdm: 'Tue - Fri: 13:00 - 17:00<br>(public reception hours)',
           hRec: 'Mon - Fri: 08:30 - 17:00<br>(break 12:30 - 13:00)<br>Sat - Sun: closed',
           legal1: 'User Agreement', legal2: 'Personal Data Processing Policy',
           copy: '&copy; 2026 Project developed for VolgSMU' }
    }
  };

  var L = LINKS[lang], T = TEXT[lang];
  var UNIV_URLS = ['https://www.volgmed.ru/university/', 'https://www.volgmed.ru/education/', 'https://www.volgmed.ru/medicine/', 'https://www.volgmed.ru/science/'];

  function cur(key) { return active === key ? ' aria-current="page"' : ''; }
  function navItem(key, icon) {
    var extra = '';
    if (key === 'chats') extra = ' <span class="k-nav-badge" id="kChatsBadge" hidden></span>';
    if (key === 'requests') extra = ' <span class="k-nav-badge" id="kReqBadge" hidden></span>';
    return '<li><a href="' + L[key] + '"' + cur(key) + '>' + ICON[icon] + T.nav[key] + extra + '</a></li>';
  }

  var markSvg = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';

  var sidebar =
    '<aside class="k-sidebar" id="kSidebar" aria-label="' + T.ariaSidebar + '">' +
      '<a class="k-brand" href="' + L.home + '"><span class="k-brand-mark" aria-hidden="true">' + markSvg + '</span>' +
        '<span class="k-brand-text"><span class="k-brand-tag">' + T.tag + '</span><br>' + T.brand + '</span></a>' +
      '<nav class="k-card" aria-label="' + T.ariaMain + '"><ul class="k-nav">' +
        navItem('home', 'home') + navItem('catalog', 'search') + navItem('requests', 'clip') + navItem('mentors', 'users') + navItem('chats', 'chat') + navItem('account', 'user') +
      '</ul></nav>' +
      '<nav class="k-card" aria-label="' + T.howTitle + '"><p class="k-card-title">' + T.howTitle + '</p><ul class="k-nav k-nav--programs">' +
        '<li><a href="' + L.home + '#how-to-find">' + T.how[0] + '</a></li>' +
        '<li><a href="' + L.home + '#how-to-become">' + T.how[1] + '</a></li>' +
      '</ul></nav>' +
      '<nav class="k-card" aria-label="' + T.univTitle + '"><p class="k-card-title">' + T.univTitle + '</p><ul class="k-nav k-nav--programs">' +
        T.univ.map(function (t, i) { return '<li><a href="' + UNIV_URLS[i] + '" target="_blank" rel="noopener">' + t + '</a></li>'; }).join('') +
      '</ul></nav>' +
    '</aside>' +
    '<div class="k-backdrop" id="kBackdrop"></div>';

  var topbar =
    '<header class="k-topbar">' +
      '<button class="k-icon-btn" id="kToggle" type="button" aria-label="' + T.ariaToggle + '" aria-controls="kSidebar" aria-expanded="true">' + ICON.panel + '</button>' +
      '<a class="k-brand-mark" href="' + L.home + '" aria-label="' + T.brand + '">' + markSvg + '</a>' +
      '<div class="k-lang" role="group" aria-label="' + T.ariaLang + '">' + ICON.flag +
        '<a href="' + ruHref + '"' + (lang === 'ru' ? ' class="is-active" aria-current="true"' : '') + '>RU</a>' +
        '<a href="' + enHref + '"' + (lang === 'en' ? ' class="is-active" aria-current="true"' : '') + '>EN</a>' +
      '</div>' +
      '<span class="k-spacer"></span>' +
      '<div class="k-help"><span>' + T.helpTitle + '</span><a href="mailto:post@volgmed.ru">' + T.help + '</a></div>' +
      '<button type="button" class="k-theme-btn" id="kThemeToggle" aria-label="' + (lang === 'en' ? 'Dark theme' : 'Тёмная тема') + '" title="' + (lang === 'en' ? 'Dark theme' : 'Тёмная тема') + '">' +
        '<svg class="k-theme-icon k-theme-icon--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 14.3A8.5 8.5 0 019.7 3a7 7 0 1011.3 11.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<svg class="k-theme-icon k-theme-icon--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<a class="k-user" href="' + L.account + '"><i>' + ICON.user + '</i><span>' + T.accountBtn + '</span></a>' +
    '</header>';

  function col(title, tel, telText, addr, mail, hrs) {
    return '<div class="pf-col"><h4>' + title + '</h4>' +
      '<p class="pf-row">' + ICON.phone + '<a href="tel:' + tel + '">' + telText + '</a></p>' +
      '<p class="pf-row">' + ICON.pin + '<span>' + addr + '</span></p>' +
      '<p class="pf-row">' + ICON.mail + '<a href="mailto:' + mail + '">' + mail + '</a></p>' +
      '<p class="pf-schedule"><strong>' + T.f.hours + '</strong>' + hrs + '</p></div>';
  }

  var vk = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.576-1.496c.587-.188 1.34 1.263 2.14 1.822.604.422 1.063.33 1.063.33l2.135-.03s1.116-.07.587-.953c-.043-.072-.306-.654-1.577-1.85-1.33-1.256-1.153-1.053.45-3.229.976-1.323 1.367-2.13 1.245-2.476-.117-.33-.842-.243-.842-.243l-2.404.015s-.178-.025-.31.055c-.13.078-.213.262-.213.262s-.382 1.026-.89 1.9c-1.074 1.83-1.504 1.927-1.68 1.814-.407-.27-.306-1.092-.306-1.674 0-1.82.27-2.578-.527-2.774-.263-.064-.456-.106-1.13-.113-.863-.009-1.594.003-2.008.208-.276.136-.488.44-.359.457.163.021.53.1.725.368.252.345.243 1.12.243 1.12s.145 2.14-.337 2.406c-.33.182-.784-.19-1.755-1.888-.497-.867-.872-1.826-.872-1.826s-.073-.178-.202-.273c-.157-.116-.377-.152-.377-.152l-2.286.015s-.343.01-.47.16c-.112.134-.008.41-.008.41s1.79 4.234 3.816 6.366c1.858 1.955 3.968 1.826 3.968 1.826l.957-.06z"/></svg>';
  var tg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';

  var footer =
    '<footer class="portal-footer"><div class="portal-footer__card">' +
      '<div class="pf-cols">' +
        col(T.f.main, '+78442385005', '+7 (8442) 38-50-05', T.f.addrMain, 'post@volgmed.ru', T.f.hMain) +
        col(T.f.adm, '+78442532333', '+7 (8442) 53-23-33', T.f.addrAdm, 'priem@volgmed.ru', T.f.hAdm) +
        col(T.f.rec, '+78442385005', '+7 (8442) 38-50-05', T.f.addrRec, 'post@volgmed.ru', T.f.hRec) +
      '</div>' +
      /* TODO: подставь реальные ссылки на документы портала вместо # */
      '<div class="pf-links"><a href="#">' + T.f.legal1 + '</a><a href="#">' + T.f.legal2 + '</a></div>' +
      '<div class="pf-bottom"><span>' + T.f.copy + '</span><div class="pf-social">' +
        '<a href="https://vk.com/volggmu" target="_blank" rel="noopener" class="pf-social-link" aria-label="VK">' + vk + '</a>' +
        '<a href="https://t.me/volggmu_vuz" target="_blank" rel="noopener" class="pf-social-link" aria-label="Telegram">' + tg + '</a>' +
        '<a href="https://max.ru/id3444048472_biz" target="_blank" rel="noopener" class="pf-social-link" aria-label="MAX"><img src="https://mari-el.gov.ru/upload/iblock/ff2/wiu6p92d5b9r5t9cr4tvv8dwbt3iwiej.png" alt="MAX"></a>' +
      '</div></div>' +
    '</div></footer>';

  /* --- собираем каркас вокруг содержимого страницы --- */
  var shell = document.createElement('div');
  shell.className = 'k-shell';
  shell.id = 'kShell';
  shell.innerHTML = sidebar + '<div class="k-main">' + topbar + '<div id="kSlot"></div>' + footer + '</div>';
  body.insertBefore(shell, body.firstChild);
  var slot = shell.querySelector('#kSlot');
  slot.parentNode.replaceChild(main, slot);


  /* --- поведение меню --- */
  var btn = document.getElementById('kToggle');
  var backdrop = document.getElementById('kBackdrop');
  var mq = window.matchMedia('(max-width: 960px)');

  function isOpen() { return mq.matches ? shell.classList.contains('k-open') : !shell.classList.contains('k-collapsed'); }
  function setOpen(open) {
    if (mq.matches) { shell.classList.toggle('k-open', open); }
    else { shell.classList.toggle('k-collapsed', !open); }
    btn.setAttribute('aria-expanded', String(open));
  }
  btn.addEventListener('click', function () { setOpen(!isOpen()); });
  backdrop.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mq.matches && isOpen()) setOpen(false); });
  shell.querySelectorAll('.k-sidebar a').forEach(function (a) {
    a.addEventListener('click', function () { if (mq.matches) setOpen(false); });
  });
  function sync() { shell.classList.remove('k-open'); btn.setAttribute('aria-expanded', String(isOpen())); }
  if (mq.addEventListener) mq.addEventListener('change', sync); else mq.addListener(sync);
  sync();

  /* --- данные вошедшего пользователя: имя/фото в верхней панели и счётчик новых заявок --- */
  (function () {
    var user = null;
    try { user = JSON.parse(localStorage.getItem('vgm_current_user') || 'null'); } catch (e) { user = null; }
    if (!user || !user.id) return;

    var chip = shell.querySelector('.k-user');
    if (chip) {
      var circle = chip.querySelector('i');
      var label = chip.querySelector('span');
      var name = String(user.name || '').trim();
      if (typeof user.avatar === 'string' && /^(data:image\/|https?:\/\/)/i.test(user.avatar)) {
        var img = document.createElement('img');
        img.alt = ''; img.src = user.avatar;
        circle.textContent = ''; circle.appendChild(img);
      } else if (name) {
        circle.textContent = name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
      }
      if (name && label) label.textContent = name.split(/\s+/)[0];
      if (name) chip.title = name;
    }

    var link = shell.querySelector('.k-sidebar a[href="' + L.requests + '"]');
    if (!link || !window.fetch) return;
    fetch('/api/requests/' + encodeURIComponent(user.id))
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        if (!Array.isArray(list)) return;
        var n = list.filter(function (r) { return r.to_user_id === user.id && r.status === 'pending'; }).length;
        if (!n) return;
        var b = document.createElement('span');
        b.className = 'k-badge-count';
        b.textContent = n > 99 ? '99+' : String(n);
        link.appendChild(b);
        link.setAttribute('aria-label', link.textContent.replace(b.textContent, '').trim() + ', ' + (lang === 'en' ? 'new: ' : 'новых: ') + n);
      })
      .catch(function () { /* сервер недоступен — счётчик просто не показываем */ });
  })();


  /* --- панель инструментов как в Курсориуме --- */
  (function () {
    var A = {
      ru: {
        fab: 'Инструменты', title: 'Инструменты',
        focus: 'Фокус', images: 'Изображения', on: 'Вкл', off: 'Выкл',
        general: 'Общие настройки', cursor: 'Размер курсора', speak: 'Читать страницу', stopSpeak: 'Стоп',
        color: 'Цвет', auto: 'Автоконтраст', light: 'Светлый', dark: 'Темный',
        font: 'Шрифт', fontSize: 'Размер текста', serif: 'С засечками', sans: 'Без засечек',
        motion: 'Без анимации', reset: 'Сбросить'
      },
      en: {
        fab: 'Tools', title: 'Tools',
        focus: 'Focus', images: 'Images', on: 'On', off: 'Off',
        general: 'General', cursor: 'Cursor size', speak: 'Read page', stopSpeak: 'Stop',
        color: 'Color', auto: 'Autocontrast', light: 'Light', dark: 'Dark',
        font: 'Font', fontSize: 'Text size', serif: 'Serif', sans: 'Sans-serif',
        motion: 'No animations', reset: 'Reset'
      }
    }[lang];

    var KEY = 'k_a11y', MAXFS = 4, MAXCUR = 2;
    var st = { fs: 0, cursor: 0, theme: 'light', serif: false, focus: false, images: true, motion: false };
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) {
        st.fs = Math.max(0, Math.min(MAXFS, +saved.fs || 0));
        st.cursor = Math.max(0, Math.min(MAXCUR, +saved.cursor || 0));
        if (saved.theme === 'dark' || saved.theme === 'contrast' || saved.theme === 'light') st.theme = saved.theme;
        else if (saved.dark) st.theme = 'dark';
        else if (saved.contrast) st.theme = 'contrast';
        st.serif = !!saved.serif;
        st.focus = !!saved.focus;
        st.images = saved.images !== false;
        st.motion = !!saved.motion;
      }
    } catch (e) {}

    var root = document.documentElement;
    var speaking = false;
    var ico = {
      cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l7 16 1.5-6L20 11.5z"/></svg>',
      speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M16 9a4 4 0 010 6"/><path d="M18.5 7a7 7 0 010 10"/></svg>',
      contrast: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3a9 9 0 000 18V3z" fill="currentColor"/></svg>',
      sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 14.3A8.5 8.5 0 019.7 3a7 7 0 1011.3 11.3z"/></svg>',
      text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 18V7h5.5v11M8.5 18h5M14 11h4.5v7M15.5 14.5h2"/></svg>',
      aa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18L9 6l5 12M6.2 13h5.6M15 18l3-8 3 8M16.6 14h3"/></svg>',
      reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9"/><path d="M3 5v7h7"/></svg>'
    };

    var fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'k-a11y-fab';
    fab.setAttribute('aria-label', A.fab);
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'kA11yPanel');
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M9 21l3-6.5 3 6.5"/></svg>';

    var panel = document.createElement('div');
    panel.id = 'kA11yPanel'; panel.className = 'k-a11y-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', A.title);
    panel.innerHTML =
      '<div class="k-a11y-head"><h2>' + A.title + '</h2><div class="k-a11y-head-actions">' +
        '<button type="button" class="k-a11y-iconbtn" data-a="reset" title="' + A.reset + '" aria-label="' + A.reset + '">' + ico.reset + '</button>' +
        '<button type="button" class="k-a11y-iconbtn k-a11y-close" data-a="close" aria-label="Close">×</button>' +
      '</div></div>' +
      '<div class="k-a11y-list">' +
        '<div class="k-a11y-line"><span>' + A.focus + '</span><button type="button" class="k-switch" role="switch" data-a="focus" aria-checked="false"><span class="k-switch-label" data-a="focusLab">' + A.off + '</span></button></div>' +
        '<div class="k-a11y-line"><span>' + A.images + '</span><button type="button" class="k-switch" role="switch" data-a="images" aria-checked="true"><span class="k-switch-label" data-a="imagesLab">' + A.on + '</span></button></div>' +
        '<div class="k-a11y-line"><span>' + A.motion + '</span><button type="button" class="k-switch" role="switch" data-a="motion" aria-checked="false"><span class="k-switch-label" data-a="motionLab">' + A.off + '</span></button></div>' +
      '</div>' +
      '<div class="k-a11y-section"><div class="k-a11y-label">' + A.general + '</div><div class="k-a11y-tiles">' +
        '<button type="button" class="k-a11y-tile" data-a="cursor"><span class="k-a11y-ico">' + ico.cursor + '</span><span>' + A.cursor + '</span><span class="k-a11y-meter" data-a="cursorMeter"></span></button>' +
        '<button type="button" class="k-a11y-tile" data-a="speak"><span class="k-a11y-ico">' + ico.speak + '</span><span data-a="speakLabel">' + A.speak + '</span></button>' +
      '</div></div>' +
      '<div class="k-a11y-section"><div class="k-a11y-label">' + A.color + '</div><div class="k-a11y-tiles k-a11y-tiles--3">' +
        '<button type="button" class="k-a11y-tile" data-a="theme" data-v="contrast"><span class="k-a11y-ico">' + ico.contrast + '</span><span>' + A.auto + '</span></button>' +
        '<button type="button" class="k-a11y-tile" data-a="theme" data-v="light"><span class="k-a11y-ico">' + ico.sun + '</span><span>' + A.light + '</span></button>' +
        '<button type="button" class="k-a11y-tile" data-a="theme" data-v="dark"><span class="k-a11y-ico">' + ico.moon + '</span><span>' + A.dark + '</span></button>' +
      '</div></div>' +
      '<div class="k-a11y-section"><div class="k-a11y-label">' + A.font + '</div><div class="k-a11y-tiles">' +
        '<button type="button" class="k-a11y-tile" data-a="fontsize"><span class="k-a11y-ico">' + ico.text + '</span><span>' + A.fontSize + '</span><span class="k-a11y-meter" data-a="fsMeter"></span></button>' +
        '<button type="button" class="k-a11y-tile" data-a="serif"><span class="k-a11y-ico">' + ico.aa + '</span><span data-a="serifLabel">' + A.sans + '</span></button>' +
      '</div></div>';

    body.appendChild(fab);
    body.appendChild(panel);

    function q(name) { return panel.querySelector('[data-a="' + name + '"]'); }
    function meter(n, max) {
      var s = '';
      for (var i = 0; i <= max; i++) s += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
      return s;
    }
    function setSwitch(name, on) {
      var el = q(name); if (!el) return;
      el.setAttribute('aria-checked', String(!!on));
      var lab = q(name + 'Lab'); if (lab) lab.textContent = on ? A.on : A.off;
    }
    function apply() {
      root.style.fontSize = st.fs ? (100 + st.fs * 10) + '%' : '';
      root.classList.toggle('k-contrast', st.theme === 'contrast');
      root.classList.toggle('k-dark', st.theme === 'dark');
      root.classList.toggle('k-nomotion', st.motion);
      root.classList.toggle('k-serif', st.serif);
      root.classList.toggle('k-focus', st.focus);
      root.classList.toggle('k-noimages', !st.images);
      root.classList.remove('k-cursor-1', 'k-cursor-2');
      if (st.cursor === 1) root.classList.add('k-cursor-1');
      if (st.cursor === 2) root.classList.add('k-cursor-2');
      var cm = q('cursorMeter'); if (cm) cm.innerHTML = meter(st.cursor, MAXCUR);
      var fm = q('fsMeter'); if (fm) fm.innerHTML = meter(st.fs, Math.min(3, MAXFS));
      var sl = q('serifLabel'); if (sl) sl.textContent = st.serif ? A.serif : A.sans;
      panel.querySelectorAll('[data-a="theme"]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-v') === st.theme);
      });
      setSwitch('focus', st.focus);
      setSwitch('images', st.images);
      setSwitch('motion', st.motion);
      var tb = document.getElementById('kThemeToggle');
      if (tb) {
        tb.classList.toggle('is-dark', st.theme === 'dark');
        tb.setAttribute('aria-pressed', st.theme === 'dark' ? 'true' : 'false');
      }
      try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    }
    function setOpen(open) {
      panel.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
    }
    function stopSpeak() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      speaking = false;
      var lab = q('speakLabel'); if (lab) lab.textContent = A.speak;
    }
    function toggleSpeak() {
      if (!window.speechSynthesis) return;
      if (speaking) { stopSpeak(); return; }
      var text = ((document.querySelector('main') || document.body).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 8000);
      if (!text) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'en' ? 'en-US' : 'ru-RU';
      u.onend = function () { speaking = false; var lab = q('speakLabel'); if (lab) lab.textContent = A.speak; };
      speaking = true;
      var lab = q('speakLabel'); if (lab) lab.textContent = A.stopSpeak;
      window.speechSynthesis.speak(u);
    }

    fab.addEventListener('click', function () { setOpen(panel.hidden); });
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a]');
      if (!t) return;
      var a = t.getAttribute('data-a');
      if (a === 'close') setOpen(false);
      else if (a === 'cursor') st.cursor = st.cursor >= MAXCUR ? 0 : st.cursor + 1;
      else if (a === 'speak') toggleSpeak();
      else if (a === 'theme') st.theme = t.getAttribute('data-v') || 'light';
      else if (a === 'fontsize') st.fs = st.fs >= MAXFS ? 0 : st.fs + 1;
      else if (a === 'serif') st.serif = !st.serif;
      else if (a === 'focus') st.focus = !st.focus;
      else if (a === 'images') st.images = !st.images;
      else if (a === 'motion') st.motion = !st.motion;
      else if (a === 'reset') {
        st = { fs: 0, cursor: 0, theme: 'light', serif: false, focus: false, images: true, motion: false };
        stopSpeak();
      } else return;
      apply();
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !fab.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); fab.focus(); }
    });

    // кнопка луны в шапке
    var themeBtn = document.getElementById('kThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        st.theme = (st.theme === 'dark') ? 'light' : 'dark';
        apply();
      });
    }
    apply();
  })();

  var stBadge = document.createElement('style');
  stBadge.textContent = '.k-nav-badge{display:inline-flex;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:999px;background:#e11d48;color:#fff;font-size:11px;font-weight:800;align-items:center;justify-content:center;vertical-align:middle}.k-nav-badge[hidden]{display:none!important}';
  document.head.appendChild(stBadge);

  (function () {
    try {
      var u = JSON.parse(localStorage.getItem('vgm_current_user') || 'null');
      if (!u || !u.id) return;
      function setBadge(id, n) {
        var el = document.getElementById(id);
        if (!el) return;
        if (n > 0) { el.hidden = false; el.textContent = n > 99 ? '99+' : String(n); }
        else { el.hidden = true; el.textContent = ''; }
      }
      function tick() {
        fetch('/api/chats-unread-total/' + u.id, { headers: { 'x-user-id': String(u.id) } })
          .then(function (r) { return r.json(); }).then(function (d) { setBadge('kChatsBadge', (d && d.total) || 0); }).catch(function () {});
        fetch('/api/requests-pending-count/' + u.id, { headers: { 'x-user-id': String(u.id) } })
          .then(function (r) { return r.json(); }).then(function (d) {
            var c = (d && d.count) || 0; setBadge('kReqBadge', c);
          }).catch(function () {});
        fetch('/api/presence', { method: 'POST', headers: { 'x-user-id': String(u.id) } }).catch(function () {});
      }
      tick(); setInterval(tick, 15000);
    } catch (e) {}
  })();

  body.classList.add('k-ready');
})();
