<?php
// ─── Mots de passe ────────────────────────────────────────────────────────────
// Générer un hash avec : echo password_hash('VOTRE_MOT_DE_PASSE', PASSWORD_DEFAULT);
// Puis remplacer les placeholders ci-dessous.
define('VIEWER_PASSWORD_HASH', '$2y$10$KYOLBdds57TTIwPASTI/3OY6biE3PFqobIX4xL.7swa7Jlk8oR3l6');  // mot de passe visiteur
define('ADMIN_PASSWORD_HASH',  '$2y$10$8jhPG.dGICMoC42jw2ffguHoaNFWnWU29KTqD/LXZcT3/DCe1uACq');   // mot de passe administrateur

// ─── Base de données ──────────────────────────────────────────────────────────
// define('DB_HOST', 'localhost');
// define('DB_NAME', 'famille_db');
// define('DB_USER', 'root');
// define('DB_PASS', '');

define('DB_HOST', 'db5020247574.hosting-data.io');
define('DB_PORT', '3306');
define('DB_NAME', 'dbs15569430');
define('DB_USER', 'dbu2579215');
define('DB_PASS', 'nfjoNOMdnajjgGvWlx6gSMow0C2ZzPn1');

function getConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME,
            // "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
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