<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Configuration de la base de données
define('DB_HOST', '127.0.0.1:3306');
define('DB_NAME', 'famille_db');
define('DB_USER', 'root');
define('DB_PASS', '');
define('BACKUP_DIR', __DIR__ . '/backups/');

// Créer le dossier backups s'il n'existe pas
if (!file_exists(BACKUP_DIR)) {
    mkdir(BACKUP_DIR, 0755, true);
}

// Connexion à la base de données
function getConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        return $pdo;
    } catch (PDOException $e) {
        die(json_encode(['success' => false, 'message' => 'Erreur de connexion: ' . $e->getMessage()]));
    }
}

// Router
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'getStats':
        getStats();
        break;
    case 'getHistory':
        getBackupHistory();
        break;
    case 'createBackup':
        createBackup();
        break;
    case 'restore':
        restoreBackup();
        break;
    case 'download':
        downloadBackup();
        break;
    case 'delete':
        deleteBackup();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
}

// Récupérer les statistiques
function getStats() {
    $pdo = getConnection();
    
    $stats = [
        'membres' => 0,
        'mariages' => 0,
        'relations' => 0,
        'documents' => 0
    ];
    
    try {
        $stats['membres'] = $pdo->query("SELECT COUNT(*) FROM membres")->fetchColumn();
        $stats['mariages'] = $pdo->query("SELECT COUNT(*) FROM mariages")->fetchColumn();
        $stats['relations'] = $pdo->query("SELECT COUNT(*) FROM relations")->fetchColumn();
        $stats['documents'] = $pdo->query("SELECT COUNT(*) FROM documents")->fetchColumn();
        
        echo json_encode(['success' => true, 'stats' => $stats]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Récupérer l'historique des sauvegardes
function getBackupHistory() {
    $backups = [];
    
    if (is_dir(BACKUP_DIR)) {
        $files = glob(BACKUP_DIR . '*.{sql,json,zip,gedcom,ged}', GLOB_BRACE);
        
        foreach ($files as $file) {
            $backups[] = [
                'filename' => basename($file),
                'date' => date('d/m/Y H:i:s', filemtime($file)),
                'size' => formatBytes(filesize($file)),
                'format' => pathinfo($file, PATHINFO_EXTENSION)
            ];
        }
        
        // Trier par date décroissante
        usort($backups, function($a, $b) {
            return filemtime(BACKUP_DIR . $b['filename']) - filemtime(BACKUP_DIR . $a['filename']);
        });
    }
    
    echo json_encode(['success' => true, 'backups' => $backups]);
}

// Créer une sauvegarde
function createBackup() {
    $tables = json_decode($_POST['tables'] ?? '[]', true);
    $format = $_POST['format'] ?? 'sql';
    
    if (empty($tables)) {
        echo json_encode(['success' => false, 'message' => 'Aucune table sélectionnée']);
        return;
    }
    
    $filename = 'backup_' . date('Y-m-d_H-i-s') . '.' . $format;
    $filepath = BACKUP_DIR . $filename;
    
    try {
        switch ($format) {
            case 'sql':
                createSQLBackup($filepath, $tables);
                break;
            case 'json':
                createJSONBackup($filepath, $tables);
                break;
            case 'csv':
                createCSVBackup($filepath, $tables);
                break;
            case 'gedcom':
                createGEDCOMBackup($filepath);
                break;
        }
        
        echo json_encode([
            'success' => true,
            'filename' => $filename,
            'downloadUrl' => 'api-backup.php?action=download&file=' . urlencode($filename)
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Créer une sauvegarde SQL
function createSQLBackup($filepath, $tables) {
    $pdo = getConnection();
    
    $sql = "-- Sauvegarde Base de Données Généalogie\n";
    $sql .= "-- Date: " . date('Y-m-d H:i:s') . "\n\n";
    $sql .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
    $sql .= "START TRANSACTION;\n";
    $sql .= "SET time_zone = \"+00:00\";\n\n";
    
    foreach ($tables as $table) {
        // Structure de la table
        $result = $pdo->query("SHOW CREATE TABLE `$table`");
        $row = $result->fetch(PDO::FETCH_ASSOC);
        
        $sql .= "\n\n-- Structure de la table `$table`\n";
        $sql .= "DROP TABLE IF EXISTS `$table`;\n";
        $sql .= $row['Create Table'] . ";\n\n";
        
        // Données de la table
        $result = $pdo->query("SELECT * FROM `$table`");
        $rows = $result->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($rows)) {
            $sql .= "-- Données de la table `$table`\n";
            
            foreach ($rows as $row) {
                $values = array_map(function($value) use ($pdo) {
                    return $value === null ? 'NULL' : $pdo->quote($value);
                }, $row);
                
                $sql .= "INSERT INTO `$table` VALUES (" . implode(', ', $values) . ");\n";
            }
        }
    }
    
    $sql .= "\nCOMMIT;\n";
    
    file_put_contents($filepath, $sql);
}

// Créer une sauvegarde JSON
function createJSONBackup($filepath, $tables) {
    $pdo = getConnection();
    $data = [];
    
    foreach ($tables as $table) {
        $result = $pdo->query("SELECT * FROM `$table`");
        $data[$table] = $result->fetchAll(PDO::FETCH_ASSOC);
    }
    
    file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Créer une sauvegarde CSV
function createCSVBackup($filepath, $tables) {
    $pdo = getConnection();
    
    // Créer un fichier ZIP contenant tous les CSV
    $zip = new ZipArchive();
    $zipPath = str_replace('.csv', '.zip', $filepath);
    
    if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
        throw new Exception("Impossible de créer le fichier ZIP");
    }
    
    foreach ($tables as $table) {
        $result = $pdo->query("SELECT * FROM `$table`");
        $rows = $result->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($rows)) {
            $csv = '';
            
            // En-têtes
            $csv .= implode(';', array_keys($rows[0])) . "\n";
            
            // Données
            foreach ($rows as $row) {
                $csv .= implode(';', array_map(function($value) {
                    return '"' . str_replace('"', '""', $value ?? '') . '"';
                }, $row)) . "\n";
            }
            
            $zip->addFromString($table . '.csv', $csv);
        }
    }
    
    $zip->close();
    
    // Renommer le fichier
    rename($zipPath, $filepath);
}

// Créer une sauvegarde GEDCOM
function createGEDCOMBackup($filepath) {
    $pdo = getConnection();
    
    // En-tête GEDCOM standard
    $gedcom = "0 HEAD\n";
    $gedcom .= "1 SOUR Ma Généalogie\n";
    $gedcom .= "2 VERS 1.0\n";
    $gedcom .= "1 GEDC\n";
    $gedcom .= "2 VERS 5.5.1\n";
    $gedcom .= "1 CHAR UTF-8\n";
    
    // Récupérer tous les membres
    $membres = $pdo->query("SELECT * FROM membres ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer tous les mariages
    $mariages = $pdo->query("SELECT * FROM mariages ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    
    // Récupérer toutes les relations
    $relations = $pdo->query("
        SELECT DISTINCT enfant_id, mariage_id
        FROM relations
        WHERE type = 'parent'
        ORDER BY enfant_id
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Index: mariage_id => [enfants]
    $mariageEnfants = [];
    foreach ($mariages as $mariage) {
        $mariageEnfants[$mariage['id']] = [];
    }
    
    foreach ($relations as $rel) {
        if ($rel['mariage_id'] && isset($mariageEnfants[$rel['mariage_id']])) {
            if (!in_array($rel['enfant_id'], $mariageEnfants[$rel['mariage_id']])) {
                $mariageEnfants[$rel['mariage_id']][] = $rel['enfant_id'];
            }
        }
    }
    
    // Index FAMS et FAMC
    $personFams = [];
    $personFamc = [];
    
    foreach ($mariages as $mariage) {
        $famId = 'F' . $mariage['id'];
        
        if ($mariage['epoux_id']) {
            $personFams[$mariage['epoux_id']][] = $famId;
        }
        if ($mariage['epouse_id']) {
            $personFams[$mariage['epouse_id']][] = $famId;
        }
        
        foreach ($mariageEnfants[$mariage['id']] as $enfantId) {
            $personFamc[$enfantId] = $famId;
        }
    }
    
    // INDIVIDUS
    foreach ($membres as $membre) {
        $id = $membre['id'];
        $gedcom .= "0 @I{$id}@ INDI\n";
        
        if ($membre['prenom'] || $membre['nom']) {
            $prenom = $membre['prenom'] ?: '';
            $nom = $membre['nom'] ?: '';
            $gedcom .= "1 NAME {$prenom} /{$nom}/\n";
            if ($nom) $gedcom .= "2 SURN {$nom}\n";
            if ($prenom) $gedcom .= "2 GIVN {$prenom}\n";
        }
        
        if ($membre['sex'] && $membre['sex'] !== 'U') {
            $gedcom .= "1 SEX {$membre['sex']}\n";
        }
        
        if ($membre['date_naissance'] || $membre['lieu_naissance']) {
            $gedcom .= "1 BIRT\n";
            if ($membre['lieu_naissance']) $gedcom .= "2 PLAC {$membre['lieu_naissance']}\n";
            if ($membre['date_naissance']) $gedcom .= "2 DATE " . formatGedcomDate($membre['date_naissance']) . "\n";
        }
        
        if ($membre['date_deces'] || $membre['lieu_deces']) {
            $gedcom .= "1 DEAT\n";
            if ($membre['lieu_deces']) $gedcom .= "2 PLAC {$membre['lieu_deces']}\n";
            if ($membre['date_deces']) $gedcom .= "2 DATE " . formatGedcomDate($membre['date_deces']) . "\n";
        }
        
        if ($membre['occupation']) {
            $gedcom .= "1 OCCU {$membre['occupation']}\n";
        }
        
        if ($membre['notes']) {
            $notes = str_replace(["\r\n", "\n", "\r"], " ", trim($membre['notes']));
            $gedcom .= "1 NOTE {$notes}\n";
        }
        
        if (isset($personFams[$id])) {
            foreach (array_unique($personFams[$id]) as $famId) {
                $gedcom .= "1 FAMS @{$famId}@\n";
            }
        }
        
        if (isset($personFamc[$id])) {
            $gedcom .= "1 FAMC @{$personFamc[$id]}@\n";
        }
    }
    
    // FAMILLES
    foreach ($mariages as $mariage) {
        $famId = 'F' . $mariage['id'];
        $gedcom .= "0 @{$famId}@ FAM\n";
        
        if ($mariage['epoux_id']) {
            $gedcom .= "1 HUSB @I{$mariage['epoux_id']}@\n";
        }
        
        if ($mariage['epouse_id']) {
            $gedcom .= "1 WIFE @I{$mariage['epouse_id']}@\n";
        }
        
        if ($mariage['date_mariage'] || $mariage['lieu_mariage']) {
            $gedcom .= "1 MARR\n";
            if ($mariage['lieu_mariage']) $gedcom .= "2 PLAC {$mariage['lieu_mariage']}\n";
            if ($mariage['date_mariage']) $gedcom .= "2 DATE " . formatGedcomDate($mariage['date_mariage']) . "\n";
        }
        
        if ($mariage['date_fin'] && $mariage['type_fin'] === 'divorce') {
            $gedcom .= "1 DIV\n";
            $gedcom .= "2 DATE " . formatGedcomDate($mariage['date_fin']) . "\n";
        }
        
        if ($mariage['notes']) {
            $notes = str_replace(["\r\n", "\n", "\r"], " ", trim($mariage['notes']));
            $gedcom .= "1 NOTE {$notes}\n";
        }
        
        foreach ($mariageEnfants[$mariage['id']] as $enfantId) {
            $gedcom .= "1 CHIL @I{$enfantId}@\n";
        }
    }
    
    $gedcom .= "0 TRLR\n";
    file_put_contents($filepath, $gedcom);
}

function formatGedcomDate($date) {
    if (empty($date)) return '';
    
    // Convertir la date MySQL (YYYY-MM-DD) en format GEDCOM (DD MMM YYYY)
    $months = [
        '01' => 'JAN', '02' => 'FEB', '03' => 'MAR', '04' => 'APR',
        '05' => 'MAY', '06' => 'JUN', '07' => 'JUL', '08' => 'AUG',
        '09' => 'SEP', '10' => 'OCT', '11' => 'NOV', '12' => 'DEC'
    ];
    
    $parts = explode('-', $date);
    
    if (count($parts) === 3) {
        $year = $parts[0];
        $month = $months[$parts[1]] ?? '';
        $day = ltrim($parts[2], '0');
        
        return trim("{$day} {$month} {$year}");
    }
    
    return $date;
}

// Restaurer une sauvegarde
function restoreBackup() {
    if (!isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'message' => 'Aucun fichier fourni']);
        return;
    }
    
    $file = $_FILES['file'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    
    try {
        $content = file_get_contents($file['tmp_name']);
        
        switch ($ext) {
            case 'sql':
                restoreSQLBackup($content);
                break;
            case 'json':
                restoreJSONBackup($content);
                break;
            case 'gedcom':
            case 'ged':
                restoreGEDCOMBackup($content);
                break;
            default:
                throw new Exception("Format non supporté");
        }
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Restaurer depuis SQL
function restoreSQLBackup($content) {
    $pdo = getConnection();
    
    // Exécuter le script SQL
    $pdo->exec($content);
}

// Restaurer depuis JSON
function restoreJSONBackup($content) {
    $pdo = getConnection();
    $data = json_decode($content, true);
    
    if (!$data) {
        throw new Exception("JSON invalide");
    }
    
    $pdo->beginTransaction();
    
    try {
        foreach ($data as $table => $rows) {
            // Vider la table
            $pdo->exec("DELETE FROM `$table`");
            
            // Insérer les données
            if (!empty($rows)) {
                foreach ($rows as $row) {
                    $columns = array_keys($row);
                    $placeholders = array_fill(0, count($columns), '?');
                    
                    $sql = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute(array_values($row));
                }
            }
        }
        
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Restaurer depuis GEDCOM
function restoreGEDCOMBackup($content) {
    $pdo = getConnection();
    
    // Parser le fichier GEDCOM
    $lines = explode("\n", $content);
    $individuals = [];
    $families = [];
    $currentRecord = null;
    $currentType = null;
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        
        $parts = explode(' ', $line, 3);
        $level = (int)$parts[0];
        $tag = $parts[1] ?? '';
        $value = $parts[2] ?? '';
        
        // Nouveau record
        if ($level === 0) {
            if (preg_match('/@(I\d+)@/', $tag, $matches)) {
                $currentType = 'INDI';
                $currentRecord = ['id' => $matches[1], 'data' => []];
            } elseif (preg_match('/@(F\d+)@/', $tag, $matches)) {
                $currentType = 'FAM';
                $currentRecord = ['id' => $matches[1], 'data' => []];
            } else {
                $currentType = null;
                $currentRecord = null;
            }
        }
        // Données du record
        elseif ($currentRecord && $level === 1) {
            if ($currentType === 'INDI') {
                parseIndividualLine($currentRecord, $tag, $value);
            } elseif ($currentType === 'FAM') {
                parseFamilyLine($currentRecord, $tag, $value);
            }
        }
        // Sous-données
        elseif ($currentRecord && $level === 2) {
            parseSubLine($currentRecord, $tag, $value, $currentType);
        }
        
        // Fin de record, sauvegarder
        if ($level === 0 && $currentRecord && isset($currentRecord['complete'])) {
            if ($currentType === 'INDI') {
                $individuals[] = $currentRecord;
            } elseif ($currentType === 'FAM') {
                $families[] = $currentRecord;
            }
            $currentRecord = null;
        } else if ($currentRecord) {
            $currentRecord['complete'] = true;
        }
    }
    
    // Insérer dans la base de données
    $pdo->beginTransaction();
    
    try {
        // Vider les tables
        $pdo->exec("DELETE FROM relations");
        $pdo->exec("DELETE FROM mariages");
        $pdo->exec("DELETE FROM membres");
        
        // Insérer les individus
        $idMapping = [];
        foreach ($individuals as $indi) {
            $data = $indi['data'];
            $gedcomId = $indi['id'];
            
            $stmt = $pdo->prepare("
                INSERT INTO membres (prenom, nom, sex, date_naissance, lieu_naissance, 
                                    date_deces, lieu_deces, occupation, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['GIVN'] ?? null,
                $data['SURN'] ?? null,
                $data['SEX'] ?? 'U',
                $data['BIRT_DATE'] ?? null,
                $data['BIRT_PLAC'] ?? null,
                $data['DEAT_DATE'] ?? null,
                $data['DEAT_PLAC'] ?? null,
                $data['OCCU'] ?? null,
                $data['NOTE'] ?? null
            ]);
            
            $idMapping[$gedcomId] = $pdo->lastInsertId();
        }
        
        // Insérer les familles (mariages)
        $famMapping = [];
        foreach ($families as $fam) {
            $data = $fam['data'];
            $gedcomFamId = $fam['id'];
            
            $epoux_id = isset($data['HUSB']) && isset($idMapping[$data['HUSB']]) ? $idMapping[$data['HUSB']] : null;
            $epouse_id = isset($data['WIFE']) && isset($idMapping[$data['WIFE']]) ? $idMapping[$data['WIFE']] : null;
            
            if ($epoux_id || $epouse_id) {
                $stmt = $pdo->prepare("
                    INSERT INTO mariages (epoux_id, epouse_id, date_mariage, lieu_mariage, 
                                         date_fin, type_fin, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                
                $type_fin = '';
                if (isset($data['DIV_DATE'])) $type_fin = 'divorce';
                elseif (isset($data['ANUL_DATE'])) $type_fin = 'annulation';
                
                $date_fin = $data['DIV_DATE'] ?? $data['ANUL_DATE'] ?? null;
                
                $stmt->execute([
                    $epoux_id,
                    $epouse_id,
                    $data['MARR_DATE'] ?? null,
                    $data['MARR_PLAC'] ?? null,
                    $date_fin,
                    $type_fin,
                    $data['NOTE'] ?? null
                ]);
                
                $mariageId = $pdo->lastInsertId();
                $famMapping[$gedcomFamId] = $mariageId;
                
                // Insérer les relations parent-enfant
                if (isset($data['CHIL'])) {
                    foreach ($data['CHIL'] as $childGedcomId) {
                        if (isset($idMapping[$childGedcomId])) {
                            $enfant_id = $idMapping[$childGedcomId];
                            
                            // Relation avec le père
                            if ($epoux_id) {
                                $stmt = $pdo->prepare("
                                    INSERT INTO relations (enfant_id, parent_id, mariage_id, type)
                                    VALUES (?, ?, ?, 'parent')
                                ");
                                $stmt->execute([$enfant_id, $epoux_id, $mariageId]);
                            }
                            
                            // Relation avec la mère
                            if ($epouse_id) {
                                $stmt = $pdo->prepare("
                                    INSERT INTO relations (enfant_id, parent_id, mariage_id, type)
                                    VALUES (?, ?, ?, 'parent')
                                ");
                                $stmt->execute([$enfant_id, $epouse_id, $mariageId]);
                            }
                        }
                    }
                }
            }
        }
        
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Parser une ligne d'individu GEDCOM
function parseIndividualLine(&$record, $tag, $value) {
    switch ($tag) {
        case 'NAME':
            // Extraire prénom et nom de "Prénom /Nom/"
            if (preg_match('/(.+?)\/(.+?)\//', $value, $matches)) {
                $record['data']['GIVN'] = trim($matches[1]);
                $record['data']['SURN'] = trim($matches[2]);
            }
            break;
        case 'SEX':
            $record['data']['SEX'] = $value;
            break;
        case 'BIRT':
            $record['currentEvent'] = 'BIRT';
            break;
        case 'DEAT':
            $record['currentEvent'] = 'DEAT';
            break;
        case 'OCCU':
            $record['data']['OCCU'] = $value;
            break;
        case 'NOTE':
            $record['data']['NOTE'] = $value;
            break;
    }
}

// Parser une ligne de famille GEDCOM
function parseFamilyLine(&$record, $tag, $value) {
    switch ($tag) {
        case 'HUSB':
            if (preg_match('/@(I\d+)@/', $value, $matches)) {
                $record['data']['HUSB'] = $matches[1];
            }
            break;
        case 'WIFE':
            if (preg_match('/@(I\d+)@/', $value, $matches)) {
                $record['data']['WIFE'] = $matches[1];
            }
            break;
        case 'CHIL':
            if (preg_match('/@(I\d+)@/', $value, $matches)) {
                if (!isset($record['data']['CHIL'])) {
                    $record['data']['CHIL'] = [];
                }
                $record['data']['CHIL'][] = $matches[1];
            }
            break;
        case 'MARR':
            $record['currentEvent'] = 'MARR';
            break;
        case 'DIV':
            $record['currentEvent'] = 'DIV';
            break;
        case 'ANUL':
            $record['currentEvent'] = 'ANUL';
            break;
        case 'NOTE':
            $record['data']['NOTE'] = $value;
            break;
    }
}

// Parser une sous-ligne GEDCOM
function parseSubLine(&$record, $tag, $value, $type) {
    $event = $record['currentEvent'] ?? '';
    
    switch ($tag) {
        case 'GIVN':
            $record['data']['GIVN'] = $value;
            break;
        case 'SURN':
            $record['data']['SURN'] = $value;
            break;
        case 'DATE':
            if ($event) {
                $record['data'][$event . '_DATE'] = parseGedcomDateToMySQL($value);
            }
            break;
        case 'PLAC':
            if ($event) {
                $record['data'][$event . '_PLAC'] = $value;
            }
            break;
        case 'CONT':
            if (isset($record['data']['NOTE'])) {
                $record['data']['NOTE'] .= "\n" . $value;
            }
            break;
    }
}

// Convertir une date GEDCOM en format MySQL
function parseGedcomDateToMySQL($gedcomDate) {
    if (empty($gedcomDate)) return null;
    
    $months = [
        'JAN' => '01', 'FEB' => '02', 'MAR' => '03', 'APR' => '04',
        'MAY' => '05', 'JUN' => '06', 'JUL' => '07', 'AUG' => '08',
        'SEP' => '09', 'OCT' => '10', 'NOV' => '11', 'DEC' => '12'
    ];
    
    // Format: "DD MMM YYYY" ou "MMM YYYY" ou "YYYY"
    $parts = explode(' ', trim($gedcomDate));
    
    if (count($parts) === 3) {
        // DD MMM YYYY
        $day = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
        $month = $months[$parts[1]] ?? '01';
        $year = $parts[2];
        return "{$year}-{$month}-{$day}";
    } elseif (count($parts) === 2) {
        // MMM YYYY
        $month = $months[$parts[0]] ?? '01';
        $year = $parts[1];
        return "{$year}-{$month}-01";
    } elseif (count($parts) === 1) {
        // YYYY
        return "{$parts[0]}-01-01";
    }
    
    return null;
}

// Télécharger une sauvegarde
function downloadBackup() {
    $filename = $_GET['file'] ?? '';
    $filepath = BACKUP_DIR . basename($filename);
    
    if (!file_exists($filepath)) {
        header('HTTP/1.0 404 Not Found');
        echo json_encode(['success' => false, 'message' => 'Fichier non trouvé']);
        return;
    }
    
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($filename) . '"');
    header('Content-Length: ' . filesize($filepath));
    readfile($filepath);
    exit;
}

// Supprimer une sauvegarde
function deleteBackup() {
    $filename = $_GET['file'] ?? '';
    $filepath = BACKUP_DIR . basename($filename);
    
    if (file_exists($filepath) && unlink($filepath)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Impossible de supprimer le fichier']);
    }
}

// Formater la taille des fichiers
function formatBytes($bytes, $precision = 2) {
    $units = ['o', 'Ko', 'Mo', 'Go'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}
?>