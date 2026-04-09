<?php
/**
 * Проекты: list, featured, new, discussed, editor_choice, get, create, update, delete, support
 */

function fetchProjects(
    SQLite3 $db,
    string  $where  = '1=1',
    array   $params = [],
    string  $order  = 'p.created_at DESC',
    int     $limit  = 100
): array {
    $sql = "
        SELECT p.*, u.username AS author,
               (SELECT COUNT(*) FROM likes WHERE project_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM comments WHERE project_id = p.id) AS comments_count
        FROM   projects p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE  $where
        ORDER  BY $order
        LIMIT  $limit
    ";
    $stmt = $db->prepare($sql);
    foreach ($params as $key => $val) {
        is_int($val)
            ? $stmt->bindValue($key, $val, SQLITE3_INTEGER)
            : $stmt->bindValue($key, $val);
    }
    $result = $stmt->execute();
    $rows   = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = $row;
    }
    return $rows;
}

function handleProjectsList(SQLite3 $db): void
{
    $search   = trim($_GET['search']   ?? '');
    $category = trim($_GET['category'] ?? '');
    $sort     = $_GET['sort']          ?? 'newest';
    $status   = trim($_GET['status']   ?? '');

    $conditions = [];
    $params     = [];

    // Свои проекты — показываем все статусы, чужие — только active
    $mine = trim($_GET['mine'] ?? '');
    if ($mine === '1' && !empty($_SESSION['user_id'])) {
        $conditions[] = "p.user_id = :uid";
        $params[':uid'] = (int)$_SESSION['user_id'];
    } else {
        // По умолчанию показываем только активные проекты
        if ($status !== '') {
            $conditions[] = "p.status = :status";
            $params[':status'] = $status;
        } else {
            $conditions[] = "p.status = 'active'";
        }
    }

    if ($search !== '') {
        $conditions[] = "p.title LIKE :search";
        $params[':search'] = "%$search%";
    }
    if ($category !== '' && $category !== 'all') {
        $conditions[] = "p.category = :cat";
        $params[':cat'] = $category;
    }

    // Избранное текущего пользователя
    $favorites = trim($_GET['favorites'] ?? '');
    if ($favorites === '1' && !empty($_SESSION['user_id'])) {
        $conditions[] = "p.id IN (SELECT project_id FROM favorites WHERE user_id = :fav_uid)";
        $params[':fav_uid'] = (int)$_SESSION['user_id'];
    }

    $order = match ($sort) {
        'raised'    => 'p.raised DESC',
        'popular'   => '(CAST(p.raised AS REAL) / p.goal) DESC',
        'discussed' => 'p.discussions DESC',
        'likes'     => 'likes_count DESC',
        default     => 'p.created_at DESC',
    };

    $where = count($conditions) ? implode(' AND ', $conditions) : '1=1';
    jsonOk(fetchProjects($db, $where, $params, $order));
}

function handleProjectsFeatured(SQLite3 $db): void
{
    jsonOk(fetchProjects($db, "p.is_featured = 1 AND p.status = 'active'", [], 'p.raised DESC'));
}

function handleProjectsNew(SQLite3 $db): void
{
    jsonOk(fetchProjects($db, "p.status = 'active'", [], 'p.created_at DESC', 20));
}

function handleProjectsDiscussed(SQLite3 $db): void
{
    jsonOk(fetchProjects($db, "p.status = 'active'", [], 'p.discussions DESC', 20));
}

function handleProjectsEditorChoice(SQLite3 $db): void
{
    jsonOk(fetchProjects($db, "p.is_editor_choice = 1 AND p.status = 'active'", [], 'p.created_at DESC'));
}

function handleProjectGet(SQLite3 $db, ?int $id): void
{
    if (!$id) jsonError('Не указан параметр id');

    $stmt = $db->prepare("
        SELECT p.*, u.username AS author,
               (SELECT COUNT(*) FROM likes WHERE project_id = p.id) AS likes_count,
               (SELECT COUNT(*) FROM comments WHERE project_id = p.id) AS comments_count
        FROM   projects p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE  p.id = :id
    ");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$row) jsonError('Проект не найден', 404);

    // Проект на модерации/отклонён — доступен только автору и админу
    if ($row['status'] !== 'active') {
        $uid = !empty($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
        $isOwner = (int)$row['user_id'] === $uid;
        $isAdmin = false;
        if ($uid) {
            $roleCheck = $db->querySingle("SELECT role FROM users WHERE id = $uid");
            $isAdmin = $roleCheck === 'admin';
        }
        if (!$isOwner && !$isAdmin) {
            jsonError('Проект недоступен', 403);
        }
    }

    // Проверяем лайк/избранное текущего пользователя
    $row['user_liked']     = false;
    $row['user_favorited'] = false;
    if (!empty($_SESSION['user_id'])) {
        $uid = currentUserId();
        $row['user_liked']     = (bool)$db->querySingle("SELECT 1 FROM likes WHERE project_id = $id AND user_id = $uid");
        $row['user_favorited'] = (bool)$db->querySingle("SELECT 1 FROM favorites WHERE project_id = $id AND user_id = $uid");
    }

    jsonOk($row);
}

function handleProjectCreate(SQLite3 $db, array $body): void
{
    $title    = trim($body['title']       ?? '');
    $category = trim($body['category']   ?? 'fun');
    $desc     = trim($body['description'] ?? '');
    $goal     = (float)($body['goal']    ?? 0);
    $img      = trim($body['img']        ?? '');

    if (!$title) jsonError('Укажите название проекта');
    if (!$desc)  jsonError('Добавьте описание проекта');
    if ($goal <= 0) jsonError('Цель сбора должна быть больше нуля');

    $allowed = ['fun', 'food', 'tech', 'books', 'movies', 'games', 'other'];
    if (!in_array($category, $allowed, true)) $category = 'fun';

    $stmt = $db->prepare("
        INSERT INTO projects
            (user_id, title, category, description, goal, raised, status, img, discussions, is_featured, is_editor_choice)
        VALUES
            (:uid, :title, :cat, :desc, :goal, 0, 'review', :img, 0, 0, 0)
    ");
    $stmt->bindValue(':uid',   currentUserId(), SQLITE3_INTEGER);
    $stmt->bindValue(':title', $title);
    $stmt->bindValue(':cat',   $category);
    $stmt->bindValue(':desc',  $desc);
    $stmt->bindValue(':goal',  $goal);
    $stmt->bindValue(':img',   $img);
    $stmt->execute();

    jsonOk(['id' => $db->lastInsertRowID()], 'Проект создан и отправлен на модерацию');
}

function handleProjectUpdate(SQLite3 $db, ?int $id, array $body): void
{
    if (!$id) jsonError('Не указан параметр id');

    $stmt = $db->prepare("SELECT user_id FROM projects WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$row) jsonError('Проект не найден', 404);
    if ((int)$row['user_id'] !== currentUserId()) jsonError('Нет прав на редактирование этого проекта', 403);

    $fields = [];
    $params = [':id' => $id];

    if (isset($body['title']) && trim($body['title']) !== '') {
        $fields[] = 'title = :title';
        $params[':title'] = trim($body['title']);
    }
    if (isset($body['description'])) {
        $fields[] = 'description = :desc';
        $params[':desc'] = trim($body['description']);
    }
    if (isset($body['category'])) {
        $fields[] = 'category = :cat';
        $params[':cat'] = $body['category'];
    }
    if (isset($body['goal']) && (float)$body['goal'] > 0) {
        $fields[] = 'goal = :goal';
        $params[':goal'] = (float)$body['goal'];
    }
    if (isset($body['img'])) {
        $fields[] = 'img = :img';
        $params[':img'] = $body['img'];
    }

    if (empty($fields)) jsonError('Не переданы поля для обновления');

    $upd = $db->prepare("UPDATE projects SET " . implode(', ', $fields) . " WHERE id = :id");
    foreach ($params as $k => $v) {
        $upd->bindValue($k, $v);
    }
    $upd->execute();

    jsonOk(null, 'Проект обновлён');
}

function handleProjectDelete(SQLite3 $db, ?int $id): void
{
    if (!$id) jsonError('Не указан параметр id');

    $stmt = $db->prepare("SELECT user_id FROM projects WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$row) jsonError('Проект не найден', 404);
    if ((int)$row['user_id'] !== currentUserId()) jsonError('Нет прав на удаление этого проекта', 403);

    $del = $db->prepare("DELETE FROM projects WHERE id = :id");
    $del->bindValue(':id', $id, SQLITE3_INTEGER);
    $del->execute();

    jsonOk(null, 'Проект удалён');
}

function handleProjectSupport(SQLite3 $db, ?int $id, array $body): void
{
    if (!$id) jsonError('Не указан параметр id');

    $amount = (float)($body['amount'] ?? 0);
    if ($amount <= 0) jsonError('Укажите сумму поддержки больше нуля');

    $userId = currentUserId();

    $uStmt = $db->prepare("SELECT balance FROM users WHERE id = :uid");
    $uStmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
    $userRow = $uStmt->execute()->fetchArray(SQLITE3_ASSOC);
    if (!$userRow) jsonError('Пользователь не найден', 404);
    if ((float)$userRow['balance'] < $amount) jsonError('Недостаточно средств на балансе');

    $pStmt = $db->prepare("SELECT id, title FROM projects WHERE id = :id AND status = 'active'");
    $pStmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $project = $pStmt->execute()->fetchArray(SQLITE3_ASSOC);
    if (!$project) jsonError('Проект не найден или не доступен для поддержки', 404);

    $db->exec("BEGIN");
    $db->exec("UPDATE users    SET balance = balance - $amount WHERE id = $userId");
    $db->exec("UPDATE projects SET raised  = raised  + $amount WHERE id = $id");

    $txStmt = $db->prepare("
        INSERT INTO transactions (user_id, type, title, amount)
        VALUES (:uid, 'expense', :title, :amount)
    ");
    $txStmt->bindValue(':uid',    $userId, SQLITE3_INTEGER);
    $txStmt->bindValue(':title',  'Поддержка: ' . $project['title']);
    $txStmt->bindValue(':amount', $amount);
    $txStmt->execute();
    $db->exec("COMMIT");

    $newBalance = (float)$db->querySingle("SELECT balance FROM users WHERE id = $userId");
    jsonOk(
        ['new_balance' => $newBalance],
        "Проект поддержан на {$amount} руб."
    );
}
