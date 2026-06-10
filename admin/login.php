<?php
/**
 * Traitement du formulaire de connexion (POST uniquement)
 * Retourne JSON : { success, role } ou { error }
 */

require_once 'auth.php';   // démarre la session
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$password = trim($_POST['password'] ?? '');

if ($password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Mot de passe requis']);
    exit;
}

// Vérification admin en premier (priorité)
if (defined('ADMIN_PASSWORD_HASH') && password_verify($password, ADMIN_PASSWORD_HASH)) {
    session_regenerate_id(true);
    $_SESSION['role'] = 'admin';
    echo json_encode(['success' => true, 'role' => 'admin']);
    exit;
}

// Vérification visiteur
if (defined('VIEWER_PASSWORD_HASH') && password_verify($password, VIEWER_PASSWORD_HASH)) {
    session_regenerate_id(true);
    $_SESSION['role'] = 'viewer';
    echo json_encode(['success' => true, 'role' => 'viewer']);
    exit;
}

// Échec
http_response_code(401);
echo json_encode(['error' => 'Mot de passe incorrect']);
