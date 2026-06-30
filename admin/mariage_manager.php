<?php
/**
 * Script PHP pour la gestion des mariages multiples
 * Version PDO (compatible avec api3.php qui utilise PDO)
 */

class MariageManager {
    private PDO $pdo;

    public function __construct(PDO $connexion) {
        $this->pdo = $connexion;
    }
    
    /**
     * Récupérer tous les mariages d'une personne
     */
    public function getMariagesPersonne(string $personne_id) {
        $sql = "SELECT 
                    m.id,
                    m.epoux_id,
                    m.epouse_id,
                    m.date_mariage,
                    m.date_mariage_affichage,
                    m.lieu_mariage,
                    m.date_fin,
                    m.date_fin_affichage,
                    m.type_fin,
                    m.numero_ordre,
                    m.notes,
                    me.prenom AS prenom_epoux,
                    me.nom AS nom_epoux,
                    me.sex AS sex_epoux,
                    mf.prenom AS prenom_epouse,
                    mf.nom AS nom_epouse,
                    mf.sex AS sex_epouse
                FROM mariages m
                LEFT JOIN membres me ON m.epoux_id = me.id
                LEFT JOIN membres mf ON m.epouse_id = mf.id
                WHERE m.epoux_id = :personne_id OR m.epouse_id = :personne_id
                ORDER BY m.date_mariage, m.numero_ordre";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':personne_id', $personne_id, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
 * Ajouter un nouveau mariage
 */
public function ajouterMariage(string $epoux_id, string $epouse_id, ?string $date_mariage = null, ?string $lieu_mariage = null, ?string $date_fin = null, ?string $type_fin = null, ?string $notes = null, ?string $date_mariage_affichage = null, ?string $date_fin_affichage = null) {
    // Calculer le numéro d'ordre pour chaque conjoint
    $numero_ordre_epoux = $this->getProchainNumeroOrdre($epoux_id);
    $numero_ordre_epouse = $this->getProchainNumeroOrdre($epouse_id);

    $sql = "INSERT INTO mariages (epoux_id, epouse_id, date_mariage, date_mariage_affichage, lieu_mariage, date_fin, date_fin_affichage, type_fin, notes, numero_ordre)
            VALUES (:epoux_id, :epouse_id, :date_mariage, :date_mariage_affichage, :lieu_mariage, :date_fin, :date_fin_affichage, :type_fin, :notes, :numero_ordre)";

    $stmt = $this->pdo->prepare($sql);
    $numero_ordre = max($numero_ordre_epoux, $numero_ordre_epouse);

    $stmt->bindValue(':epoux_id', $epoux_id, PDO::PARAM_INT);
    $stmt->bindValue(':epouse_id', $epouse_id, PDO::PARAM_INT);
    $stmt->bindValue(':date_mariage', $date_mariage, PDO::PARAM_STR);
    $stmt->bindValue(':date_mariage_affichage', $date_mariage_affichage, PDO::PARAM_STR);
    $stmt->bindValue(':lieu_mariage', $lieu_mariage, PDO::PARAM_STR);
    $stmt->bindValue(':date_fin', $date_fin, PDO::PARAM_STR);
    $stmt->bindValue(':date_fin_affichage', $date_fin_affichage, PDO::PARAM_STR);
    $stmt->bindValue(':type_fin', $type_fin, PDO::PARAM_STR);
    $stmt->bindValue(':notes', $notes, PDO::PARAM_STR);
    $stmt->bindValue(':numero_ordre', $numero_ordre, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        return $this->pdo->lastInsertId();
    }
    
    return false;
}
    
    /**
     * Obtenir le prochain numéro d'ordre pour une personne
     */
    private function getProchainNumeroOrdre(string $personne_id) {
        $sql = "SELECT COALESCE(MAX(numero_ordre), 0) + 1 AS prochain
                FROM mariages 
                WHERE epoux_id = :personne_id OR epouse_id = :personne_id";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':personne_id', $personne_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row['prochain'];
    }
    
    /**
     * Modifier un mariage existant
     */
    public function modifierMariage(string $mariage_id, array $data) {
        $fields = [];
        $params = [];
        
        $allowed_fields = ['date_mariage', 'date_mariage_affichage', 'lieu_mariage', 'date_fin', 'date_fin_affichage', 'type_fin', 'notes'];
        
        foreach ($allowed_fields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $params[':mariage_id'] = $mariage_id;
        
        $sql = "UPDATE mariages SET " . implode(", ", $fields) . " WHERE id = :mariage_id";
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }
    
    /**
     * Supprimer un mariage
     */
    public function supprimerMariage(string $mariage_id) {
        // Vérifier s'il y a des enfants liés à ce mariage
        $sql_check = "SELECT COUNT(*) as count FROM relations WHERE mariage_id = :mariage_id";
        $stmt = $this->pdo->prepare($sql_check);
        $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row['count'] > 0) {
            // Il y a des enfants, mettre à NULL au lieu de supprimer
            $sql = "UPDATE relations SET mariage_id = NULL WHERE mariage_id = :mariage_id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
            $stmt->execute();
        }
        
        // Supprimer le mariage
        $sql = "DELETE FROM mariages WHERE id = :mariage_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
        
        return $stmt->execute();
    }
    
    /**
     * Récupérer les enfants d'un mariage
     */
    public function getEnfantsMariage(string $mariage_id) {
        $sql = "SELECT DISTINCT m.* 
                FROM membres m
                INNER JOIN relations r ON m.id = r.enfant_id
                WHERE r.mariage_id = :mariage_id AND r.type = 'parent'
                ORDER BY m.date_naissance";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Obtenir les informations complètes d'un mariage
     */
    public function getMariageComplet(string $mariage_id) {
        $sql = "SELECT 
                    m.*,
                    me.prenom AS prenom_epoux,
                    me.nom AS nom_epoux,
                    me.sex AS sex_epoux,
                    me.date_naissance AS naissance_epoux,
                    me.date_deces AS deces_epoux,
                    mf.prenom AS prenom_epouse,
                    mf.nom AS nom_epouse,
                    mf.sex AS sex_epouse,
                    mf.date_naissance AS naissance_epouse,
                    mf.date_deces AS deces_epouse
                FROM mariages m
                LEFT JOIN membres me ON m.epoux_id = me.id
                LEFT JOIN membres mf ON m.epouse_id = mf.id
                WHERE m.id = :mariage_id";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $mariage = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($mariage) {
            // Ajouter les enfants
            $mariage['enfants'] = $this->getEnfantsMariage($mariage_id);
        }
        
        return $mariage;
    }
    
    /**
     * Obtenir tous les mariages avec statistiques
     */
    public function getTousMariages() {
        $sql = "SELECT 
                    m.id,
                    m.date_mariage,
                    m.lieu_mariage,
                    m.numero_ordre,
                    CONCAT(me.prenom, ' ', me.nom) AS epoux,
                    CONCAT(mf.prenom, ' ', mf.nom) AS epouse,
                    COUNT(DISTINCT r.enfant_id) AS nombre_enfants
                FROM mariages m
                LEFT JOIN membres me ON m.epoux_id = me.id
                LEFT JOIN membres mf ON m.epouse_id = mf.id
                LEFT JOIN relations r ON r.mariage_id = m.id AND r.type = 'parent'
                GROUP BY m.id
                ORDER BY m.date_mariage";
        
        $stmt = $this->pdo->query($sql);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Formater l'affichage d'un mariage pour l'interface
     */
    public function formatMariagePourAffichage(array $mariage, string $personne_id) {
        $conjoint_id = ($mariage['epoux_id'] == $personne_id) ? $mariage['epouse_id'] : $mariage['epoux_id'];
        $conjoint_prenom = ($mariage['epoux_id'] == $personne_id) ? $mariage['prenom_epouse'] : $mariage['prenom_epoux'];
        $conjoint_nom = ($mariage['epoux_id'] == $personne_id) ? $mariage['nom_epouse'] : $mariage['nom_epoux'];
        
        $numero_texte = '';
        if ($mariage['numero_ordre'] > 1) {
            $ordres = ['', '1er', '2e', '3e', '4e', '5e', '6e'];
            $numero_texte = ' (' . ($ordres[$mariage['numero_ordre']] ?? $mariage['numero_ordre'] . 'e') . ' mariage)';
        }
        
        $date_texte = $mariage['date_mariage'] ? date('d/m/Y', strtotime($mariage['date_mariage'])) : '';
        
        $status = '';
        if ($mariage['date_fin']) {
            $type_fin_texte = [
                'divorce' => 'divorcé',
                'deces' => 'décédé',
                'annulation' => 'annulé'
            ];
            $status = ' - ' . ($type_fin_texte[$mariage['type_fin']] ?? 'terminé');
        }
        
        return [
            'id' => $mariage['id'],
            'conjoint_id' => $conjoint_id,
            'conjoint_nom_complet' => $conjoint_prenom . ' ' . $conjoint_nom,
            'numero_ordre' => $mariage['numero_ordre'],
            'numero_texte' => $numero_texte,
            'date' => $date_texte,
            'lieu' => $mariage['lieu_mariage'],
            'status' => $status,
            'texte_complet' => "Marié à {$conjoint_prenom} {$conjoint_nom}{$numero_texte}" . 
                              ($date_texte ? " le {$date_texte}" : "") . 
                              ($mariage['lieu_mariage'] ? " à {$mariage['lieu_mariage']}" : "") . 
                              $status
        ];
    }
}
?>