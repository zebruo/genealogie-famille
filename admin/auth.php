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
 * Règle de confidentialité commune à toutes les API.
 * Confidentiel : décédé depuis moins de 10 ans, ou vivant né il y a moins de 100 ans.
 * Public d'office si force_public, ou si le décès n'a qu'une date d'affichage (sans date ISO valide).
 */
function isPersonConfidential(?string $date_naissance, ?string $date_deces, bool $force_public = false, ?string $date_deces_affichage = null): bool {
    if (!empty($force_public)) return false;
    $hasDeath = !empty($date_deces) && $date_deces !== '0000-00-00';
    if ($hasDeath) return (int)substr($date_deces, 0, 4) > (date('Y') - 10);
    if (!empty($date_deces_affichage)) return false;
    if (empty($date_naissance) || $date_naissance === '0000-00-00') return true;
    return (int)substr($date_naissance, 0, 4) > (date('Y') - 100);
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
