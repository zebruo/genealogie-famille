<?php
/**
 * Script PHP pour la gestion des mariages multiples
 * Version PDO (compatible avec api3.php qui utilise PDO)
 */

class MariageManager {
    private $pdo;
    
    public function __construct($connexion) {
        $this->pdo = $connexion;
    }
    
    /**
     * Récupérer tous les mariages d'une personne
     */
    public function getMariagesPersonne($personne_id) {
        $sql = "SELECT 
                    m.id,
                    m.epoux_id,
                    m.epouse_id,
                    m.date_mariage,
                    m.lieu_mariage,
                    m.date_fin,
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
public function ajouterMariage($epoux_id, $epouse_id, $date_mariage = null, $lieu_mariage = null, $date_fin = null, $type_fin = null, $notes = null) {
    // Calculer le numéro d'ordre pour chaque conjoint
    $numero_ordre_epoux = $this->getProchainNumeroOrdre($epoux_id);
    $numero_ordre_epouse = $this->getProchainNumeroOrdre($epouse_id);
    
    $sql = "INSERT INTO mariages (epoux_id, epouse_id, date_mariage, lieu_mariage, date_fin, type_fin, notes, numero_ordre) 
            VALUES (:epoux_id, :epouse_id, :date_mariage, :lieu_mariage, :date_fin, :type_fin, :notes, :numero_ordre)";
    
    $stmt = $this->pdo->prepare($sql);
    $numero_ordre = max($numero_ordre_epoux, $numero_ordre_epouse);
    
    $stmt->bindValue(':epoux_id', $epoux_id, PDO::PARAM_INT);
    $stmt->bindValue(':epouse_id', $epouse_id, PDO::PARAM_INT);
    $stmt->bindValue(':date_mariage', $date_mariage, PDO::PARAM_STR);
    $stmt->bindValue(':lieu_mariage', $lieu_mariage, PDO::PARAM_STR);
    $stmt->bindValue(':date_fin', $date_fin, PDO::PARAM_STR);
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
    private function getProchainNumeroOrdre($personne_id) {
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
    public function modifierMariage($mariage_id, $data) {
        $fields = [];
        $params = [];
        
        $allowed_fields = ['date_mariage', 'lieu_mariage', 'date_fin', 'type_fin', 'notes'];
        
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
     * Terminer un mariage (divorce ou décès)
     */
    public function terminerMariage($mariage_id, $date_fin, $type_fin = 'divorce') {
        $sql = "UPDATE mariages SET date_fin = :date_fin, type_fin = :type_fin WHERE id = :mariage_id";
        $stmt = $this->pdo->prepare($sql);
        
        $stmt->bindValue(':date_fin', $date_fin, PDO::PARAM_STR);
        $stmt->bindValue(':type_fin', $type_fin, PDO::PARAM_STR);
        $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
        
        return $stmt->execute();
    }
    
    /**
     * Supprimer un mariage
     */
    public function supprimerMariage($mariage_id) {
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
    public function getEnfantsMariage($mariage_id) {
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
     * Lier un enfant à un mariage
     */
    public function lierEnfantMariage($enfant_id, $mariage_id) {
        $sql = "UPDATE relations 
                SET mariage_id = :mariage_id 
                WHERE enfant_id = :enfant_id AND type = 'parent'";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':mariage_id', $mariage_id, PDO::PARAM_INT);
        $stmt->bindValue(':enfant_id', $enfant_id, PDO::PARAM_INT);
        
        return $stmt->execute();
    }
    
    /**
     * Obtenir les informations complètes d'un mariage
     */
    public function getMariageComplet($mariage_id) {
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
    public function formatMariagePourAffichage($mariage, $personne_id) {
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

// ============================================================================
// EXEMPLE D'UTILISATION
// ============================================================================

/*
// Configuration de la connexion PDO
require_once 'config.php';
$pdo = getConnection();

// Créer une instance du gestionnaire
$mariageManager = new MariageManager($pdo);

// Exemple 1 : Ajouter un mariage
$mariage_id = $mariageManager->ajouterMariage(
    1,  // ID de l'époux
    2,  // ID de l'épouse
    '2000-05-15',  // Date de mariage
    'Paris, France'  // Lieu de mariage
);

// Exemple 2 : Récupérer tous les mariages d'une personne
$mariages = $mariageManager->getMariagesPersonne(1);
foreach ($mariages as $mariage) {
    $affichage = $mariageManager->formatMariagePourAffichage($mariage, 1);
    echo $affichage['texte_complet'] . "\n";
}

// Exemple 3 : Terminer un mariage (divorce)
$mariageManager->terminerMariage($mariage_id, '2010-03-20', 'divorce');

// Exemple 4 : Ajouter un deuxième mariage pour la même personne
$mariage2_id = $mariageManager->ajouterMariage(
    1,  // ID de l'époux (même personne)
    3,  // ID du nouvel épouse
    '2011-09-10',
    'Lyon, France'
);

// Exemple 5 : Lier des enfants au bon mariage
$mariageManager->lierEnfantMariage(10, $mariage_id);  // Enfant du 1er mariage
$mariageManager->lierEnfantMariage(11, $mariage2_id);  // Enfant du 2e mariage

// Exemple 6 : Obtenir les informations complètes d'un mariage
$mariage_complet = $mariageManager->getMariageComplet($mariage_id);
echo "Mariage entre {$mariage_complet['prenom_epoux']} et {$mariage_complet['prenom_epouse']}\n";
echo "Nombre d'enfants : " . count($mariage_complet['enfants']) . "\n";
*/
?>