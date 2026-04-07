<?php
/**
 * Вспомогательные функции
 */

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function jsonError(string $message, int $status = 400): void
{
    jsonResponse(['success' => false, 'error' => $message], $status);
}

function jsonOk($data = null, string $message = 'OK'): void
{
    $resp = ['success' => true, 'message' => $message];
    if ($data !== null) $resp['data'] = $data;
    jsonResponse($resp);
}

function requireMethod(string $expected): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $expected) {
        jsonError("Метод не разрешён. Ожидается: $expected.", 405);
    }
}

function requireAuthSession(): void
{
    if (empty($_SESSION['user_id'])) {
        jsonError('Необходима авторизация.', 401);
    }
}

function requireAdmin(SQLite3 $db): void
{
    $uid = currentUserId();
    $stmt = $db->prepare("SELECT role FROM users WHERE id = :id");
    $stmt->bindValue(':id', $uid, SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    if (!$row || $row['role'] !== 'admin') {
        jsonError('Доступ запрещён. Требуются права администратора.', 403);
    }
}

function currentUserId(): int
{
    return (int)$_SESSION['user_id'];
}
