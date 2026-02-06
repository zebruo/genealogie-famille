<?php
/**
 * Fichier de configuration - EXEMPLE
 *
 * Pour utiliser ce fichier:
 * 1. Copiez ce fichier et renommez-le en 'config.php'
 * 2. Remplacez les valeurs ci-dessous par vos propres credentials
 * 3. Ne versionnez JAMAIS le fichier config.php (il est dans .gitignore)
 */

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
