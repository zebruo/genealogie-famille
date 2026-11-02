<?php
/**
 * Sert un PDF ou une photo de uploads/ après contrôle d'accès (admin/fichier.php?id=…).
 * L'accès direct à uploads/ est bloqué par uploads/.htaccess.
 */

ini_set('display_errors', 0);

require_once 'auth.php';
require_once 'config.php';

function refuserFichier(int $code, string $message): never {
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
    exit($message);
}

if (!isLoggedIn()) refuserFichier(401, 'Connexion requise');

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) refuserFichier(404, 'Fichier introuvable');

$pdo = getConnection();
$stmt = $pdo->prepare("SELECT file_path, file_name FROM documents WHERE id = ?");
$stmt->execute([$id]);
$document = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$document || empty($document['file_path'])) refuserFichier(404, 'Fichier introuvable');

// Visiteur : le document doit être rattaché à au moins une personne non confidentielle.
// Réponse 404 : ne pas révéler qu'un document confidentiel existe.
if (!isAdmin()) {
    $stmt = $pdo->prepare("
        SELECT m.date_naissance, m.date_deces, m.force_public, m.date_deces_affichage FROM documents d
        INNER JOIN membres m ON m.id = d.person_id WHERE d.id = ?
        UNION ALL
        SELECT m.date_naissance, m.date_deces, m.force_public, m.date_deces_affichage FROM document_members dm
        INNER JOIN membres m ON m.id = dm.member_id WHERE dm.document_id = ?
    ");
    $stmt->execute([$id, $id]);
    $personnes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $visible = false;
    foreach ($personnes as $personne) {
        if (!isPersonConfidential($personne['date_naissance'], $personne['date_deces'], (bool)$personne['force_public'], $personne['date_deces_affichage'])) {
            $visible = true;
            break;
        }
    }
    if (!$visible) refuserFichier(404, 'Fichier introuvable');
}

// La base contient « uploads/… » ou « ../uploads/… » selon l'ancienneté du document
if (!preg_match('#^(?:\.\./)?uploads/(documents|photos)/([^/\\\\]+)$#', $document['file_path'], $morceaux)) {
    refuserFichier(404, 'Fichier introuvable');
}
$chemin = dirname(__DIR__) . '/uploads/' . $morceaux[1] . '/' . $morceaux[2];
if (!is_file($chemin)) refuserFichier(404, 'Fichier introuvable');

$types = [
    'pdf'  => 'application/pdf',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
];
$extension = strtolower(pathinfo($chemin, PATHINFO_EXTENSION));
if (!isset($types[$extension])) refuserFichier(404, 'Fichier introuvable');

// La session n'est plus utile : la libérer pour ne pas bloquer les autres requêtes pendant l'envoi
session_write_close();

// Le navigateur peut garder le fichier, mais redemande à chaque fois : le contrôle d'accès reste appliqué
header_remove('Pragma');
header_remove('Expires');
header('Cache-Control: private, no-cache');
header('X-Content-Type-Options: nosniff');
$etag = '"' . md5($chemin . filemtime($chemin) . filesize($chemin)) . '"';
header('ETag: ' . $etag);
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}

$nom = $document['file_name'] ?: $morceaux[2];
header('Content-Type: ' . $types[$extension]);
header('Content-Length: ' . filesize($chemin));
header("Content-Disposition: inline; filename*=UTF-8''" . rawurlencode($nom));
readfile($chemin);
