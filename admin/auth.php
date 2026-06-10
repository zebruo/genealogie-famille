<?php
/**
 * Gestion de l'authentification
 * Roles : 'viewer' (lecture seule) | 'admin' (accès complet)
 */

session_set_cookie_params(['path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
session_start();

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

function isLoggedIn(): bool {
    return isset($_SESSION['role']) && in_array($_SESSION['role'], ['viewer', 'admin']);
}

function isAdmin(): bool {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

/**
 * Bloque les actions d'écriture si l'utilisateur n'est pas admin.
 * À appeler dans api3.php / api4.php avant toute écriture.
 */
function requireAdmin(): void {
    if (!isAdmin()) {
        http_response_code(403);
        echo json_encode(['error' => 'Accès refusé — droits administrateur requis']);
        exit;
    }
}

/**
 * Bloque l'accès si l'utilisateur n'est pas connecté (viewer ou admin).
 * À appeler en tête de chaque API pour les lectures.
 */
function requireLogin(): void {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => 'Connexion requise', 'redirect' => 'login.html']);
        exit;
    }
}

// ─── Endpoint JSON (?action=check | ?action=logout) ──────────────────────────

$action = $_GET['action'] ?? '';

if ($action === 'check') {
    header('Content-Type: application/json');
    echo json_encode([
        'role'  => $_SESSION['role'] ?? null,
        'valid' => isLoggedIn(),
    ]);
    exit;
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
    exit;
}
