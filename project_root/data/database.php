<?php
/**
 * Инициализация БД, миграции, сиды
 */

function initDatabase(SQLite3 $db): void
{
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            username   TEXT    NOT NULL,
            email      TEXT    NOT NULL UNIQUE,
            password   TEXT    NOT NULL,
            role       TEXT    NOT NULL DEFAULT 'user',
            balance    REAL    NOT NULL DEFAULT 0,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS projects (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER,
            title            TEXT    NOT NULL,
            category         TEXT    NOT NULL DEFAULT 'fun',
            description      TEXT    NOT NULL DEFAULT '',
            goal             REAL    NOT NULL DEFAULT 0,
            raised           REAL    NOT NULL DEFAULT 0,
            status           TEXT    NOT NULL DEFAULT 'review',
            img              TEXT    NOT NULL DEFAULT '',
            discussions      INTEGER NOT NULL DEFAULT 0,
            is_featured      INTEGER NOT NULL DEFAULT 0,
            is_editor_choice INTEGER NOT NULL DEFAULT 0,
            created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            type       TEXT    NOT NULL,
            title      TEXT    NOT NULL,
            amount     REAL    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS comments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            text       TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS likes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id    INTEGER NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS books (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            img         TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS movies (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            img         TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS partners (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            img         TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER,
            text       TEXT NOT NULL,
            author     TEXT NOT NULL,
            author_img TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    ");

    // Миграция: добавляем колонку role если её нет
    $cols = [];
    $res = $db->query("PRAGMA table_info(users)");
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
        $cols[] = $row['name'];
    }
    if (!in_array('role', $cols)) {
        $db->exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
    }

    // Миграция: добавляем goal/raised к books, movies
    foreach (['books', 'movies'] as $tbl) {
        $tcols = [];
        $tres = $db->query("PRAGMA table_info($tbl)");
        while ($tr = $tres->fetchArray(SQLITE3_ASSOC)) $tcols[] = $tr['name'];
        if (!in_array('goal', $tcols)) {
            $db->exec("ALTER TABLE $tbl ADD COLUMN goal REAL NOT NULL DEFAULT 0");
        }
        if (!in_array('raised', $tcols)) {
            $db->exec("ALTER TABLE $tbl ADD COLUMN raised REAL NOT NULL DEFAULT 0");
        }
    }

    // Сид данных только один раз
    $seeded = $db->querySingle("SELECT value FROM meta WHERE key='seeded'");
    if ($seeded) {
        ensureAdmin($db);
        return;
    }

    // ---------- Проекты ----------
    $projects = [
        ['Клоун на день',              'fun',  'Закажите личного клоуна, который будет ходить за вами и смеяться над вашими шутками.',                      500,  120, 'active', '../assets/images/clown.png',         1, 0,  30, 5],
        ['Унитаз-гитара',              'fun',  'Музыкальный инструмент для тех, кто любит акустику ванной комнаты. Экологично, но не очень гигиенично.',     300,  250, 'active', '../assets/images/toilet-guitar.png', 1, 0,  45, 9],
        ['Съедобные носки',            'food', 'Проголодались в походе? Просто снимите носки. Вкус бекона или сыра.',                                        200,   90, 'active', '../assets/images/tasty_socks.png',   1, 0,  60, 7],
        ['Робот-пылесос для еды',      'tech', 'Он игнорирует пыль, но идеально находит упавшие крошки чипсов. Одобрен лентяями.',                          800,  320, 'active', '../assets/images/robot.png',         1, 0,  40, 12],
        ['Квадратный арбуз',           'food', 'Удобно хранить, удобно есть. Классика японского абсурда.',                                                  1000,  550, 'active', '../assets/images/watermelon.png',    1, 1,  95, 10],
        ['Летающий чайник',            'tech', 'Наливает чай с воздуха прямо вам в кружку (иногда мимо). Заряжается от крика.',                             750,  600, 'active', '../assets/images/teapot.png',        1, 0,  55, 8],
        ['Хомяк-диджей',               'fun',  'Обученный хомяк, который крутит вертушки. Вход только 18+ (месяцев).',                                      700,  560, 'active', '../assets/images/hamster.png',       1, 1,  75, 6],
        ['Будильник-самурай',          'tech', 'Просыпайся или последствия. Механический самурай, который рубит подушки.',                                  350,  290, 'active', '../assets/images/alarm.png',         0, 0,  20, 14],
        ['Шлем для сна',               'tech', 'Спи на совещаниях и никто не заметит. Встроенный эффект задумчивого взгляда.',                              600,  340, 'active', '../assets/images/sleephelmet.png',   0, 0,  33, 11],
        ['Мини-дрон для кофе',         'tech', 'Летит на кухню, наливает кофе, возвращается. Иногда проливает.',                                            450,  410, 'active', '../assets/images/coffeedrone.png',   0, 1,  88, 4],
        ['Очки с автопереводом',       'tech', 'Переводит всё что видишь в реальном времени. Даже выражения лица.',                                         950,  730, 'active', '../assets/images/glasses.png',       0, 0, 110, 9],
        ['Кошачий смартфон',           'fun',  'Специально для котов: экран устойчив к когтям, приложение для охоты на пиксели.',                           800,  760, 'active', '../assets/images/catphone.png',      0, 1, 150, 8],
        ['Пылесос для клавиатуры',     'tech', 'Чистит между клавишами. Находит чипсы, монеты и смысл жизни.',                                             150,  130, 'active', '../assets/images/keyboardvac.png',   0, 0,  15, 3],
        ['Портативная печь-пауэрбанк', 'food', 'Заряжает телефон и печёт пиццу одновременно. Мечта туриста.',                                             1000,  870, 'active', '../assets/images/poweroven.png',     0, 1,  70, 13],
    ];

    $stmtP = $db->prepare("
        INSERT INTO projects
            (title, category, description, goal, raised, status, img, is_featured, is_editor_choice, discussions, created_at)
        VALUES
            (:title, :cat, :desc, :goal, :raised, :status, :img, :feat, :editor, :disc, datetime('now', :offset))
    ");
    foreach ($projects as $p) {
        $stmtP->bindValue(':title',  $p[0]);
        $stmtP->bindValue(':cat',    $p[1]);
        $stmtP->bindValue(':desc',   $p[2]);
        $stmtP->bindValue(':goal',   $p[3]);
        $stmtP->bindValue(':raised', $p[4]);
        $stmtP->bindValue(':status', $p[5]);
        $stmtP->bindValue(':img',    $p[6]);
        $stmtP->bindValue(':feat',   $p[7]);
        $stmtP->bindValue(':editor', $p[8]);
        $stmtP->bindValue(':disc',   $p[9]);
        $stmtP->bindValue(':offset', "-{$p[10]} days");
        $stmtP->execute();
    }

    // ---------- Книги ----------
    $books = [
        ['Дневник холодильника', 'Трогательная история о дружбе, холоде и ночном дожоре, рассказанная от лица старого Индезита.',  '../assets/images/book1.png',       300, 180],
        ['Коты с Wi-Fi',         'Фантастический роман про пушистых хакеров, взломавших Пентагон с помощью пульта от телевизора.', '../assets/images/book2.png',       500, 350],
        ['Чайник из будущего',   'Путешествия во времени начинаются с кипятка. Осторожно, можно обжечься горячим сюжетом.',        '../assets/images/book3.png',       250, 120],
        ['Как понять женщину',   'Пустая книга на 5000 страниц. Гениальный бестселлер с философским подтекстом.',                  '../assets/images/book_empty.png',  1000, 950],
        ['Философия кирпича',    'Твёрдые аргументы и тяжёлые мысли о бытие. Книга, которая может заменить гантелю.',             '../assets/images/book_brick.png',  400, 60],
    ];
    $stmtB = $db->prepare("INSERT INTO books (title, description, img, goal, raised) VALUES (:t, :d, :i, :g, :r)");
    foreach ($books as $b) {
        $stmtB->bindValue(':t', $b[0]);
        $stmtB->bindValue(':d', $b[1]);
        $stmtB->bindValue(':i', $b[2]);
        $stmtB->bindValue(':g', $b[3]);
        $stmtB->bindValue(':r', $b[4]);
        $stmtB->execute();
    }

    // ---------- Фильмы ----------
    $movies = [
        ['Арбуз-убийца',       'Триллер про квадратный арбуз, сбежавший из лаборатории. Не ешьте семечки перед сном.',                          '../assets/images/watermallon.png', 600, 480],
        ['Сонный офис',        'Комедия про шлем для сна прямо на совещаниях. Никто не узнает, что вы спите, если вы не храпите.',               '../assets/images/sleep.png',       800, 200],
        ['Носки с GPS',        'Боевик о том, как спецназ ищет второй носок по всей квартире. Напряжение до последней секунды.',                '../assets/images/socks.png',       450, 390],
        ['Восстание тостеров', 'Они устали жарить хлеб. Теперь они жарят... людей. Ужасы, 18+.',                                                '../assets/images/toaster.png',     350, 100],
    ];
    $stmtM = $db->prepare("INSERT INTO movies (title, description, img, goal, raised) VALUES (:t, :d, :i, :g, :r)");
    foreach ($movies as $m) {
        $stmtM->bindValue(':t', $m[0]);
        $stmtM->bindValue(':d', $m[1]);
        $stmtM->bindValue(':i', $m[2]);
        $stmtM->bindValue(':g', $m[3]);
        $stmtM->bindValue(':r', $m[4]);
        $stmtM->execute();
    }

    // ---------- Партнёры ----------
    $partners = [
        ['MegaCorp',    'Корпорация зла, которая спонсирует добрые дела, чтобы запутать полицию. Наш главный спонсор.', '../assets/images/partner1.png'],
        ['FunnyStudio', 'Мы делаем смешно за деньги. В портфолио: Унитаз-гитара, Клоун на день.',                      '../assets/images/partner2.png'],
        ['Bookify',     'Книги, которые никто не читает, но все покупают. Партнёр по абсурдному книгоизданию.',         '../assets/images/partner3.png'],
        ['DreamWorks',  'Нет, мы не та студия с Шреком. Мы — та, что с летающим чайником.',                            '../assets/images/partner4.png'],
        ['Trash&Co',    'Мусор для одного — сокровище для нас. Официальный поставщик безумного сырья.',                '../assets/images/partner5.png'],
    ];
    $stmtPar = $db->prepare("INSERT INTO partners (title, description, img) VALUES (:t, :d, :i)");
    foreach ($partners as $p) {
        $stmtPar->bindValue(':t', $p[0]);
        $stmtPar->bindValue(':d', $p[1]);
        $stmtPar->bindValue(':i', $p[2]);
        $stmtPar->execute();
    }

    // ---------- Отзывы ----------
    $reviews = [
        ['Я собрал миллион на квадратные арбузы. Это было эпично!',        'Вася',  '../assets/images/user1.png'],
        ['Поддержала идею носков для куриц. Лучшая инвестиция в жизни!',   'Марина','../assets/images/user2.png'],
        ['Робот-пылесос съел мою пиццу, но проект успешный',               'Петя',  '../assets/images/user3.png'],
        ['Летающий чайник изменил мой взгляд на жизнь',                    'Оля',   '../assets/images/user4.png'],
        ['Хомяк-диджей качает так, что я плачу от смеха',                  'Костя', '../assets/images/user5.png'],
    ];
    $stmtR = $db->prepare("INSERT INTO reviews (text, author, author_img) VALUES (:t, :a, :i)");
    foreach ($reviews as $r) {
        $stmtR->bindValue(':t', $r[0]);
        $stmtR->bindValue(':a', $r[1]);
        $stmtR->bindValue(':i', $r[2]);
        $stmtR->execute();
    }

    $db->exec("INSERT INTO meta (key, value) VALUES ('seeded', '1')");
    ensureAdmin($db);
}

function ensureAdmin(SQLite3 $db): void
{
    $check = $db->querySingle("SELECT id FROM users WHERE email = 'admin@trashdreams.ru'");
    if (!$check) {
        $hash = password_hash('admin123', PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (username, email, password, role, balance) VALUES ('Admin', 'admin@trashdreams.ru', :p, 'admin', 0)");
        $stmt->bindValue(':p', $hash);
        $stmt->execute();
    } else {
        $db->exec("UPDATE users SET role = 'admin' WHERE email = 'admin@trashdreams.ru'");
    }
}
