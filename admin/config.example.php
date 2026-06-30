<?php
/**
 * Fichier de configuration - EXEMPLE
 *
 * Pour utiliser ce fichier :
 * 1. Renommer ce fichier en 'config.php'
 * 2. Renseigner vos credentials de base de données ci-dessous
 * 3. Accéder à admin/generate-password.php avec le mot de passe temporaire 'admin'
 *    pour générer vos vrais hashs, puis remplacer les valeurs ci-dessous
 * 4. Ne versionnez JAMAIS le fichier config.php (il est dans .gitignore)
 */

// ─── Mots de passe ────────────────────────────────────────────────────────────
// ⚠️  MOT DE PASSE TEMPORAIRE — À CHANGER IMMÉDIATEMENT après la première connexion
// Les deux comptes utilisent provisoirement le mot de passe : admin
// Utiliser admin/generate-password.php pour générer vos propres hashs bcrypt.
define('VIEWER_PASSWORD_HASH', '$2y$12$SNJgUOSaytJ15NYZd.4QtOrkJTrjQbFQH1e/50oJJUKvglImHZ1YK');  // temporaire : admin
define('ADMIN_PASSWORD_HASH',  '$2y$12$SNJgUOSaytJ15NYZd.4QtOrkJTrjQbFQH1e/50oJJUKvglImHZ1YK');  // temporaire : admin

define('DB_HOST', 'localhost');
define('DB_NAME', 'votre_base_de_donnees');
define('DB_USER', 'votre_utilisateur');
define('DB_PASS', 'votre_mot_de_passe');

function getConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $pdo->exec("SET NAMES utf8");
        return $pdo;
    } catch(PDOException $e) {
        die("Erreur de connexion : " . $e->getMessage());
    }
}
