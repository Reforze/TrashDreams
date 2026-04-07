<?php
/**
 * Лайки и избранное
 */

function handleLikeToggle(SQLite3 $db, ?int $projectId): void
{
    if (!$projectId) jsonError('Не указан id проекта');

    $userId = currentUserId();

    // Проверяем существование проекта
    $check = $db->prepare("SELECT id FROM projects WHERE id = :id");
    $check->bindValue(':id', $projectId, SQLITE3_INTEGER);
    if (!$check->execute()->fetchArray()) {
        jsonError('Проект не найден', 404);
    }

    // Если лайк есть — убираем, нет — ставим
    $existing = $db->querySingle("SELECT id FROM likes WHERE project_id = $projectId AND user_id = $userId");

    if ($existing) {
        $db->exec("DELETE FROM likes WHERE project_id = $projectId AND user_id = $userId");
        $liked = false;
    } else {
        $stmt = $db->prepare("INSERT INTO likes (project_id, user_id) VALUES (:pid, :uid)");
        $stmt->bindValue(':pid', $projectId, SQLITE3_INTEGER);
        $stmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
        $stmt->execute();
        $liked = true;
    }

    $count = (int)$db->querySingle("SELECT COUNT(*) FROM likes WHERE project_id = $projectId");

    jsonOk([
        'liked'       => $liked,
        'likes_count' => $count,
    ], $liked ? 'Лайк поставлен' : 'Лайк убран');
}

function handleFavoriteToggle(SQLite3 $db, ?int $projectId): void
{
    if (!$projectId) jsonError('Не указан id проекта');

    $userId = currentUserId();

    $check = $db->prepare("SELECT id FROM projects WHERE id = :id");
    $check->bindValue(':id', $projectId, SQLITE3_INTEGER);
    if (!$check->execute()->fetchArray()) {
        jsonError('Проект не найден', 404);
    }

    $existing = $db->querySingle("SELECT id FROM favorites WHERE project_id = $projectId AND user_id = $userId");

    if ($existing) {
        $db->exec("DELETE FROM favorites WHERE project_id = $projectId AND user_id = $userId");
        $favorited = false;
    } else {
        $stmt = $db->prepare("INSERT INTO favorites (project_id, user_id) VALUES (:pid, :uid)");
        $stmt->bindValue(':pid', $projectId, SQLITE3_INTEGER);
        $stmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
        $stmt->execute();
        $favorited = true;
    }

    jsonOk([
        'favorited' => $favorited,
    ], $favorited ? 'Добавлено в избранное' : 'Убрано из избранного');
}
