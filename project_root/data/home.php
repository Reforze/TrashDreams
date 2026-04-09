<?php
/**
 * Статистика и данные для главной страницы
 */

function handleStats(SQLite3 $db): void
{
    jsonOk([
        'projects' => (int)  $db->querySingle("SELECT COUNT(*) FROM projects"),
        'raised'   => (float)$db->querySingle("SELECT COALESCE(SUM(raised), 0) FROM projects"),
        'users'    => (int)  $db->querySingle("SELECT COUNT(*) FROM users"),
    ]);
}

function handleItemGet(SQLite3 $db, string $table, ?int $id): void
{
    if (!$id) jsonError('id обязателен', 400);
    $allowed = ['books', 'movies', 'partners'];
    if (!in_array($table, $allowed)) jsonError('Неизвестный тип', 400);

    $stmt = $db->prepare("SELECT * FROM $table WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);
    if (!$row) jsonError('Не найдено', 404);
    jsonOk($row);
}

function handleHome(SQLite3 $db): void
{
    $featured = fetchProjects($db, 'p.is_featured = 1', [], 'p.raised DESC');

    $books = [];
    $res   = $db->query("SELECT * FROM books");
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) $books[] = $row;

    $movies = [];
    $res    = $db->query("SELECT * FROM movies");
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) $movies[] = $row;

    $partners = [];
    $res      = $db->query("SELECT * FROM partners");
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) $partners[] = $row;

    $reviews = [];
    $res     = $db->query("SELECT * FROM reviews LIMIT 3");
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) $reviews[] = $row;

    jsonOk([
        'featured_projects' => $featured,
        'books'             => $books,
        'movies'            => $movies,
        'partners'          => $partners,
        'reviews'           => $reviews,
    ]);
}
