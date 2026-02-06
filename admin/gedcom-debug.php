<?php
// Script de diagnostic GEDCOM
header('Content-Type: text/plain; charset=utf-8');

define('DB_HOST', '127.0.0.1:3306');
define('DB_NAME', 'famille_db');
define('DB_USER', 'root');
define('DB_PASS', '');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die("Erreur de connexion: " . $e->getMessage());
}

echo "=== DIAGNOSTIC GEDCOM ===\n\n";

// 1. Vérifier les doublons de mariages
echo "1. VÉRIFICATION DES DOUBLONS DE MARIAGES\n";
echo str_repeat("=", 50) . "\n";

$query = "
    SELECT epoux_id, epouse_id, COUNT(*) as nb_mariages
    FROM mariages
    GROUP BY epoux_id, epouse_id
    HAVING COUNT(*) > 1
";

$doublons = $pdo->query($query)->fetchAll(PDO::FETCH_ASSOC);

if (empty($doublons)) {
    echo "✓ Aucun doublon de mariage détecté\n\n";
} else {
    echo "✗ DOUBLONS DÉTECTÉS :\n";
    foreach ($doublons as $doublon) {
        echo "  - Époux ID {$doublon['epoux_id']} + Épouse ID {$doublon['epouse_id']} : {$doublon['nb_mariages']} mariages\n";
        
        // Afficher les détails
        $details = $pdo->prepare("SELECT id, date_mariage, lieu_mariage FROM mariages WHERE epoux_id = ? AND epouse_id = ?");
        $details->execute([$doublon['epoux_id'], $doublon['epouse_id']]);
        foreach ($details->fetchAll(PDO::FETCH_ASSOC) as $detail) {
            echo "    → Mariage ID {$detail['id']} : {$detail['date_mariage']} à {$detail['lieu_mariage']}\n";
        }
    }
    echo "\n";
}

// 2. Vérifier les mariages multiples légitimes
echo "2. PERSONNES AVEC MARIAGES MULTIPLES\n";
echo str_repeat("=", 50) . "\n";

$query = "
    SELECT person_id, prenom, nom, nb_mariages
    FROM (
        SELECT epoux_id as person_id, COUNT(*) as nb_mariages
        FROM mariages
        GROUP BY epoux_id
        UNION ALL
        SELECT epouse_id as person_id, COUNT(*) as nb_mariages
        FROM mariages
        GROUP BY epouse_id
    ) as counts
    JOIN membres ON membres.id = counts.person_id
    WHERE nb_mariages > 1
    ORDER BY nb_mariages DESC
";

$multiMariages = $pdo->query($query)->fetchAll(PDO::FETCH_ASSOC);

if (empty($multiMariages)) {
    echo "✓ Aucune personne avec mariages multiples\n\n";
} else {
    foreach ($multiMariages as $person) {
        echo "  - {$person['prenom']} {$person['nom']} (ID {$person['person_id']}) : {$person['nb_mariages']} mariages\n";
        
        // Lister les mariages
        $mariages = $pdo->prepare("
            SELECT m.id, m.date_mariage, m.numero_ordre,
                   COALESCE(e1.prenom, e2.prenom) as conjoint_prenom,
                   COALESCE(e1.nom, e2.nom) as conjoint_nom
            FROM mariages m
            LEFT JOIN membres e1 ON (m.epoux_id = ? AND m.epouse_id = e1.id)
            LEFT JOIN membres e2 ON (m.epouse_id = ? AND m.epoux_id = e2.id)
            WHERE m.epoux_id = ? OR m.epouse_id = ?
            ORDER BY m.numero_ordre, m.date_mariage
        ");
        $mariages->execute([$person['person_id'], $person['person_id'], $person['person_id'], $person['person_id']]);
        
        foreach ($mariages->fetchAll(PDO::FETCH_ASSOC) as $mariage) {
            echo "    → Mariage #{$mariage['numero_ordre']} (ID {$mariage['id']}) avec {$mariage['conjoint_prenom']} {$mariage['conjoint_nom']} le {$mariage['date_mariage']}\n";
        }
        echo "\n";
    }
}

// 3. Vérifier les relations orphelines
echo "3. VÉRIFICATION DES RELATIONS\n";
echo str_repeat("=", 50) . "\n";

$orphelines = $pdo->query("
    SELECT r.id, r.enfant_id, r.parent_id, r.mariage_id
    FROM relations r
    LEFT JOIN membres m1 ON r.enfant_id = m1.id
    LEFT JOIN membres m2 ON r.parent_id = m2.id
    WHERE m1.id IS NULL OR m2.id IS NULL
")->fetchAll(PDO::FETCH_ASSOC);

if (empty($orphelines)) {
    echo "✓ Toutes les relations sont valides\n\n";
} else {
    echo "✗ RELATIONS ORPHELINES DÉTECTÉES :\n";
    foreach ($orphelines as $rel) {
        echo "  - Relation ID {$rel['id']} : enfant={$rel['enfant_id']}, parent={$rel['parent_id']}\n";
    }
    echo "\n";
}

// 4. Statistiques globales
echo "4. STATISTIQUES GLOBALES\n";
echo str_repeat("=", 50) . "\n";

$stats = [
    'membres' => $pdo->query("SELECT COUNT(*) FROM membres")->fetchColumn(),
    'mariages' => $pdo->query("SELECT COUNT(*) FROM mariages")->fetchColumn(),
    'relations' => $pdo->query("SELECT COUNT(*) FROM relations")->fetchColumn(),
];

echo "  - Membres : {$stats['membres']}\n";
echo "  - Mariages : {$stats['mariages']}\n";
echo "  - Relations : {$stats['relations']}\n\n";

echo "=== FIN DU DIAGNOSTIC ===\n";
?>