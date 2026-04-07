<?php
/**
 * TrashDream's — Backend API (роутер)
 *
 * Роутинг через query-параметр ?action=group.method
 *
 * Модули:
 *   helpers.php   — вспомогательные функции
 *   database.php  — инициализация БД, миграции, сиды
 *   auth.php      — авторизация
 *   projects.php  — проекты (CRUD, поиск, поддержка)
 *   balance.php   — баланс (пополнение, вывод)
 *   admin.php     — панель администратора
 *   comments.php  — комментарии к проектам
 *   likes.php     — лайки и избранное
 *   upload.php    — загрузка изображений
 *   home.php      — статистика и данные главной
 */

// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================
define('DB_FILE', __DIR__ . '/trashdreams.db');
define('SESSION_NAME', 'trashdreams_session');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// ============================================================
// ПОДКЛЮЧЕНИЕ МОДУЛЕЙ
// ============================================================
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/projects.php';
require_once __DIR__ . '/balance.php';
require_once __DIR__ . '/admin.php';
require_once __DIR__ . '/comments.php';
require_once __DIR__ . '/likes.php';
require_once __DIR__ . '/upload.php';
require_once __DIR__ . '/home.php';

// ============================================================
// ЗАГОЛОВКИ
// ============================================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
// СЕССИЯ
// ============================================================
session_name(SESSION_NAME);
session_start();

// ============================================================
// БАЗА ДАННЫХ
// ============================================================
try {
    $db = new SQLite3(DB_FILE);
    $db->enableExceptions(true);
    $db->exec('PRAGMA journal_mode=WAL');
    $db->exec('PRAGMA foreign_keys=ON');
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Ошибка подключения к базе данных: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

initDatabase($db);

if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// ============================================================
// ПАРСИНГ ЗАПРОСА
// ============================================================
$method = $_SERVER['REQUEST_METHOD'];
$action = trim($_GET['action'] ?? '');
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

$body = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $raw = file_get_contents('php://input');
    if ($raw) {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) $body = $decoded;
    }
    foreach ($_POST as $k => $v) {
        $body[$k] = $v;
    }
}

// ============================================================
// РОУТИНГ
// ============================================================
try {
    switch ($action) {
        // ---- АВТОРИЗАЦИЯ ----
        case 'auth.register':
            requireMethod('POST');
            handleRegister($db, $body);
            break;

        case 'auth.login':
            requireMethod('POST');
            handleLogin($db, $body);
            break;

        case 'auth.logout':
            handleLogout();
            break;

        case 'auth.me':
            handleMe($db);
            break;

        case 'auth.update':
            requireMethod('POST');
            requireAuthSession();
            handleAuthUpdate($db, $body);
            break;

        // ---- ПРОЕКТЫ ----
        case 'projects.list':
            handleProjectsList($db);
            break;

        case 'projects.featured':
            handleProjectsFeatured($db);
            break;

        case 'projects.new':
            handleProjectsNew($db);
            break;

        case 'projects.discussed':
            handleProjectsDiscussed($db);
            break;

        case 'projects.editor_choice':
            handleProjectsEditorChoice($db);
            break;

        case 'projects.get':
            handleProjectGet($db, $id);
            break;

        case 'projects.create':
            requireMethod('POST');
            requireAuthSession();
            handleProjectCreate($db, $body);
            break;

        case 'projects.update':
            requireMethod('POST');
            requireAuthSession();
            handleProjectUpdate($db, $id, $body);
            break;

        case 'projects.delete':
            requireAuthSession();
            handleProjectDelete($db, $id);
            break;

        case 'projects.support':
            requireMethod('POST');
            requireAuthSession();
            handleProjectSupport($db, $id, $body);
            break;

        // ---- КОММЕНТАРИИ ----
        case 'comments.list':
            handleCommentsList($db, $id);
            break;

        case 'comments.add':
            requireMethod('POST');
            requireAuthSession();
            handleCommentAdd($db, $id, $body);
            break;

        case 'comments.delete':
            requireMethod('POST');
            requireAuthSession();
            handleCommentDelete($db, $id);
            break;

        // ---- ЛАЙКИ И ИЗБРАННОЕ ----
        case 'likes.toggle':
            requireMethod('POST');
            requireAuthSession();
            handleLikeToggle($db, $id);
            break;

        case 'favorites.toggle':
            requireMethod('POST');
            requireAuthSession();
            handleFavoriteToggle($db, $id);
            break;

        // ---- БАЛАНС ----
        case 'balance.get':
            requireAuthSession();
            handleBalanceGet($db);
            break;

        case 'balance.deposit':
            requireMethod('POST');
            requireAuthSession();
            handleBalanceDeposit($db, $body);
            break;

        case 'balance.withdraw':
            requireMethod('POST');
            requireAuthSession();
            handleBalanceWithdraw($db, $body);
            break;

        // ---- АДМИНКА ----
        case 'admin.projects':
            requireAuthSession();
            requireAdmin($db);
            handleAdminProjects($db);
            break;

        case 'admin.approve':
            requireMethod('POST');
            requireAuthSession();
            requireAdmin($db);
            handleAdminApprove($db, $id);
            break;

        case 'admin.reject':
            requireMethod('POST');
            requireAuthSession();
            requireAdmin($db);
            handleAdminReject($db, $id);
            break;

        case 'admin.set_featured':
            requireMethod('POST');
            requireAuthSession();
            requireAdmin($db);
            handleAdminSetFeatured($db, $id, $body);
            break;

        case 'admin.set_editor':
            requireMethod('POST');
            requireAuthSession();
            requireAdmin($db);
            handleAdminSetEditor($db, $id, $body);
            break;

        case 'admin.delete_project':
            requireMethod('POST');
            requireAuthSession();
            requireAdmin($db);
            handleAdminDeleteProject($db, $id);
            break;

        case 'admin.stats':
            requireAuthSession();
            requireAdmin($db);
            handleAdminStats($db);
            break;

        // ---- ЗАГРУЗКА ИЗОБРАЖЕНИЙ ----
        case 'upload.image':
            requireMethod('POST');
            requireAuthSession();
            handleImageUpload();
            break;

        // ---- СТАТИСТИКА ----
        case 'stats':
            handleStats($db);
            break;

        // ---- ГЛАВНАЯ СТРАНИЦА ----
        case 'home':
            handleHome($db);
            break;

        default:
            jsonError('Неизвестный action: ' . htmlspecialchars($action), 404);
    }
} catch (Exception $e) {
    jsonError('Внутренняя ошибка: ' . $e->getMessage(), 500);
}
