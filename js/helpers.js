"use strict";

/**
 * Fonctions utilitaires globales
 */

/**
 * Met à jour le trombone du bouton Quick View pour indiquer la présence de documents
 */
function updateQuickViewButtonClip(personId) {
  fetch('admin/api4.php?action=getDocuments&person_id=' + personId)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        const docs = result.documents || [];
        const hasDocuments = docs.length > 0;
        const button = document.getElementById('qv-btn-' + personId);
        if (button) {
          // Mettre à jour le title
          const currentTitle = button.getAttribute('title');
          const hasInitialDocs = currentTitle === "Voir documents";
          const finalHasDocuments = hasInitialDocs || hasDocuments;
          // Mettre à jour le tooltip
          var label = button.querySelector('.qv-label');
          if (label) {
            label.textContent = finalHasDocuments ? 'Voir documents' : 'Pas de documents';
          }
          // Ajouter le trombone si des documents existent
          if (hasDocuments) {
            const container = button.querySelector('.doc-clip-container');
            if (container) {
              container.innerHTML = '<i class="fas fa-paperclip doc-clip"></i>';
            }
          }
        }
      }
    })
    .catch(error => console.error('Erreur chargement docs:', error));
}

/**
 * Formate les notes en transformant les URLs en liens et en préservant les sauts de ligne
 */
function formatNotes(notes) {
  if (!notes) return '';
  // Normaliser les retours à la ligne (supprimer \r)
  let formatted = notes.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Transformer les URLs en liens avec icône
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex,
    '<a href="$1" target="_blank" class="note-link">$1 🔗</a>'
  );
  // Préserver les sauts de ligne
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

/**
 * Formate les dates d'une personne pour affichage
 * Fonctionne avec n'importe quel objet ayant birthDate, deathDate et sex
 * @param {Object} person - Objet avec birthDate, deathDate, sex
 * @returns {string} - Dates formatées (ex: "1890 - 1965" ou "né en 1890")
 */
function formatPersonDates(person) {
  if (!person.birthDate && !person.deathDate) return '';

  var birthYear = person.birthDate && person.birthDate.length > 4 ?
    person.birthDate.substring(0, 4) :
    person.birthDate;
  var deathYear = person.deathDate && person.deathDate.length > 4 ?
    person.deathDate.substring(0, 4) :
    person.deathDate;

  var result = '';
  var isDeceased = deathYear && deathYear !== '' && deathYear !== '0000' && deathYear !== '0';

  if (birthYear && !isDeceased) {
    var neLabel = person.sex === 'F' ? 'née en' : 'né en';
    result = neLabel + ' ' + birthYear;
  } else if (birthYear && isDeceased) {
    result = birthYear + ' - ' + deathYear;
  } else if (isDeceased) {
    result = '-' + deathYear;
  }

  return result;
}
