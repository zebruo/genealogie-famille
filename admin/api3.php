<?php
require_once 'auth.php';
require_once 'config.php';
require_once 'mariage_manager.php';

// Point 5 : logique de confidentialité unifiée, partagée par les deux classes
function isPersonConfidential($date_naissance, $date_deces, $force_public = 0, $date_deces_affichage = null): bool {
    if (!empty($force_public)) return false;
    $hasDeath = !empty($date_deces) && $date_deces !== '0000-00-00';
    if ($hasDeath) return (int)substr($date_deces, 0, 4) > (date('Y') - 10);
    if (!empty($date_deces_affichage)) return false;
    if (empty($date_naissance) || $date_naissance === '0000-00-00') return true;
    return (int)substr($date_naissance, 0, 4) > (date('Y') - 100);
}

class FamilyTreeAPI {
    private $pdo;
    private $mariageManager;

    public function __construct() {
        $this->pdo = getConnection();
        $this->mariageManager = new MariageManager($this->pdo);
        header('Content-Type: application/json');
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
    }

    // Point 5 : délègue à la fonction partagée
    private function isConfidential($membre): bool {
        return isPersonConfidential(
            $membre['birthDate'] ?? null,
            $membre['deathDate'] ?? null,
            $membre['force_public'] ?? 0,
            $membre['deathDateDisplay'] ?? null
        );
    }

    private function maskMembre(array $data): array {
        return array_merge($data, [
            'firstName'          => '👤',
            'firstNames'         => '👤',
            'lastName'           => '🔒',
            'surnom'             => '',
            'birthDate'          => null,
            'fullBirthDate'      => null,
            'isoBirthDate'       => null,
            'birthDateDisplay'   => null,
            'birthPlace'         => '',
            'deathDate'          => null,
            'fullDeathDate'      => null,
            'isoDeathDate'       => null,
            'deathDateDisplay'   => null,
            'deathPlace'         => '',
            'doc_naissance'      => '',
            'doc_deces'          => '',
            'occupation'         => '',
            'notes'              => '',
            'isConfidential'     => true,
        ]);
    }

    // Point 4 : garde partagée pour les dates invalides
    private function isEmptyDate($date): bool {
        return empty($date) || $date === '0000-00-00' || substr($date, 0, 4) === '0000';
    }

    private function validateMemberData(array $data): void {
        if (empty(trim($data['prenom'] ?? ''))) throw new Exception('Le prénom est requis');
        if (empty(trim($data['nom'] ?? ''))) throw new Exception('Le nom est requis');
        if (!empty($data['sex']) && !in_array($data['sex'], ['M', 'F', 'U'])) {
            throw new Exception('Genre invalide');
        }
        $maxLengths = [
            'nom' => 100, 'prenom' => 150, 'surnom' => 100,
            'lieu_naissance' => 200, 'lieu_deces' => 200, 'occupation' => 200,
            'doc_naissance' => 3000, 'doc_deces' => 3000, 'notes' => 3000,
        ];
        foreach ($maxLengths as $field => $max) {
            if (!empty($data[$field]) && mb_strlen($data[$field]) > $max) {
                throw new Exception('Champ ' . $field . ' trop long (max ' . $max . ' car.)');
            }
        }
        foreach (['date_naissance', 'date_deces'] as $field) {
            $val = $data[$field] ?? '';
            if (!empty($val) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                throw new Exception('Format de date invalide (' . $field . ')');
            }
        }
        if (!empty($data['date_naissance']) && !empty($data['date_deces'])) {
            if ($data['date_naissance'] > $data['date_deces']) {
                throw new Exception('La date de naissance ne peut pas être postérieure à la date de décès');
            }
        }
    }

    private function formatDate($date, $fullFormat = false) {
        if ($this->isEmptyDate($date)) return null;
        return $fullFormat ? date('d-m-Y', strtotime($date)) : substr($date, 0, 4);
    }

    private function formatDateISO($date) {
        if ($this->isEmptyDate($date)) return null;
        return date('Y-m-d', strtotime($date));
    }

    private function getFirstName($fullName) {
        $names = explode(' ', trim($fullName));
        return $names[0];
    }

    private function getAllFirstNames($fullName) {
        return trim(preg_replace('/\s+/', ' ', $fullName));
    }

    public function handleRequest() {
        $action = $_POST['action'] ?? $_GET['action'] ?? '';

        requireLogin();

        try {
            switch ($action) {
                // ── Lecture (viewer + admin) ──────────────────────────────────
                case 'getMembres':
                    echo json_encode($this->getMembres());
                    break;

                case 'getRelations':
                    echo json_encode($this->getRelations());
                    break;

                case 'getFamilyData':
                    echo json_encode($this->getFamilyData());
                    break;

                case 'getMariagesPersonne':
                    echo json_encode($this->getMariagesPersonne());
                    break;

                case 'getMariageDetails':
                    echo json_encode($this->getMariageDetails());
                    break;

                case 'getLieux':
                    $manager = new LieuxManager();
                    echo json_encode(['success' => true, 'lieux' => $manager->getLieuxUniques()]);
                    break;

                case 'getDetails':
                    $manager = new LieuxManager();
                    $lieu = $_GET['lieu'] ?? '';
                    if (empty($lieu)) throw new Exception('Lieu manquant');
                    echo json_encode(['success' => true, 'details' => $manager->getDetailsLieu($lieu)]);
                    break;

                case 'rechercher':
                    $manager = new LieuxManager();
                    $terme = $_GET['terme'] ?? '';
                    echo json_encode(['success' => true, 'lieux' => $manager->rechercherLieux($terme)]);
                    break;

                // ── Écriture (admin uniquement) ───────────────────────────────
                case 'saveMembre':
                    requireAdmin();
                    echo json_encode($this->saveMember());
                    break;

                case 'saveRelation':
                    requireAdmin();
                    echo json_encode($this->saveRelation());
                    break;

                case 'deleteMembre':
                    requireAdmin();
                    echo json_encode($this->deleteMember());
                    break;

                case 'deleteRelation':
                    requireAdmin();
                    echo json_encode($this->deleteRelation());
                    break;

                case 'addMariage':
                    requireAdmin();
                    echo json_encode($this->addMariage());
                    break;

                case 'updateMariage':
                    requireAdmin();
                    echo json_encode($this->updateMariage());
                    break;

                case 'deleteMariage':
                    requireAdmin();
                    echo json_encode($this->deleteMariage());
                    break;

                case 'updateMariageOrder':
                    requireAdmin();
                    echo json_encode($this->updateMariageOrder());
                    break;

                case 'updateLieu':
                    requireAdmin();
                    $manager = new LieuxManager();
                    $ancien = $_POST['ancien_lieu'] ?? '';
                    $nouveau = $_POST['nouveau_lieu'] ?? '';
                    if (empty($ancien) || empty($nouveau)) throw new Exception('Lieux manquants');
                    echo json_encode($manager->mettreAJourLieu($ancien, $nouveau));
                    break;

                case 'deleteLieu':
                    requireAdmin();
                    $manager = new LieuxManager();
                    $lieu = $_POST['lieu'] ?? '';
                    if (empty($lieu)) throw new Exception('Lieu manquant');
                    echo json_encode($manager->supprimerLieu($lieu));
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
    // LECTURE
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
            $marriages = $this->getMarriagesForMember($id);

            $data = [
                'id'              => $id,
                'firstName'       => $this->getFirstName($membre['firstName']),
                'firstNames'      => $this->getAllFirstNames($membre['firstName']),
                'lastName'        => $membre['lastName'],
                'surnom'          => $membre['surnom'] ?? '',
                'sex'             => $membre['sex'],
                'birthDate'       => $this->formatDate($membre['birthDate']),
                'deathDate'       => $this->formatDate($membre['deathDate']),
                'fullBirthDate'   => $membre['birthDateDisplay'] ?: $this->formatDate($membre['birthDate'], true),
                'fullDeathDate'   => $membre['deathDateDisplay'] ?: $this->formatDate($membre['deathDate'], true),
                'isoBirthDate'    => $this->formatDateISO($membre['birthDate']),
                'isoDeathDate'    => $this->formatDateISO($membre['deathDate']),
                'birthDateDisplay'=> $membre['birthDateDisplay'] ?? null,
                'deathDateDisplay'=> $membre['deathDateDisplay'] ?? null,
                'birthPlace'      => $membre['birthPlace'] ?? '',
                'deathPlace'      => $membre['deathPlace'] ?? '',
                'doc_naissance'   => $membre['doc_naissance'] ?? '',
                'doc_deces'       => $membre['doc_deces'] ?? '',
                'occupation'      => $membre['occupation'] ?? '',
                'notes'           => $membre['notes'] ?? '',
                'parentIds'       => $parentIds,
                'siblingIds'      => array_values(array_unique($siblingIds)),
                'spouseIds'       => array_keys($marriages),
                'marriages'       => $marriages,
                'isConfidential'  => false,
                'force_public'    => (bool)($membre['force_public'] ?? false),
            ];

            if (!isAdmin() && $this->isConfidential($membre)) {
                $data = $this->maskMembre($data);
            }

            $result[$id] = $data;
        }

        return $result;
    }

    private function getAllMembers() {
        $stmt = $this->pdo->query("
            SELECT
                id,
                prenom as firstName,
                nom as lastName,
                surnom,
                date_naissance as birthDate,
                date_naissance_affichage as birthDateDisplay,
                lieu_naissance as birthPlace,
                doc_naissance,
                date_deces as deathDate,
                date_deces_affichage as deathDateDisplay,
                lieu_deces as deathPlace,
                doc_deces,
                sex,
                occupation,
                notes,
                force_public
            FROM membres
            ORDER BY nom, prenom
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getParentIds($id) {
        $stmt = $this->pdo->prepare("
            SELECT parent_id FROM relations WHERE enfant_id = ? AND type = 'parent'
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

    // Point 3 : champs dupliqués (date/marriageDate, place/marriagePlace, endDate/divorceDate) supprimés
    private function getMarriagesForMember($id) {
        $mariages = $this->mariageManager->getMariagesPersonne($id);
        $result = [];

        foreach ($mariages as $mariage) {
            $conjoint_id = ($mariage['epoux_id'] == $id) ? $mariage['epouse_id'] : $mariage['epoux_id'];
            $result[$conjoint_id] = [
                'marriageId'          => $mariage['id'],
                'numeroOrdre'         => $mariage['numero_ordre'] ?? 1,
                'marriageDate'        => $this->formatDate($mariage['date_mariage']),
                'fullMarriageDate'    => $mariage['date_mariage_affichage'] ?: $this->formatDate($mariage['date_mariage'], true),
                'marriageDateDisplay' => $mariage['date_mariage_affichage'] ?? null,
                'marriagePlace'       => $mariage['lieu_mariage'] ?? '',
                'marriageYear'        => $this->formatDate($mariage['date_mariage']),
                'divorceDate'         => $this->formatDate($mariage['date_fin']),
                'fullDivorceDate'     => $mariage['date_fin_affichage'] ?: $this->formatDate($mariage['date_fin'], true),
                'endDateDisplay'      => $mariage['date_fin_affichage'] ?? null,
                'divorcePlace'        => ($mariage['type_fin'] === 'divorce') ? ($mariage['lieu_fin'] ?? '') : '',
                'endType'             => $mariage['type_fin'],
                'hasDivorce'          => ($mariage['type_fin'] === 'divorce'),
                'notes'               => $mariage['notes'] ?? '',
            ];
        }

        return $result;
    }

    // ============================================
    // MARIAGES
    // ============================================

    private function addMariage() {
        $epoux_id  = $_POST['epoux_id']  ?? null;
        $epouse_id = $_POST['epouse_id'] ?? null;

        if (!$epoux_id || !$epouse_id) {
            throw new Exception('Les deux conjoints sont requis');
        }
        if ($epoux_id == $epouse_id) throw new Exception('Un conjoint ne peut pas se marier avec lui-même');
        $lieu = $_POST['lieu_mariage'] ?? '';
        if (mb_strlen($lieu) > 200) throw new Exception('Lieu de mariage trop long (max 200 car.)');
        $notesM = $_POST['notes'] ?? '';
        if (mb_strlen($notesM) > 2000) throw new Exception('Notes de mariage trop longues (max 2000 car.)');
        foreach (['date_mariage', 'date_fin'] as $field) {
            $val = $_POST[$field] ?? '';
            if (!empty($val) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                throw new Exception('Format de date invalide (' . $field . ')');
            }
        }

        $mariage_id = $this->mariageManager->ajouterMariage(
            $epoux_id,
            $epouse_id,
            $_POST['date_mariage']           ?? null,
            $_POST['lieu_mariage']           ?? null,
            $_POST['date_fin']               ?? null,
            $_POST['type_fin']               ?? null,
            $_POST['notes']                  ?? null,
            $_POST['date_mariage_affichage'] ?? null,
            $_POST['date_fin_affichage']     ?? null
        );

        if ($mariage_id) {
            return ['success' => true, 'mariage_id' => $mariage_id, 'message' => 'Mariage ajouté avec succès'];
        }
        throw new Exception('Erreur lors de l\'ajout du mariage');
    }

    private function updateMariage() {
        $mariage_id = $_POST['mariage_id'] ?? null;
        if (!$mariage_id) throw new Exception('ID du mariage requis');
        $lieu = $_POST['lieu_mariage'] ?? '';
        if (mb_strlen($lieu) > 200) throw new Exception('Lieu de mariage trop long (max 200 car.)');
        $notesM = $_POST['notes'] ?? '';
        if (mb_strlen($notesM) > 2000) throw new Exception('Notes de mariage trop longues (max 2000 car.)');
        foreach (['date_mariage', 'date_fin'] as $field) {
            $val = $_POST[$field] ?? '';
            if (!empty($val) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                throw new Exception('Format de date invalide (' . $field . ')');
            }
        }

        $data = [];
        foreach (['date_mariage', 'date_mariage_affichage', 'lieu_mariage', 'date_fin', 'date_fin_affichage', 'type_fin', 'notes'] as $field) {
            if (isset($_POST[$field])) $data[$field] = $_POST[$field];
        }

        $success = $this->mariageManager->modifierMariage($mariage_id, $data);
        return [
            'success' => $success,
            'message' => $success ? 'Mariage modifié avec succès' : 'Erreur lors de la modification'
        ];
    }

    private function deleteMariage() {
        $mariage_id = $_POST['mariage_id'] ?? null;
        if (!$mariage_id) throw new Exception('ID du mariage requis');

        $success = $this->mariageManager->supprimerMariage($mariage_id);
        return [
            'success' => $success,
            'message' => $success ? 'Mariage supprimé avec succès' : 'Erreur lors de la suppression'
        ];
    }

    private function getMariagesPersonne() {
        $personne_id = $_GET['personne_id'] ?? null;
        if (!$personne_id) throw new Exception('ID de la personne requis');

        $result = [];
        foreach ($this->mariageManager->getMariagesPersonne($personne_id) as $mariage) {
            $result[] = $this->mariageManager->formatMariagePourAffichage($mariage, $personne_id);
        }
        return ['success' => true, 'mariages' => $result];
    }

    private function getMariageDetails() {
        $mariage_id = $_GET['mariage_id'] ?? null;
        if (!$mariage_id) throw new Exception('ID du mariage requis');

        $mariage = $this->mariageManager->getMariageComplet($mariage_id);
        if (!$mariage) throw new Exception('Mariage non trouvé');

        return ['success' => true, 'mariage' => $mariage];
    }

    private function updateMariageOrder() {
        $mariage_id   = $_POST['mariage_id']   ?? null;
        $numero_ordre = $_POST['numero_ordre']  ?? null;
        if (!$mariage_id || !$numero_ordre) throw new Exception('ID du mariage et numéro d\'ordre requis');

        $numero_ordre = intval($numero_ordre);
        if ($numero_ordre < 1) throw new Exception('Le numéro d\'ordre doit être supérieur ou égal à 1');

        $stmt = $this->pdo->prepare("UPDATE mariages SET numero_ordre = :numero_ordre WHERE id = :mariage_id");
        $success = $stmt->execute(['numero_ordre' => $numero_ordre, 'mariage_id' => $mariage_id]);

        return [
            'success' => $success,
            'message' => $success ? 'Numéro d\'ordre mis à jour avec succès' : 'Erreur lors de la mise à jour'
        ];
    }

    // ============================================
    // ÉCRITURE
    // ============================================

    private function saveMember() {
        $id = $_POST['id'] ?? null;

        $data = [
            'prenom'                    => $_POST['prenom'],
            'nom'                       => $_POST['nom'],
            'surnom'                    => $_POST['surnom'] ?? null,
            'sex'                       => $_POST['sex'],
            'date_naissance'            => $_POST['date_naissance'] ?: null,
            'date_naissance_affichage'  => $_POST['date_naissance_affichage'] ?: null,
            'lieu_naissance'            => $_POST['lieu_naissance'] ?? null,
            'doc_naissance'             => $_POST['doc_naissance'] ?? null,
            'date_deces'                => $_POST['date_deces'] ?: null,
            'date_deces_affichage'      => $_POST['date_deces_affichage'] ?: null,
            'lieu_deces'                => $_POST['lieu_deces'] ?? null,
            'doc_deces'                 => $_POST['doc_deces'] ?? null,
            'occupation'                => $_POST['occupation'] ?? null,
            'notes'                     => $_POST['notes'] ?? null,
            'force_public'              => isset($_POST['force_public']) ? 1 : 0,
        ];

        $this->validateMemberData($data);

        if ($id) {
            $sql = "UPDATE membres SET
                    prenom=:prenom, nom=:nom, surnom=:surnom, sex=:sex,
                    date_naissance=:date_naissance, date_naissance_affichage=:date_naissance_affichage,
                    lieu_naissance=:lieu_naissance, doc_naissance=:doc_naissance,
                    date_deces=:date_deces, date_deces_affichage=:date_deces_affichage,
                    lieu_deces=:lieu_deces, doc_deces=:doc_deces,
                    occupation=:occupation, notes=:notes, force_public=:force_public
                    WHERE id=:id";
            $data['id'] = $id;
        } else {
            $sql = "INSERT INTO membres
                    (prenom, nom, surnom, sex, date_naissance, date_naissance_affichage, lieu_naissance, doc_naissance,
                     date_deces, date_deces_affichage, lieu_deces, doc_deces, occupation, notes, force_public)
                    VALUES
                    (:prenom, :nom, :surnom, :sex, :date_naissance, :date_naissance_affichage, :lieu_naissance, :doc_naissance,
                     :date_deces, :date_deces_affichage, :lieu_deces, :doc_deces, :occupation, :notes, :force_public)";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($data);

        return ['success' => true, 'id' => $id ?: $this->pdo->lastInsertId()];
    }

    // Point 1 : validation déplacée avant beginTransaction pour éviter une transaction non annulée
    private function saveRelation() {
        $enfant_id = $_POST['enfant_id'];
        $parent_id = $_POST['parent_id'];
        $type      = $_POST['type'];
        $mariage_id = $_POST['mariage_id'] ?? null;

        if (!$enfant_id || !$parent_id) {
            throw new Exception('IDs manquants pour la relation');
        }

        try {
            $this->pdo->beginTransaction();

            if ($type === 'sibling') {
                $stmt = $this->pdo->prepare("
                    SELECT COUNT(*) FROM relations
                    WHERE type = 'sibling'
                    AND ((enfant_id = ? AND parent_id = ?) OR (enfant_id = ? AND parent_id = ?))
                ");
                $stmt->execute([$enfant_id, $parent_id, $parent_id, $enfant_id]);
                if ($stmt->fetchColumn() > 0) {
                    throw new Exception('Cette relation de fratrie existe déjà');
                }

                $stmt = $this->pdo->prepare("INSERT INTO relations (enfant_id, parent_id, type) VALUES (?, ?, 'sibling')");
                $stmt->execute([$enfant_id, $parent_id]);
                $stmt->execute([$parent_id, $enfant_id]);
            } else {
                $stmt = $this->pdo->prepare("
                    INSERT INTO relations (enfant_id, parent_id, mariage_id, type)
                    VALUES (:enfant_id, :parent_id, :mariage_id, :type)
                ");
                $stmt->execute([
                    'enfant_id'  => $enfant_id,
                    'parent_id'  => $parent_id,
                    'mariage_id' => $mariage_id,
                    'type'       => $type
                ]);
            }

            $this->pdo->commit();
            return ['success' => true];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    private function deleteMember() {
        $id = $_POST['id'];

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("DELETE FROM membres WHERE id = ?");
            $stmt->execute([$id]);

            $stmt = $this->pdo->prepare("DELETE FROM relations WHERE enfant_id = ? OR parent_id = ?");
            $stmt->execute([$id, $id]);

            $stmt = $this->pdo->prepare("SELECT id FROM mariages WHERE epoux_id = ? OR epouse_id = ?");
            $stmt->execute([$id, $id]);
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $mariage_id) {
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
            $stmt = $this->pdo->prepare("
                DELETE FROM relations
                WHERE (enfant_id = ? AND parent_id = ?) OR (enfant_id = ? AND parent_id = ?)
            ");
            $stmt->execute([$enfant_id, $parent_id, $parent_id, $enfant_id]);
            $this->pdo->commit();
            return ['success' => true];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
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

    // Point 5 : délègue à la fonction partagée
    // Point 2 : $date_deces_affichage ajouté pour corriger le cas "décédé sans date ISO valide"
    private function isConfidential($date_naissance, $date_deces, $force_public = 0, $date_deces_affichage = null): bool {
        return isPersonConfidential($date_naissance, $date_deces, $force_public, $date_deces_affichage);
    }

    // Point 7 : sous-requête UNION ALL factorisée, partagée par getLieuxUniques et rechercherLieux
    private function buildLieuxSubquery(bool $withTerme = false): string {
        $fb = $withTerme ? " AND lieu_naissance LIKE :terme" : '';
        $fd = $withTerme ? " AND lieu_deces LIKE :terme"    : '';
        $fm = $withTerme ? " AND lieu_mariage LIKE :terme"  : '';
        return "
            SELECT lieu_naissance as lieu, 'naissance' as type, COUNT(*) as occurrences
            FROM membres WHERE lieu_naissance IS NOT NULL AND lieu_naissance != ''{$fb} GROUP BY lieu_naissance
            UNION ALL
            SELECT lieu_deces as lieu, 'décès' as type, COUNT(*) as occurrences
            FROM membres WHERE lieu_deces IS NOT NULL AND lieu_deces != ''{$fd} GROUP BY lieu_deces
            UNION ALL
            SELECT lieu_mariage as lieu, 'mariage' as type, COUNT(*) as occurrences
            FROM mariages WHERE lieu_mariage IS NOT NULL AND lieu_mariage != ''{$fm} GROUP BY lieu_mariage
        ";
    }

    public function getTousLesLieux() {
        $stmt = $this->pdo->query("
            SELECT lieu, type, COUNT(*) as occurrences
            FROM (
                SELECT lieu_naissance as lieu, 'naissance' as type FROM membres WHERE lieu_naissance IS NOT NULL AND lieu_naissance != ''
                UNION ALL
                SELECT lieu_deces as lieu, 'décès' as type FROM membres WHERE lieu_deces IS NOT NULL AND lieu_deces != ''
                UNION ALL
                SELECT lieu_mariage as lieu, 'mariage' as type FROM mariages WHERE lieu_mariage IS NOT NULL AND lieu_mariage != ''
            ) as tous_lieux
            GROUP BY lieu, type
            ORDER BY lieu, type
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Point 7 : DISTINCT supprimé (redondant avec GROUP BY), sous-requête déléguée
    public function getLieuxUniques() {
        $stmt = $this->pdo->query("
            SELECT lieu,
                   SUM(CASE WHEN type = 'naissance' THEN occurrences ELSE 0 END) as nb_naissances,
                   SUM(CASE WHEN type = 'décès'     THEN occurrences ELSE 0 END) as nb_deces,
                   SUM(CASE WHEN type = 'mariage'   THEN occurrences ELSE 0 END) as nb_mariages,
                   SUM(occurrences) as total
            FROM ({$this->buildLieuxSubquery()}) as tous_lieux
            GROUP BY lieu
            ORDER BY lieu
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Point 6 : boucle sur les 3 tables/colonnes au lieu de 3 blocs identiques
    public function mettreAJourLieu($ancienLieu, $nouveauLieu) {
        try {
            $this->pdo->beginTransaction();
            foreach ([['membres', 'lieu_naissance'], ['membres', 'lieu_deces'], ['mariages', 'lieu_mariage']] as [$table, $col]) {
                $stmt = $this->pdo->prepare("UPDATE $table SET $col = :nouveau_lieu WHERE $col = :ancien_lieu");
                $stmt->execute(['nouveau_lieu' => $nouveauLieu, 'ancien_lieu' => $ancienLieu]);
            }
            $this->pdo->commit();
            return ['success' => true, 'message' => 'Lieu mis à jour avec succès'];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'message' => 'Erreur : ' . $e->getMessage()];
        }
    }

    // Point 6 : même factorisation
    public function supprimerLieu($lieu) {
        try {
            $this->pdo->beginTransaction();
            foreach ([['membres', 'lieu_naissance'], ['membres', 'lieu_deces'], ['mariages', 'lieu_mariage']] as [$table, $col]) {
                $stmt = $this->pdo->prepare("UPDATE $table SET $col = NULL WHERE $col = :lieu");
                $stmt->execute(['lieu' => $lieu]);
            }
            $this->pdo->commit();
            return ['success' => true, 'message' => 'Lieu supprimé avec succès'];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'message' => 'Erreur : ' . $e->getMessage()];
        }
    }

    // Point 2 : date_deces_affichage récupérée et transmise à isConfidential pour les 3 sections
    public function getDetailsLieu($lieu) {
        $details = ['naissances' => [], 'deces' => [], 'mariages' => []];
        $admin = isAdmin();

        $stmt = $this->pdo->prepare("
            SELECT id, prenom, nom, date_naissance, date_naissance_affichage, date_deces, date_deces_affichage, force_public
            FROM membres WHERE lieu_naissance = :lieu ORDER BY date_naissance, nom, prenom
        ");
        $stmt->execute(['lieu' => $lieu]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
            if (!$admin && $this->isConfidential($p['date_naissance'], $p['date_deces'], $p['force_public'], $p['date_deces_affichage'])) {
                $p['prenom'] = '👤'; $p['nom'] = '🔒';
                $p['date_naissance'] = null; $p['date_naissance_affichage'] = null;
                $p['date_deces'] = null;     $p['date_deces_affichage'] = null;
            }
            $details['naissances'][] = $p;
        }

        $stmt = $this->pdo->prepare("
            SELECT id, prenom, nom, date_naissance, date_naissance_affichage, date_deces, date_deces_affichage, force_public
            FROM membres WHERE lieu_deces = :lieu ORDER BY date_deces, nom, prenom
        ");
        $stmt->execute(['lieu' => $lieu]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
            if (!$admin && $this->isConfidential($p['date_naissance'], $p['date_deces'], $p['force_public'], $p['date_deces_affichage'])) {
                $p['prenom'] = '👤'; $p['nom'] = '🔒';
                $p['date_naissance'] = null; $p['date_naissance_affichage'] = null;
                $p['date_deces'] = null;     $p['date_deces_affichage'] = null;
            }
            $details['deces'][] = $p;
        }

        $stmt = $this->pdo->prepare("
            SELECT m.id, m.date_mariage, m.date_mariage_affichage,
                   e1.prenom as epoux_prenom,  e1.nom as epoux_nom,
                   e1.date_naissance as epoux_dn,  e1.date_deces as epoux_dd,
                   e1.date_deces_affichage as epoux_dda,  e1.force_public as epoux_fp,
                   e2.prenom as epouse_prenom, e2.nom as epouse_nom,
                   e2.date_naissance as epouse_dn, e2.date_deces as epouse_dd,
                   e2.date_deces_affichage as epouse_dda, e2.force_public as epouse_fp
            FROM mariages m
            JOIN membres e1 ON m.epoux_id = e1.id
            JOIN membres e2 ON m.epouse_id = e2.id
            WHERE m.lieu_mariage = :lieu
            ORDER BY m.date_mariage
        ");
        $stmt->execute(['lieu' => $lieu]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $m) {
            $epoux_conf  = !$admin && $this->isConfidential($m['epoux_dn'],  $m['epoux_dd'],  $m['epoux_fp'], $m['epoux_dda']);
            $epouse_conf = !$admin && $this->isConfidential($m['epouse_dn'], $m['epouse_dd'], $m['epouse_fp'], $m['epouse_dda']);
            if ($epoux_conf)  { $m['epoux_prenom']  = '👤'; $m['epoux_nom']  = '🔒'; $m['epoux_dn']  = null; $m['epoux_dd']  = null; }
            if ($epouse_conf) { $m['epouse_prenom'] = '👤'; $m['epouse_nom'] = '🔒'; $m['epouse_dn'] = null; $m['epouse_dd'] = null; }
            if ($epoux_conf || $epouse_conf) { $m['date_mariage'] = null; $m['date_mariage_affichage'] = null; }
            $details['mariages'][] = $m;
        }

        return $details;
    }

    // Point 7 : sous-requête déléguée
    public function rechercherLieux($terme) {
        $stmt = $this->pdo->prepare("
            SELECT lieu,
                   SUM(CASE WHEN type = 'naissance' THEN occurrences ELSE 0 END) as nb_naissances,
                   SUM(CASE WHEN type = 'décès'     THEN occurrences ELSE 0 END) as nb_deces,
                   SUM(CASE WHEN type = 'mariage'   THEN occurrences ELSE 0 END) as nb_mariages,
                   SUM(occurrences) as total
            FROM ({$this->buildLieuxSubquery(true)}) as tous_lieux
            GROUP BY lieu
            ORDER BY lieu
        ");
        $stmt->execute(['terme' => '%' . $terme . '%']);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

$api = new FamilyTreeAPI();
$api->handleRequest();