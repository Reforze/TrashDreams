<?php
/**
 * Загрузка изображений
 */

function handleImageUpload(): void
{
    if (empty($_FILES['image'])) {
        jsonError('Файл не загружен');
    }

    $file = $_FILES['image'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        jsonError('Ошибка загрузки файла');
    }

    $maxSize = 5 * 1024 * 1024; // 5 MB
    if ($file['size'] > $maxSize) {
        jsonError('Файл слишком большой. Максимум 5 МБ');
    }

    $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $origName = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($origName, $allowedExt)) {
        jsonError('Допустимые форматы: JPEG, PNG, GIF, WebP');
    }

    $imgInfo = @getimagesize($file['tmp_name']);
    if ($imgInfo === false) {
        jsonError('Файл не является изображением');
    }

    $ext = match ($imgInfo[2]) {
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_PNG  => 'png',
        IMAGETYPE_GIF  => 'gif',
        IMAGETYPE_WEBP => 'webp',
        default        => null,
    };
    if ($ext === null) {
        jsonError('Допустимые форматы: JPEG, PNG, GIF, WebP');
    }

    $filename = uniqid('proj_', true) . '.' . $ext;
    $destPath = UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        jsonError('Не удалось сохранить файл');
    }

    jsonOk(['url' => '../uploads/' . $filename], 'Изображение загружено');
}
