<?php
/**
 * Fichiers de uploads/ et suppression d'un membre (partagé par api3.php et api4.php).
 */

// La base contient « uploads/… » ou « ../uploads/… » selon l'ancienneté du document ;
// sur le disque, le chemin est relatif à admin/
function cheminDisque(string $filePath): string {
    return str_starts_with($filePath, 'uploads/') ? '../' . $filePath : $filePath;
}

/**
 * À appeler dans la transaction, avant de supprimer le membre.
 * Un document partagé passe à une autre personne liée, sinon la contrainte ON DELETE CASCADE
 * l'effacerait aussi pour elle. Renvoie les fichiers des documents qui vont disparaître.
 */
function preparerDocumentsMembre(PDO $pdo, int $membreId): array {
    $stmt = $pdo->prepare("SELECT id, file_path FROM documents WHERE person_id = ?");
    $stmt->execute([$membreId]);
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $autrePersonne = $pdo->prepare("SELECT MIN(member_id) FROM document_members WHERE document_id = ? AND member_id <> ?");
    $changerProprietaire = $pdo->prepare("UPDATE documents SET person_id = ? WHERE id = ?");
    $retirerLien = $pdo->prepare("DELETE FROM document_members WHERE document_id = ? AND member_id = ?");

    $fichiers = [];
    foreach ($documents as $document) {
        $autrePersonne->execute([$document['id'], $membreId]);
        $nouveauProprietaire = $autrePersonne->fetchColumn();
        if ($nouveauProprietaire) {
            $changerProprietaire->execute([$nouveauProprietaire, $document['id']]);
            $retirerLien->execute([$document['id'], $nouveauProprietaire]);
        } elseif (!empty($document['file_path'])) {
            $fichiers[] = $document['file_path'];
        }
    }
    return $fichiers;
}

// À appeler après le commit : une transaction annulée ne doit jamais avoir effacé de fichier
function supprimerFichiersDocuments(array $fichiers): void {
    foreach ($fichiers as $fichier) {
        $chemin = cheminDisque($fichier);
        if (file_exists($chemin) && !unlink($chemin)) {
            error_log("Impossible de supprimer le fichier: " . $fichier);
        }
    }
}
