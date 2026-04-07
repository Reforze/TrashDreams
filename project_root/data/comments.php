<?php
/**
 * Комментарии: list, add, delete
 */

function handleCommentsList(SQLite3 $db, ?int $projectId): void
{
    if (!$projectId) jsonError('Не указан id проекта');

    $stmt = $db->prepare("
        SELECT c.*, u.username AS author
        FROM   comments c
        JOIN   users u ON c.user_id = u.id
        WHERE  c.project_id = :pid
        ORDER  BY c.created_at ASC
    ");
    $stmt->bindValue(':pid', $projectId, SQLITE3_INTEGER);
    $result = $stmt->execute();

    $rows = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = $row;
    }

    jsonOk($rows);
}

function handleCommentAdd(SQLite3 $db, ?int $projectId, array $body): void
{
    if (!$projectId) jsonError('Не указан id проекта');

    $text = trim($body['text'] ?? '');
    if (!$text) jsonError('Введите текст комментария');
    if (mb_strlen($text) > 1000) jsonError('Комментарий слишком длинный (максимум 1000 символов)');

    // Проверяем что проект существует
    $check = $db->prepare("SELECT id FROM projects WHERE id = :id");
    $check->bindValue(':id', $projectId, SQLITE3_INTEGER);
    if (!$check->execute()->fetchArray()) {
        jsonError('Проект не найден', 404);
    }

    $userId = currentUserId();

    $stmt = $db->prepare("
        INSERT INTO comments (project_id, user_id, text)
        VALUES (:pid, :uid, :text)
    ");
    $stmt->bindValue(':pid',  $projectId, SQLITE3_INTEGER);
    $stmt->bindValue(':uid',  $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':text', $text);
    $stmt->execute();

    // Увеличиваем счётчик обсуждений
    $db->exec("UPDATE projects SET discussions = discussions + 1 WHERE id = $projectId");

    // Возвращаем новый комментарий
    $commentId = $db->lastInsertRowID();
    $uStmt = $db->prepare("SELECT username FROM users WHERE id = :uid");
    $uStmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
    $username = $uStmt->execute()->fetchArray(SQLITE3_ASSOC)['username'];

    jsonOk([
        'id'         => $commentId,
        'project_id' => $projectId,
        'user_id'    => $userId,
        'author'     => $username,
        'text'       => $text,
        'created_at' => date('Y-m-d H:i:s'),
    ], 'Комментарий добавлен');
}

function handleCommentDelete(SQLite3 $db, ?int $commentId): void
{
    if (!$commentId) jsonError('Не указан id комментария');

    $stmt = $db->prepare("SELECT user_id, project_id FROM comments WHERE id = :id");
    $stmt->bindValue(':id', $commentId, SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$row) jsonError('Комментарий не найден', 404);

    $uid = currentUserId();
    // Удалять может автор или админ
    $isAdmin = (bool)$db->querySingle("SELECT 1 FROM users WHERE id = $uid AND role = 'admin'");
    if ((int)$row['user_id'] !== $uid && !$isAdmin) {
        jsonError('Нет прав на удаление этого комментария', 403);
    }

    $del = $db->prepare("DELETE FROM comments WHERE id = :id");
    $del->bindValue(':id', $commentId, SQLITE3_INTEGER);
    $del->execute();

    // Уменьшаем счётчик обсуждений
    $pid = $row['project_id'];
    $db->exec("UPDATE projects SET discussions = MAX(0, discussions - 1) WHERE id = $pid");

    jsonOk(null, 'Комментарий удалён');
}
