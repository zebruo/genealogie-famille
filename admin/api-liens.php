<?php
require_once 'auth.php';
require_once 'config.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

function hasUrl(string $text): bool {
    return (bool) preg_match('#https?://#', $text);
}

// ── POST : mise à jour d'un champ ────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdmin();
    $body = json_decode(file_get_contents('php://input'), true);

    if (($body['action'] ?? '') === 'verify') {
        $id     = (int)($body['id']    ?? 0);
        $champ  = $body['champ']    ?? '';
        $verify = (bool)($body['verified'] ?? false);
        if (!$id || !$champ) { http_response_code(400); echo json_encode(['error' => 'Paramètres invalides']); exit; }
        try {
            $pdo = getConnection();
            if ($verify) {
                $pdo->prepare("INSERT INTO liens_verification (source_id, champ) VALUES (?, ?) ON DUPLICATE KEY UPDATE verified_at = CURRENT_TIMESTAMP")
                    ->execute([$id, $champ]);
                echo json_encode(['ok' => true, 'verified_at' => date('Y-m-d H:i:s')]);
            } else {
                $pdo->prepare("DELETE FROM liens_verification WHERE source_id = ? AND champ = ?")
                    ->execute([$id, $champ]);
                echo json_encode(['ok' => true, 'verified_at' => null]);
            }
        } catch (Exception $e) {
            http_response_code(500); echo json_encode(['error' => $e->getMessage()]);
        }
        exit;
    }

    try {
        $id    = (int)($body['id']    ?? 0);
        $champ = $body['champ'] ?? '';
        $texte = $body['texte'] ?? '';

        $allowed = [
            'doc_naissance' => 'membres',
            'doc_deces'     => 'membres',
            'notes'         => 'mariages',
            'content'       => 'documents',
        ];
        if (!$id || !isset($allowed[$champ])) {
            http_response_code(400);
            echo json_encode(['error' => 'Paramètres invalides']);
            exit;
        }

        $table = $allowed[$champ];
        $pdo   = getConnection();
        $stmt  = $pdo->prepare("UPDATE `$table` SET `$champ` = ? WHERE id = ?");
        $stmt->execute([$texte ?: null, $id]);
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// ── GET : lecture ─────────────────────────────────────────────────────────────
requireLogin();
try {
    $pdo = getConnection();
    $results = [];

    // doc_naissance et doc_deces
    $stmt = $pdo->query(
        "SELECT membres.id, prenom, nom, doc_naissance, doc_deces,
                YEAR(date_naissance) AS birth_year, date_naissance_affichage,
                YEAR(date_deces)     AS death_year, date_deces_affichage,
                lv_n.verified_at AS naissance_verified_at,
                lv_d.verified_at AS deces_verified_at
         FROM membres
         LEFT JOIN liens_verification lv_n ON lv_n.source_id = membres.id AND lv_n.champ = 'doc_naissance'
         LEFT JOIN liens_verification lv_d ON lv_d.source_id = membres.id AND lv_d.champ = 'doc_deces'
         WHERE doc_naissance IS NOT NULL OR doc_deces IS NOT NULL
         ORDER BY nom, prenom"
    );
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $name = trim($row['prenom'] . ' ' . $row['nom']);
        $dates = ['birth_year' => $row['birth_year'], 'birth_display' => $row['date_naissance_affichage'],
                  'death_year' => $row['death_year'], 'death_display' => $row['date_deces_affichage']];
        if (!empty($row['doc_naissance']) && hasUrl($row['doc_naissance'])) {
            $results[] = ['id' => (int)$row['id'], 'champ' => 'doc_naissance',
                          'source' => 'naissance', 'personne' => $name, 'texte' => $row['doc_naissance'],
                          'verified' => !is_null($row['naissance_verified_at']),
                          'verified_at' => $row['naissance_verified_at']] + $dates;
        }
        if (!empty($row['doc_deces']) && hasUrl($row['doc_deces'])) {
            $results[] = ['id' => (int)$row['id'], 'champ' => 'doc_deces',
                          'source' => 'deces', 'personne' => $name, 'texte' => $row['doc_deces'],
                          'verified' => !is_null($row['deces_verified_at']),
                          'verified_at' => $row['deces_verified_at']] + $dates;
        }
    }

    // notes de mariages
    $stmt = $pdo->query(
        "SELECT m.id, m.notes,
                e.prenom  AS epoux_prenom,  e.nom  AS epoux_nom,
                YEAR(e.date_naissance)  AS epoux_birth_year,  e.date_naissance_affichage  AS epoux_birth_display,
                YEAR(e.date_deces)      AS epoux_death_year,  e.date_deces_affichage      AS epoux_death_display,
                ep.prenom AS epouse_prenom, ep.nom AS epouse_nom,
                YEAR(ep.date_naissance) AS epouse_birth_year, ep.date_naissance_affichage AS epouse_birth_display,
                YEAR(ep.date_deces)     AS epouse_death_year, ep.date_deces_affichage     AS epouse_death_display,
                lv.verified_at
         FROM mariages m
         JOIN membres e  ON e.id  = m.epoux_id
         JOIN membres ep ON ep.id = m.epouse_id
         LEFT JOIN liens_verification lv ON lv.source_id = m.id AND lv.champ = 'notes'
         WHERE m.notes IS NOT NULL
         ORDER BY e.nom, e.prenom"
    );
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (empty($row['notes']) || !hasUrl($row['notes'])) continue;
        $epoux  = trim($row['epoux_prenom']  . ' ' . $row['epoux_nom']);
        $epouse = trim($row['epouse_prenom'] . ' ' . $row['epouse_nom']);
        $results[] = ['id' => (int)$row['id'], 'champ' => 'notes',
                      'source' => 'mariage', 'personne' => $epoux . ' & ' . $epouse, 'texte' => $row['notes'],
                      'verified' => !is_null($row['verified_at']), 'verified_at' => $row['verified_at'],
                      'epoux_name'          => $epoux,
                      'epoux_birth_year'    => $row['epoux_birth_year'],    'epoux_birth_display'  => $row['epoux_birth_display'],
                      'epoux_death_year'    => $row['epoux_death_year'],    'epoux_death_display'  => $row['epoux_death_display'],
                      'epouse_name'         => $epouse,
                      'epouse_birth_year'   => $row['epouse_birth_year'],   'epouse_birth_display' => $row['epouse_birth_display'],
                      'epouse_death_year'   => $row['epouse_death_year'],   'epouse_death_display' => $row['epouse_death_display']];
    }

    // content de la table documents
    $stmt = $pdo->query(
        "SELECT d.id, d.content, d.title,
                m.prenom, m.nom,
                YEAR(m.date_naissance) AS birth_year, m.date_naissance_affichage,
                YEAR(m.date_deces)     AS death_year, m.date_deces_affichage,
                lv.verified_at
         FROM documents d
         JOIN membres m ON m.id = d.person_id
         LEFT JOIN liens_verification lv ON lv.source_id = d.id AND lv.champ = 'content'
         WHERE d.content IS NOT NULL AND d.type = 'note'
         ORDER BY m.nom, m.prenom, d.title"
    );
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (empty($row['content']) || !hasUrl($row['content'])) continue;
        $name = trim($row['prenom'] . ' ' . $row['nom']);
        $results[] = ['id' => (int)$row['id'], 'champ' => 'content',
                      'source' => 'document', 'personne' => $name,
                      'titre' => $row['title'] ?? '', 'texte' => $row['content'],
                      'verified' => !is_null($row['verified_at']), 'verified_at' => $row['verified_at'],
                      'birth_year' => $row['birth_year'], 'birth_display' => $row['date_naissance_affichage'],
                      'death_year' => $row['death_year'], 'death_display' => $row['date_deces_affichage']];
    }

    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}