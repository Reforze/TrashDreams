<?php
/**
 * Баланс: get, deposit, withdraw
 */

function handleBalanceGet(SQLite3 $db): void
{
    $userId = currentUserId();

    $uStmt = $db->prepare("SELECT balance FROM users WHERE id = :id");
    $uStmt->bindValue(':id', $userId, SQLITE3_INTEGER);
    $balance = (float)$uStmt->execute()->fetchArray(SQLITE3_NUM)[0];

    $tStmt = $db->prepare("
        SELECT * FROM transactions
        WHERE  user_id = :uid
        ORDER  BY created_at DESC
        LIMIT  50
    ");
    $tStmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
    $result = $tStmt->execute();

    $transactions = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $transactions[] = $row;
    }

    jsonOk(['balance' => $balance, 'transactions' => $transactions]);
}

function handleBalanceDeposit(SQLite3 $db, array $body): void
{
    $amount = (float)($body['amount'] ?? 0);
    if ($amount <= 0) jsonError('Укажите корректную сумму');

    $userId = currentUserId();
    $db->exec("UPDATE users SET balance = balance + $amount WHERE id = $userId");

    $stmt = $db->prepare("
        INSERT INTO transactions (user_id, type, title, amount)
        VALUES (:uid, 'income', 'Пополнение кошелька', :amount)
    ");
    $stmt->bindValue(':uid',    $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':amount', $amount);
    $stmt->execute();

    $newBalance = (float)$db->querySingle("SELECT balance FROM users WHERE id = $userId");
    jsonOk(['balance' => $newBalance], "Баланс пополнен на {$amount} руб.");
}

function handleBalanceWithdraw(SQLite3 $db, array $body): void
{
    $amount = (float)($body['amount'] ?? 0);
    if ($amount <= 0) jsonError('Укажите корректную сумму');

    $userId  = currentUserId();
    $balance = (float)$db->querySingle("SELECT balance FROM users WHERE id = $userId");

    if ($amount > $balance) jsonError('Недостаточно средств');

    $db->exec("UPDATE users SET balance = balance - $amount WHERE id = $userId");

    $stmt = $db->prepare("
        INSERT INTO transactions (user_id, type, title, amount)
        VALUES (:uid, 'expense', 'Вывод на карту', :amount)
    ");
    $stmt->bindValue(':uid',    $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':amount', $amount);
    $stmt->execute();

    $newBalance = (float)$db->querySingle("SELECT balance FROM users WHERE id = $userId");
    jsonOk(['balance' => $newBalance], "Запрос на вывод {$amount} руб. создан");
}
