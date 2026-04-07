<?php
/**
 * Авторизация: register, login, logout, me, update
 */

function handleRegister(SQLite3 $db, array $body): void
{
    $username = trim($body['username'] ?? '');
    $email    = trim($body['email']    ?? '');
    $password = $body['password']      ?? '';

    if (!$username || !$email || !$password) {
        jsonError('Заполните все поля: username, email, password');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError('Некорректный email');
    }
    if (mb_strlen($password) < 6) {
        jsonError('Пароль должен содержать минимум 6 символов');
    }

    $check = $db->prepare("SELECT id FROM users WHERE email = :e LIMIT 1");
    $check->bindValue(':e', $email);
    if ($check->execute()->fetchArray(SQLITE3_ASSOC)) {
        jsonError('Пользователь с таким email уже существует');
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO users (username, email, password, role, balance) VALUES (:u, :e, :p, 'user', 0)");
    $stmt->bindValue(':u', $username);
    $stmt->bindValue(':e', $email);
    $stmt->bindValue(':p', $hash);
    $stmt->execute();

    $userId = $db->lastInsertRowID();
    $_SESSION['user_id']  = $userId;
    $_SESSION['username'] = $username;

    jsonOk(
        ['id' => $userId, 'username' => $username, 'email' => $email, 'balance' => 0, 'role' => 'user'],
        'Регистрация прошла успешно'
    );
}

function handleLogin(SQLite3 $db, array $body): void
{
    $email    = trim($body['email']    ?? '');
    $password = $body['password']      ?? '';

    if (!$email || !$password) {
        jsonError('Введите email и пароль');
    }

    $stmt = $db->prepare("SELECT * FROM users WHERE email = :e LIMIT 1");
    $stmt->bindValue(':e', $email);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$row || !password_verify($password, $row['password'])) {
        jsonError('Неверный email или пароль', 401);
    }

    $_SESSION['user_id']  = $row['id'];
    $_SESSION['username'] = $row['username'];

    unset($row['password']);
    jsonOk($row, 'Вход выполнен');
}

function handleLogout(): void
{
    session_destroy();
    jsonOk(null, 'Выход выполнен');
}

function handleMe(SQLite3 $db): void
{
    if (empty($_SESSION['user_id'])) {
        jsonOk(null, 'Не авторизован');
        return;
    }

    $stmt = $db->prepare("SELECT id, username, email, role, balance, created_at FROM users WHERE id = :id");
    $stmt->bindValue(':id', currentUserId(), SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$row) {
        session_destroy();
        jsonError('Пользователь не найден', 404);
    }

    jsonOk($row);
}

function handleAuthUpdate(SQLite3 $db, array $body): void
{
    $uid = currentUserId();

    $stmt = $db->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->bindValue(':id', $uid, SQLITE3_INTEGER);
    $user = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$user) {
        jsonError('Пользователь не найден', 404);
    }

    $username = trim($body['username'] ?? '');
    $email    = trim($body['email']    ?? '');
    $oldPass  = $body['old_password']  ?? '';
    $newPass  = $body['new_password']  ?? '';

    if (!$username) $username = $user['username'];
    if (!$email)    $email    = $user['email'];

    if ($email !== $user['email']) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonError('Некорректный email');
        }
        $check = $db->prepare("SELECT id FROM users WHERE email = :e AND id != :id LIMIT 1");
        $check->bindValue(':e', $email);
        $check->bindValue(':id', $uid, SQLITE3_INTEGER);
        if ($check->execute()->fetchArray(SQLITE3_ASSOC)) {
            jsonError('Этот email уже занят');
        }
    }

    if ($newPass) {
        if (!$oldPass || !password_verify($oldPass, $user['password'])) {
            jsonError('Неверный текущий пароль');
        }
        if (mb_strlen($newPass) < 6) {
            jsonError('Новый пароль должен содержать минимум 6 символов');
        }
        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        $stmt = $db->prepare("UPDATE users SET username = :u, email = :e, password = :p WHERE id = :id");
        $stmt->bindValue(':p', $hash);
    } else {
        $stmt = $db->prepare("UPDATE users SET username = :u, email = :e WHERE id = :id");
    }

    $stmt->bindValue(':u', $username);
    $stmt->bindValue(':e', $email);
    $stmt->bindValue(':id', $uid, SQLITE3_INTEGER);
    $stmt->execute();

    $_SESSION['username'] = $username;

    jsonOk([
        'id'         => $uid,
        'username'   => $username,
        'email'      => $email,
        'role'       => $user['role'],
        'balance'    => $user['balance'],
        'created_at' => $user['created_at']
    ], 'Профиль обновлён');
}
