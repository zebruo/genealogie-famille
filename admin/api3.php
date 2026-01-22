<?php
require_once 'config.php';
require_once 'mariage_manager.php'; // NOUVEAU : Inclure la classe MariageManager

class FamilyTreeAPI {
    private $pdo;
    private $mariageManager; // NOUVEAU : Gestionnaire de mariages

    public function __construct() {
        $this->pdo = getConnection();
        $this->mariageManager = new MariageManager($this->pdo); // NOUVEAU
        header('Content-Type: application/json');
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
    }

    // Utility functions
    private function formatDate($date, $fullFormat = false) {
        // Retourner null pour les dates vides, null, ou invalides comme 0000-00-00
        if (empty($date) || $date === '0000-00-00' || substr($date, 0, 4) === '0000') {
            return null;
        }
        return $fullFormat ? date('d-m-Y', strtotime($date)) : substr($date, 0, 4);
    }
    
    private function formatDateISO($date) {
        // Retourner null pour les dates vides, null, ou invalides comme 0000-00-00
        if (empty($date) || $date === '0000-00-00' || substr($date, 0, 4) === '0000') {
            return null;
        }
        // Retourner la date au format ISO (YYYY-MM-DD)
        return date('Y-m-d', strtotime($date));
    }

    private function getFirstName($fullName) {
        $names = explode(' ', trim($fullName));
        return $names[0];
    }

    private function getAllFirstNames($fullName) {
        return trim(preg_replace('/\s+/', ' ', $fullName));
    }

    // Request handling
    public function handleRequest() {
        $action = $_POST['action'] ?? $_GET['action'] ?? '';

        try {
            switch ($action) {
                case 'getMembres':
                    echo json_encode($this->getMembres());
                    break;

                case 'getRelations':
                    echo json_encode($this->getRelations());
                    break;

                case 'getFamilyData':
                    echo json_encode($this->getFamilyData());
                    break;

                case 'saveMembre':
                    echo json_encode($this->saveMember());
                    break;

                case 'saveRelation':
                    echo json_encode($this->saveRelation());
                    break;

                case 'deleteMembre':
                    echo json_encode($this->deleteMember());
                    break;

                case 'deleteRelation':
                    echo json_encode($this->deleteRelation());
                    break;

                // ============================================
                // NOUVELLES ACTIONS POUR LES MARIAGES
                // ============================================
                case 'addMariage':
                    echo json_encode($this->addMariage());
                    break;

                case 'updateMariage':
                    echo json_encode($this->updateMariage());
                    break;

                case 'deleteMariage':
                    echo json_encode($this->deleteMariage());
                    break;

                case 'getMariagesPersonne':
                    echo json_encode($this->getMariagesPersonne());
                    break;

                case 'getMariageDetails':
                    echo json_encode($this->getMariageDetails());
                    break;

                case 'updateMariageOrder':
                    echo json_encode($this->updateMariageOrder());
                    break;

                // ============================================
                // ACTIONS POUR LA GESTION DES LIEUX
                // ============================================
                case 'getLieux':
                    $manager = new LieuxManager();
                    echo json_encode(['success' => true, 'lieux' => $manager->getLieuxUniques()]);
                    break;

                case 'updateLieu':
                    $manager = new LieuxManager();
                    $ancien = $_POST['ancien_lieu'] ?? '';
                    $nouveau = $_POST['nouveau_lieu'] ?? '';
                    if (empty($ancien) || empty($nouveau)) {
                        throw new Exception('Lieux manquants');
                    }
                    echo json_encode($manager->mettreAJourLieu($ancien, $nouveau));
                    break;

                case 'deleteLieu':
                    $manager = new LieuxManager();
                    $lieu = $_POST['lieu'] ?? '';
                    if (empty($lieu)) {
                        throw new Exception('Lieu manquant');
                    }
                    echo json_encode($manager->supprimerLieu($lieu));
                    break;

                case 'getDetails':
                    $manager = new LieuxManager();
                    $lieu = $_GET['lieu'] ?? '';
                    if (empty($lieu)) {
                        throw new Exception('Lieu manquant');
                    }
                    echo json_encode(['success' => true, 'details' => $manager->getDetailsLieu($lieu)]);
                    break;

                case 'rechercher':
                    $manager = new LieuxManager();
                    $terme = $_GET['terme'] ?? '';
                    echo json_encode(['success' => true, 'lieux' => $manager->rechercherLieux($terme)]);
                    break;

                default:
                    throw new Exception('Action non trouvée');
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ============================================
    // MÉTHODES MODIFIÉES POUR MARIAGES MULTIPLES
    // ============================================

    private function getMembres() {
        $stmt = $this->pdo->query("
            SELECT m.*, 
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'type', r.type,
                        'id', m.id,
                        'relation_id', 
                        CASE 
                            WHEN r.enfant_id = m.id THEN COALESCE(r.parent_id, 0)
                            WHEN r.parent_id = m.id THEN r.enfant_id
                            ELSE r.enfant_id
                        END,
                        'mariage_id', r.mariage_id,
                        'date_naissance',
                        CASE 
                            WHEN r.enfant_id = m.id AND r.type = 'parent' THEN m3.date_naissance
                            WHEN r.enfant_id = m.id AND r.type = 'sibling' THEN m2.date_naissance
                            ELSE m2.date_naissance
                        END,
                        'nom', 
                        CASE 
                            WHEN r.enfant_id = m.id AND r.type = 'parent' THEN m3.nom
                            WHEN r.enfant_id = m.id AND r.type = 'sibling' THEN m2.nom
                            ELSE m2.nom
                        END,
                        'prenom',
                        CASE 
                            WHEN r.enfant_id = m.id AND r.type = 'parent' THEN m3.prenom
                            WHEN r.enfant_id = m.id AND r.type = 'sibling' THEN m2.prenom
                            ELSE m2.prenom
                        END
                    )
                )
                FROM relations r
                LEFT JOIN membres m2 ON r.enfant_id = m2.id
                LEFT JOIN membres m3 ON r.parent_id = m3.id
                WHERE (r.enfant_id = m.id OR r.parent_id = m.id)
                AND r.enfant_id != r.parent_id
            ) as relations
            FROM membres m
            ORDER BY m.nom, m.prenom
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getRelations() {
        $stmt = $this->pdo->query("
            SELECT r.*, 
                   r.mariage_id,
                   m1.prenom as enfant_prenom, m1.nom as enfant_nom,
                   m2.prenom as parent_prenom, m2.nom as parent_nom
            FROM relations r
            LEFT JOIN membres m1 ON r.enfant_id = m1.id
            LEFT JOIN membres m2 ON r.parent_id = m2.id
            ORDER BY r.enfant_id
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getFamilyData() {
        $membres = $this->getAllMembers();
        $result = [];

        foreach ($membres as $membre) {
            $id = $membre['id'];
            $parentIds = $this->getParentIds($id);
            $siblingIds = $this->getSiblingIds($id);
            
            // MODIFIÉ : Utiliser la nouvelle méthode pour récupérer les mariages
            $marriages = $this->getMarriagesForMember($id);

            $result[$id] = [
                'id' => $id,
                'firstName' => $this->getFirstName($membre['firstName']),
                'firstNames' => $this->getAllFirstNames($membre['firstName']),
                'lastName' => $membre['lastName'],
                'surnom' => $membre['surnom'] ?? '',
                'sex' => $membre['sex'],
                'birthDate' => $this->formatDate($membre['birthDate']),
                'deathDate' => $this->formatDate($membre['deathDate']),
                'fullBirthDate' => $this->formatDate($membre['birthDate'], true),
                'fullDeathDate' => $this->formatDate($membre['deathDate'], true),
                'isoBirthDate' => $this->formatDateISO($membre['birthDate']),
                'isoDeathDate' => $this->formatDateISO($membre['deathDate']),
                'birthPlace' => $membre['birthPlace'] ?? '',
                'deathPlace' => $membre['deathPlace'] ?? '',
                'doc_naissance' => $membre['doc_naissance'] ?? '',
                'doc_deces' => $membre['doc_deces'] ?? '',
                'occupation' => $membre['occupation'] ?? '',
                'notes' => $membre['notes'] ?? '',
                'parentIds' => $parentIds,
                'siblingIds' => array_values(array_unique($siblingIds)),
                'spouseIds' => array_keys($marriages), // Liste de tous les conjoints
                'marriages' => $marriages // MODIFIÉ : Nouveau format avec support multi-mariages
            ];
        }

        return $result;
    }

    private function getAllMembers() {
        // MODIFIÉ : Suppression des champs date_mariage et lieu_mariage
        $stmt = $this->pdo->query("
            SELECT 
                id,
                prenom as firstName,
                nom as lastName,
                surnom,
                date_naissance as birthDate,
                lieu_naissance as birthPlace,
                doc_naissance,
                date_deces as deathDate,
                lieu_deces as deathPlace,
                doc_deces,
                sex,
                occupation,
                notes
            FROM membres
            ORDER BY nom, prenom
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getParentIds($id) {
        $stmt = $this->pdo->prepare("
            SELECT parent_id
            FROM relations
            WHERE enfant_id = ? AND type = 'parent'
        ");
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    private function getSiblingIds($id) {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT 
                CASE 
                    WHEN r1.enfant_id = ? THEN r1.parent_id
                    ELSE r1.enfant_id
                END as sibling_id
            FROM relations r1
            WHERE (r1.enfant_id = ? OR r1.parent_id = ?)
            AND r1.type = 'sibling'
            AND r1.enfant_id != r1.parent_id
        ");
        $stmt->execute([$id, $id, $id]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    // NOUVELLE MÉTHODE : Récupérer les mariages pour un membre
    private function getMarriagesForMember($id) {
        $mariages = $this->mariageManager->getMariagesPersonne($id);
        $result = [];

        foreach ($mariages as $mariage) {
            $conjoint_id = ($mariage['epoux_id'] == $id) ? $mariage['epouse_id'] : $mariage['epoux_id'];
            
            $result[$conjoint_id] = [
                'marriageId' => $mariage['id'],
                'numeroOrdre' => $mariage['numero_ordre'] ?? 1, // Ajout du numéro d'ordre
                'date' => $this->formatDate($mariage['date_mariage']),
                'marriageDate' => $this->formatDate($mariage['date_mariage']),
                'fullMarriageDate' => $this->formatDate($mariage['date_mariage'], true),
                'place' => $mariage['lieu_mariage'] ?? '',
                'marriagePlace' => $mariage['lieu_mariage'] ?? '',
                'marriageYear' => $this->formatDate($mariage['date_mariage']),
                'endDate' => $this->formatDate($mariage['date_fin']),
                'divorceDate' => $this->formatDate($mariage['date_fin']),
                'fullDivorceDate' => $this->formatDate($mariage['date_fin'], true),
                'divorcePlace' => ($mariage['type_fin'] === 'divorce') ? ($mariage['lieu_fin'] ?? '') : '',
                'endType' => $mariage['type_fin'],
                'hasDivorce' => ($mariage['type_fin'] === 'divorce'), // Nouveau: flag pour divorce sans date
                'notes' => $mariage['notes'] ?? ''
            ];
        }

        return $result;
    }

    // ============================================
    // MÉTHODES POUR LES MARIAGES
    // ============================================

    private function addMariage() {
    $epoux_id = $_POST['epoux_id'] ?? null;
    $epouse_id = $_POST['epouse_id'] ?? null;
    $date_mariage = $_POST['date_mariage'] ?? null;
    $lieu_mariage = $_POST['lieu_mariage'] ?? null;
    $date_fin = $_POST['date_fin'] ?? null;
    $type_fin = $_POST['type_fin'] ?? null;
    $notes = $_POST['notes'] ?? null;

    if (!$epoux_id || !$epouse_id) {
        throw new Exception('Les deux conjoints sont requis');
    }

    $mariage_id = $this->mariageManager->ajouterMariage(
        $epoux_id,
        $epouse_id,
        $date_mariage,
        $lieu_mariage,
        $date_fin,
        $type_fin,
        $notes
    );

    if ($mariage_id) {
        return [
            'success' => true,
            'mariage_id' => $mariage_id,
            'message' => 'Mariage ajouté avec succès'
        ];
    } else {
        throw new Exception('Erreur lors de l\'ajout du mariage');
    }
}

    private function updateMariage() {
        $mariage_id = $_POST['mariage_id'] ?? null;
        
        if (!$mariage_id) {
            throw new Exception('ID du mariage requis');
        }

        $data = [];
        $allowed_fields = ['date_mariage', 'lieu_mariage', 'date_fin', 'type_fin', 'notes'];
        
        foreach ($allowed_fields as $field) {
            if (isset($_POST[$field])) {
                $data[$field] = $_POST[$field];
            }
        }

        $success = $this->mariageManager->modifierMariage($mariage_id, $data);

        return [
            'success' => $success,
            'message' => $success ? 'Mariage modifié avec succès' : 'Erreur lors de la modification'
        ];
    }

    private function deleteMariage() {
        $mariage_id = $_POST['mariage_id'] ?? null;
        
        if (!$mariage_id) {
            throw new Exception('ID du mariage requis');
        }

        $success = $this->mariageManager->supprimerMariage($mariage_id);

        return [
            'success' => $success,
            'message' => $success ? 'Mariage supprimé avec succès' : 'Erreur lors de la suppression'
        ];
    }

    private function getMariagesPersonne() {
        $personne_id = $_GET['personne_id'] ?? null;
        
        if (!$personne_id) {
            throw new Exception('ID de la personne requis');
        }

        $mariages = $this->mariageManager->getMariagesPersonne($personne_id);
        
        // Formater pour l'affichage
        $result = [];
        foreach ($mariages as $mariage) {
            $result[] = $this->mariageManager->formatMariagePourAffichage($mariage, $personne_id);
        }

        return [
            'success' => true,
            'mariages' => $result
        ];
    }

    private function getMariageDetails() {
        $mariage_id = $_GET['mariage_id'] ?? null;
        
        if (!$mariage_id) {
            throw new Exception('ID du mariage requis');
        }

        $mariage = $this->mariageManager->getMariageComplet($mariage_id);

        if (!$mariage) {
            throw new Exception('Mariage non trouvé');
        }

        return [
            'success' => true,
            'mariage' => $mariage
        ];
    }

    private function updateMariageOrder() {
        $mariage_id = $_POST['mariage_id'] ?? null;
        $numero_ordre = $_POST['numero_ordre'] ?? null;
        
        if (!$mariage_id || !$numero_ordre) {
            throw new Exception('ID du mariage et numéro d\'ordre requis');
        }

        // Valider que numero_ordre est un nombre positif
        $numero_ordre = intval($numero_ordre);
        if ($numero_ordre < 1) {
            throw new Exception('Le numéro d\'ordre doit être supérieur ou égal à 1');
        }

        // Mettre à jour le numéro d'ordre dans la table mariages
        $stmt = $this->pdo->prepare("UPDATE mariages SET numero_ordre = :numero_ordre WHERE id = :mariage_id");
        $success = $stmt->execute([
            'numero_ordre' => $numero_ordre,
            'mariage_id' => $mariage_id
        ]);

        return [
            'success' => $success,
            'message' => $success ? 'Numéro d\'ordre mis à jour avec succès' : 'Erreur lors de la mise à jour'
        ];
    }

    // ============================================
    // MÉTHODES MODIFIÉES POUR SAUVEGARDER
    // ============================================

    private function saveMember() {
        $id = $_POST['id'] ?? null;
        
        // MODIFIÉ : Suppression des champs date_mariage et lieu_mariage
        $data = [
            'prenom' => $_POST['prenom'],
            'nom' => $_POST['nom'],
            'surnom' => $_POST['surnom'] ?? null,
            'sex' => $_POST['sex'],
            'date_naissance' => $_POST['date_naissance'],
            'lieu_naissance' => $_POST['lieu_naissance'] ?? null,
            'doc_naissance' => $_POST['doc_naissance'] ?? null,
            'date_deces' => $_POST['date_deces'] ?: null,
            'lieu_deces' => $_POST['lieu_deces'] ?? null,
            'doc_deces' => $_POST['doc_deces'] ?? null,
            'occupation' => $_POST['occupation'] ?? null,
            'notes' => $_POST['notes'] ?? null
        ];

        if ($id) {
            $sql = "UPDATE membres SET 
                    prenom=:prenom, 
                    nom=:nom, 
                    surnom=:surnom,
                    sex=:sex, 
                    date_naissance=:date_naissance,
                    lieu_naissance=:lieu_naissance,
                    doc_naissance=:doc_naissance,
                    date_deces=:date_deces,
                    lieu_deces=:lieu_deces,
                    doc_deces=:doc_deces,
                    occupation=:occupation,
                    notes=:notes
                    WHERE id=:id";
            $data['id'] = $id;
        } else {
            $sql = "INSERT INTO membres 
                    (prenom, nom, surnom, sex, date_naissance, lieu_naissance, doc_naissance, date_deces, lieu_deces, doc_deces, occupation, notes) 
                    VALUES 
                    (:prenom, :nom, :surnom, :sex, :date_naissance, :lieu_naissance, :doc_naissance, :date_deces, :lieu_deces, :doc_deces, :occupation, :notes)";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($data);
        
        $membre_id = $id ?: $this->pdo->lastInsertId();
        
        return [
            'success' => true, 
            'id' => $membre_id
        ];
    }

    private function saveRelation() {
        $enfant_id = $_POST['enfant_id'];
        $parent_id = $_POST['parent_id'];
        $type = $_POST['type'];
        $mariage_id = $_POST['mariage_id'] ?? null;

        try {
            $this->pdo->beginTransaction();

            // Vérifier que les deux IDs existent
            if (!$enfant_id || !$parent_id) {
                throw new Exception('IDs manquants pour la relation');
            }

            // Pour les relations de type 'sibling', on stocke dans les deux sens
            if ($type === 'sibling') {
                // Vérifier si la relation existe déjà (dans un sens ou l'autre)
                $stmt = $this->pdo->prepare("
                    SELECT COUNT(*) FROM relations 
                    WHERE type = 'sibling' 
                    AND ((enfant_id = ? AND parent_id = ?) OR (enfant_id = ? AND parent_id = ?))
                ");
                $stmt->execute([$enfant_id, $parent_id, $parent_id, $enfant_id]);
                
                if ($stmt->fetchColumn() > 0) {
                    throw new Exception('Cette relation de fratrie existe déjà');
                }

                // Insérer la relation dans les deux sens
                $stmt = $this->pdo->prepare("
                    INSERT INTO relations (enfant_id, parent_id, type) 
                    VALUES (?, ?, 'sibling')
                ");
                $stmt->execute([$enfant_id, $parent_id]);
                
                $stmt->execute([$parent_id, $enfant_id]);
            } else {
                // Pour les relations parent-enfant normales
                $stmt = $this->pdo->prepare("
                    INSERT INTO relations (enfant_id, parent_id, mariage_id, type) 
                    VALUES (:enfant_id, :parent_id, :mariage_id, :type)
                ");

                $stmt->execute([
                    'enfant_id' => $enfant_id,
                    'parent_id' => $parent_id,
                    'mariage_id' => $mariage_id,
                    'type' => $type
                ]);
            }

            $this->pdo->commit();
            return ['success' => true];
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            throw new Exception('Erreur lors de la sauvegarde de la relation: ' . $e->getMessage());
        }
    }

    private function deleteMember() {
        $id = $_POST['id'];
        
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("DELETE FROM membres WHERE id = ?");
            $stmt->execute([$id]);

            // Supprimer les relations parent-enfant
            $stmt = $this->pdo->prepare("
                DELETE FROM relations 
                WHERE enfant_id = ? OR parent_id = ?
            ");
            $stmt->execute([$id, $id]);

            // Supprimer les mariages (avec gestion des enfants)
            $stmt = $this->pdo->prepare("
                SELECT id FROM mariages WHERE epoux_id = ? OR epouse_id = ?
            ");
            $stmt->execute([$id, $id]);
            $mariages = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($mariages as $mariage_id) {
                $this->mariageManager->supprimerMariage($mariage_id);
            }

            $this->pdo->commit();
            return ['success' => true];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    private function deleteRelation() {
        $enfant_id = $_POST['enfant_id'] ?? null;
        $parent_id = $_POST['parent_id'] ?? null;

        if (!$enfant_id || !$parent_id) {
            throw new Exception('IDs manquants pour supprimer la relation');
        }

        try {
            $this->pdo->beginTransaction();

            // Supprimer la relation (fonctionne pour parent et sibling)
            // Pour les siblings, on supprime dans les deux sens
            $stmt = $this->pdo->prepare("
                DELETE FROM relations 
                WHERE (enfant_id = ? AND parent_id = ?) 
                   OR (enfant_id = ? AND parent_id = ?)
            ");
            $stmt->execute([$enfant_id, $parent_id, $parent_id, $enfant_id]);

            $this->pdo->commit();
            return ['success' => true];
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            throw new Exception('Erreur lors de la suppression de la relation: ' . $e->getMessage());
        }
    }
}

// ========================================
// GESTION DES LIEUX
// ========================================

class LieuxManager {
    private $pdo;

    public function __construct() {
        $this->pdo = getConnection();
    }

    // Récupérer tous les lieux uniques (naissance et décès)
    public function getTousLesLieux() {
        $query = "
            SELECT lieu, type, COUNT(*) as occurrences
            FROM (
                SELECT lieu_naissance as lieu, 'naissance' as type
                FROM membres
                WHERE lieu_naissance IS NOT NULL AND lieu_naissance != ''
                UNION ALL
                SELECT lieu_deces as lieu, 'décès' as type
                FROM membres
                WHERE lieu_deces IS NOT NULL AND lieu_deces != ''
                UNION ALL
                SELECT lieu_mariage as lieu, 'mariage' as type
                FROM mariages
                WHERE lieu_mariage IS NOT NULL AND lieu_mariage != ''
            ) as tous_lieux
            GROUP BY lieu, type
            ORDER BY lieu, type
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Récupérer les lieux uniques sans distinction de type
    public function getLieuxUniques() {
        $query = "
            SELECT DISTINCT lieu, 
                   SUM(CASE WHEN type = 'naissance' THEN occurrences ELSE 0 END) as nb_naissances,
                   SUM(CASE WHEN type = 'décès' THEN occurrences ELSE 0 END) as nb_deces,
                   SUM(CASE WHEN type = 'mariage' THEN occurrences ELSE 0 END) as nb_mariages,
                   SUM(occurrences) as total
            FROM (
                SELECT lieu_naissance as lieu, 'naissance' as type, COUNT(*) as occurrences
                FROM membres
                WHERE lieu_naissance IS NOT NULL AND lieu_naissance != ''
                GROUP BY lieu_naissance
                UNION ALL
                SELECT lieu_deces as lieu, 'décès' as type, COUNT(*) as occurrences
                FROM membres
                WHERE lieu_deces IS NOT NULL AND lieu_deces != ''
                GROUP BY lieu_deces
                UNION ALL
                SELECT lieu_mariage as lieu, 'mariage' as type, COUNT(*) as occurrences
                FROM mariages
                WHERE lieu_mariage IS NOT NULL AND lieu_mariage != ''
                GROUP BY lieu_mariage
            ) as tous_lieux
            GROUP BY lieu
            ORDER BY lieu
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Mettre à jour un lieu (remplace toutes les occurrences)
    public function mettreAJourLieu($ancienLieu, $nouveauLieu) {
        try {
            $this->pdo->beginTransaction();

            // Mise à jour dans la table membres (naissances)
            $stmt = $this->pdo->prepare("
                UPDATE membres 
                SET lieu_naissance = :nouveau_lieu 
                WHERE lieu_naissance = :ancien_lieu
            ");
            $stmt->execute([
                'nouveau_lieu' => $nouveauLieu,
                'ancien_lieu' => $ancienLieu
            ]);

            // Mise à jour dans la table membres (décès)
            $stmt = $this->pdo->prepare("
                UPDATE membres 
                SET lieu_deces = :nouveau_lieu 
                WHERE lieu_deces = :ancien_lieu
            ");
            $stmt->execute([
                'nouveau_lieu' => $nouveauLieu,
                'ancien_lieu' => $ancienLieu
            ]);

            // Mise à jour dans la table mariages
            $stmt = $this->pdo->prepare("
                UPDATE mariages 
                SET lieu_mariage = :nouveau_lieu 
                WHERE lieu_mariage = :ancien_lieu
            ");
            $stmt->execute([
                'nouveau_lieu' => $nouveauLieu,
                'ancien_lieu' => $ancienLieu
            ]);

            $this->pdo->commit();
            return ['success' => true, 'message' => 'Lieu mis à jour avec succès'];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'message' => 'Erreur : ' . $e->getMessage()];
        }
    }

    // Supprimer un lieu (met à NULL toutes les occurrences)
    public function supprimerLieu($lieu) {
        try {
            $this->pdo->beginTransaction();

            // Suppression dans la table membres (naissances)
            $stmt = $this->pdo->prepare("
                UPDATE membres 
                SET lieu_naissance = NULL 
                WHERE lieu_naissance = :lieu
            ");
            $stmt->execute(['lieu' => $lieu]);

            // Suppression dans la table membres (décès)
            $stmt = $this->pdo->prepare("
                UPDATE membres 
                SET lieu_deces = NULL 
                WHERE lieu_deces = :lieu
            ");
            $stmt->execute(['lieu' => $lieu]);

            // Suppression dans la table mariages
            $stmt = $this->pdo->prepare("
                UPDATE mariages 
                SET lieu_mariage = NULL 
                WHERE lieu_mariage = :lieu
            ");
            $stmt->execute(['lieu' => $lieu]);

            $this->pdo->commit();
            return ['success' => true, 'message' => 'Lieu supprimé avec succès'];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'message' => 'Erreur : ' . $e->getMessage()];
        }
    }

    // Obtenir les détails d'utilisation d'un lieu
    public function getDetailsLieu($lieu) {
        $details = [
            'naissances' => [],
            'deces' => [],
            'mariages' => []
        ];

        // Naissances
        $stmt = $this->pdo->prepare("
            SELECT id, prenom, nom, date_naissance
            FROM membres
            WHERE lieu_naissance = :lieu
            ORDER BY date_naissance, nom, prenom
        ");
        $stmt->execute(['lieu' => $lieu]);
        $details['naissances'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Décès
        $stmt = $this->pdo->prepare("
            SELECT id, prenom, nom, date_deces
            FROM membres
            WHERE lieu_deces = :lieu
            ORDER BY date_deces, nom, prenom
        ");
        $stmt->execute(['lieu' => $lieu]);
        $details['deces'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Mariages
        $stmt = $this->pdo->prepare("
            SELECT m.id, m.date_mariage,
                   e1.prenom as epoux_prenom, e1.nom as epoux_nom,
                   e2.prenom as epouse_prenom, e2.nom as epouse_nom
            FROM mariages m
            JOIN membres e1 ON m.epoux_id = e1.id
            JOIN membres e2 ON m.epouse_id = e2.id
            WHERE m.lieu_mariage = :lieu
            ORDER BY m.date_mariage
        ");
        $stmt->execute(['lieu' => $lieu]);
        $details['mariages'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $details;
    }

    // Rechercher des lieux
    public function rechercherLieux($terme) {
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT lieu,
                   SUM(CASE WHEN type = 'naissance' THEN occurrences ELSE 0 END) as nb_naissances,
                   SUM(CASE WHEN type = 'décès' THEN occurrences ELSE 0 END) as nb_deces,
                   SUM(CASE WHEN type = 'mariage' THEN occurrences ELSE 0 END) as nb_mariages,
                   SUM(occurrences) as total
            FROM (
                SELECT lieu_naissance as lieu, 'naissance' as type, COUNT(*) as occurrences
                FROM membres
                WHERE lieu_naissance IS NOT NULL 
                  AND lieu_naissance != ''
                  AND lieu_naissance LIKE :terme
                GROUP BY lieu_naissance
                UNION ALL
                SELECT lieu_deces as lieu, 'décès' as type, COUNT(*) as occurrences
                FROM membres
                WHERE lieu_deces IS NOT NULL 
                  AND lieu_deces != ''
                  AND lieu_deces LIKE :terme
                GROUP BY lieu_deces
                UNION ALL
                SELECT lieu_mariage as lieu, 'mariage' as type, COUNT(*) as occurrences
                FROM mariages
                WHERE lieu_mariage IS NOT NULL 
                  AND lieu_mariage != ''
                  AND lieu_mariage LIKE :terme
                GROUP BY lieu_mariage
            ) as tous_lieux
            GROUP BY lieu
            ORDER BY lieu
        ");
        
        $stmt->execute(['terme' => '%' . $terme . '%']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Initialize and run
$api = new FamilyTreeAPI();
$api->handleRequest();