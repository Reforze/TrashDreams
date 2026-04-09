<?php
/**
 * Админка: projects, approve, reject, set_featured, set_editor, delete, stats
 */

function handleAdminProjects(SQLite3 $db): void
{
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');

    $conditions = ['1=1'];
    $params = [];

    if ($status !== '' && $status !== 'all') {
        $conditions[] = "p.status = :status";
        $params[':status'] = $status;
    }
    if ($search !== '') {
        $conditions[] = "p.title LIKE :search";
        $params[':search'] = "%$search%";
    }

    $special = trim($_GET['special'] ?? '');
    if ($special === 'featured') {
        $conditions[] = "p.is_featured = 1";
    } elseif ($special === 'editor') {
        $conditions[] = "p.is_editor_choice = 1";
    }

    jsonOk(fetchProjects($db, implode(' AND ', $conditions), $params, 'p.created_at DESC', 200));
}

function handleAdminApprove(SQLite3 $db, ?int $id): void
{
    if (!$id) jsonError('Не указан id проекта');

    $stmt = $db->prepare("UPDATE projects SET status = 'active' WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    if ($db->changes() === 0) jsonError('Проект не найден', 404);
    jsonOk(null, 'Проект одобрен');
}

function handleAdminReject(SQLite3 $db, ?int $id): void
{
    if (!$id) jsonError('Не указан id проекта');

    $stmt = $db->prepare("UPDATE projects SET status = 'closed' WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    if ($db->changes() === 0) jsonError('Проект не найден', 404);
    jsonOk(null, 'Проект отклонён');
}

function handleAdminSetFeatured(SQLite3 $db, ?int $id, array $body): void
{
    if (!$id) jsonError('Не указан id проекта');

    $val = (int)($body['value'] ?? 0);
    $stmt = $db->prepare("UPDATE projects SET is_featured = :val WHERE id = :id");
    $stmt->bindValue(':val', $val ? 1 : 0, SQLITE3_INTEGER);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    if ($db->changes() === 0) jsonError('Проект не найден', 404);
    jsonOk(null, $val ? 'Проект добавлен в избранное' : 'Проект убран из избранного');
}

function handleAdminSetEditor(SQLite3 $db, ?int $id, array $body): void
{
    if (!$id) jsonError('Не указан id проекта');

    $val = (int)($body['value'] ?? 0);
    $stmt = $db->prepare("UPDATE projects SET is_editor_choice = :val WHERE id = :id");
    $stmt->bindValue(':val', $val ? 1 : 0, SQLITE3_INTEGER);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    if ($db->changes() === 0) jsonError('Проект не найден', 404);
    jsonOk(null, $val ? 'Проект отмечен как выбор редакции' : 'Проект убран из выбора редакции');
}

function handleAdminDeleteProject(SQLite3 $db, ?int $id): void
{
    if (!$id) jsonError('Не указан id проекта');

    $del = $db->prepare("DELETE FROM projects WHERE id = :id");
    $del->bindValue(':id', $id, SQLITE3_INTEGER);
    $del->execute();

    if ($db->changes() === 0) jsonError('Проект не найден', 404);
    jsonOk(null, 'Проект удалён администратором');
}

function handleAdminStats(SQLite3 $db): void
{
    jsonOk([
        'total_projects' => (int)$db->querySingle("SELECT COUNT(*) FROM projects"),
        'active'         => (int)$db->querySingle("SELECT COUNT(*) FROM projects WHERE status='active'"),
        'review'         => (int)$db->querySingle("SELECT COUNT(*) FROM projects WHERE status='review'"),
        'closed'         => (int)$db->querySingle("SELECT COUNT(*) FROM projects WHERE status='closed'"),
        'total_raised'   => (float)$db->querySingle("SELECT COALESCE(SUM(raised), 0) FROM projects"),
        'total_users'    => (int)$db->querySingle("SELECT COUNT(*) FROM users"),
        'featured'       => (int)$db->querySingle("SELECT COUNT(*) FROM projects WHERE is_featured=1"),
        'editor_choice'  => (int)$db->querySingle("SELECT COUNT(*) FROM projects WHERE is_editor_choice=1"),
    ]);
}
