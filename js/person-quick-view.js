// ========================================
// PERSON QUICK VIEW - CONFIGURATION
// ========================================
const QUICK_VIEW_CONFIG = {
  apiEndpoint: "../admin/api4.php",
};
const quickViewState = {
  members: [],
  selectedPerson: null,
  documents: [],
};

// ========================================
// PERSON QUICK VIEW - FONCTION PRINCIPALE
// ========================================
async function openPersonQuickView(personId) {
  try {
    await loadMemberInfoForQuickView(personId);
    if (!quickViewState.selectedPerson) {
      showQuickViewNotification("Personne non trouvée", "error");
      return;
    }
    await loadPersonDocumentsForQuickView(personId);
    
    const member = quickViewState.selectedPerson;
    
    // Construire directement la liste de tous les documents
    const allDocs = [];
    
    // Ajouter source naissance si elle existe
    if (member.doc_naissance && member.doc_naissance.trim() !== '') {
      allDocs.push({
        id: 'temp_naissance_' + personId,
        type: 'note',
        source: 'naissance',
        source_label: 'Naissance',
        content: member.doc_naissance,
        title: 'Source naissance'
      });
    }

    // Ajouter notes de mariage
    const mariageDocs = quickViewState.documents.filter(d => 
      d.id.toString().startsWith("temp_mariage_") && d.type === "note"
    );
    allDocs.push(...mariageDocs);

    // Ajouter source décès si elle existe
    if (member.doc_deces && member.doc_deces.trim() !== '') {
      allDocs.push({
        id: 'temp_deces_' + personId,
        type: 'note',
        source: 'deces',
        source_label: 'Décès',
        content: member.doc_deces,
        title: 'Source décès'
      });
    }

    // Ajouter note membre si elle existe
    if (member.noteMembre > 0) {
      const noteMembre = quickViewState.documents.find(d => 
        d.id.toString().startsWith("temp_membre_") && d.type === "note"
      );
      if (noteMembre) allDocs.push(noteMembre);
    }

    // Ajouter documents (notes)
    const noteDocs = quickViewState.documents.filter(d =>
      !d.id.toString().startsWith("temp_") &&
      d.type === "note" &&
      d.source !== "membre" &&
      !d.source.startsWith("mariage_")
    );
    allDocs.push(...noteDocs);
    
    // Ajouter PDFs
    const pdfDocs = quickViewState.documents.filter(d =>
      !d.id.toString().startsWith("temp_") &&
      d.type === "pdf" &&
      d.source !== "membre" &&
      !d.source.startsWith("mariage_")
    );
    allDocs.push(...pdfDocs);
    
    // Ajouter photos
    const photoDocs = quickViewState.documents.filter(d =>
      !d.id.toString().startsWith("temp_") &&
      d.type === "photo" &&
      d.source !== "membre" &&
      !d.source.startsWith("mariage_")
    );
    allDocs.push(...photoDocs);
    
    // Mettre à jour le nom de la personne
    document.getElementById("modalPersonName").textContent = `${member.prenom} ${member.nom}`;
    
    // Afficher directement la liste des documents
    renderAllDocumentsList(allDocs, personId);
    
    document.getElementById("documentsModal").classList.add("show");
  } catch (error) {
    console.error("Erreur dans openPersonQuickView:", error);
    showQuickViewNotification(
      "Erreur lors du chargement des informations",
      "error"
    );
  }
}

// ========================================
// FONCTIONS API
// ========================================
async function loadMemberInfoForQuickView(personId) {
  try {
    const response = await fetch(
      `${QUICK_VIEW_CONFIG.apiEndpoint}?action=getMembres`
    );
    const data = await response.json();
    quickViewState.members = data.map((m) => ({
      id: Number(m.id),
      nom: m.nom,
      prenom: m.prenom,
      birthPlace: m.lieu_naissance,
      birthDate: m.date_naissance,
      deathDate: m.date_deces,
      deathPlace: m.lieu_deces,
      doc_naissance: m.doc_naissance || '',
      doc_deces: m.doc_deces || '',
      noteMembre: m.notes ? 1 : 0,
      noteMariage: 0,
      documents: 0,
      pdf: 0,
      photos: 0,
    }));
    quickViewState.selectedPerson = quickViewState.members.find(
      (m) => m.id === personId
    );
    if (quickViewState.selectedPerson) {
      await loadDocumentCountsForQuickView(personId);
    }
  } catch (error) {
    console.error("Erreur loadMemberInfoForQuickView:", error);
    throw error;
  }
}

async function loadDocumentCountsForQuickView(personId) {
  try {
    const response = await fetch(
      `${QUICK_VIEW_CONFIG.apiEndpoint}?action=getAllDocumentCounts`
    );
    const result = await response.json();
    if (result.success && quickViewState.selectedPerson) {
      const mariageCounts = result.mariageCounts || {};
      const documentCounts = result.documentCounts || {};
      quickViewState.selectedPerson.noteMariage = mariageCounts[personId] || 0;
      if (documentCounts[personId]) {
        quickViewState.selectedPerson.documents =
          documentCounts[personId].note || 0;
        quickViewState.selectedPerson.pdf = documentCounts[personId].pdf || 0;
        quickViewState.selectedPerson.photos =
          documentCounts[personId].photo || 0;
      }
    }
  } catch (error) {
    console.error("Erreur loadDocumentCountsForQuickView:", error);
  }
}

async function loadPersonDocumentsForQuickView(personId) {
  try {
    const response = await fetch(
      `${QUICK_VIEW_CONFIG.apiEndpoint}?action=getDocuments&person_id=${personId}`
    );
    const result = await response.json();
    if (result.success) {
      quickViewState.documents = result.documents || [];
    }
  } catch (error) {
    console.error("Erreur loadPersonDocumentsForQuickView:", error);
    showQuickViewNotification(
      "Erreur lors du chargement des documents",
      "error"
    );
  }
}

// ========================================
// AFFICHAGE DES DOCUMENTS
// ========================================
function renderAllDocumentsList(documents, personId) {
  const container = document.getElementById("documentsList");
  
  if (documents.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-inbox" style="font-size: 3em; margin-bottom: 15px; opacity: 0.3;"></i>
        <p>Aucun document trouvé</p>
      </div>
    `;
    return;
  }
  
  let html = '<div class="documents-list">';
  
  documents.forEach((doc) => {
    const isTemp = doc.id.toString().startsWith('temp_');
    let typeBadge = '';
    
    // Déterminer le badge selon le type et la source
    if (isTemp) {
      if (doc.source === 'membre') {
        typeBadge = '<span class="document-type-badge document-type-note"><i class="fas fa-sticky-note"></i></span><span class="document-meta">Note</span>';
      } else if (doc.source === 'naissance') {
        typeBadge = '<span class="document-type-badge document-type-naissance"><i class="fas fa-baby"></i></span><span class="document-meta">Naissance</span>';
      } else if (doc.source === 'deces') {
        typeBadge = '<span class="document-type-badge document-type-deces"><i class="fas fa-cross"></i></span><span class="document-meta">Décès</span>';
      } else if (doc.source && doc.source.startsWith('mariage_')) {
        typeBadge = '<span class="document-type-badge document-type-mariage"><i class="fas fa-ring"></i></span><span class="document-meta">Mariage</span>';
      }
    } else {
      if (doc.type === 'note') {
        typeBadge = '<span class="document-type-badge document-type-document"><i class="fas fa-file-alt"></i></span><span class="document-meta">Document</span>';
      } else if (doc.type === 'pdf') {
        typeBadge = '<span class="document-type-badge document-type-pdf"><i class="fas fa-file-pdf"></i></span><span class="document-meta">PDF</span>';
      } else if (doc.type === 'photo') {
        typeBadge = '<span class="document-type-badge document-type-photo"><i class="fas fa-image"></i></span><span class="document-meta">Photo</span>';
      }
    }
    
    // Construire les métadonnées comme dans documents-manager
    let title = '';
    let meta = '';
    const member = quickViewState.selectedPerson;
    
    if (isTemp) {
      if (doc.source === 'membre') {
        title = 'Note du membre';
        // Afficher les 20 premières lettres de la note
        if (doc.content) {
          const cleanContent = stripHtml(doc.content).trim();
          meta = cleanContent.substring(0, 20) + (cleanContent.length > 20 ? ' ...' : '');
        } else {
          meta = 'Aucune note';
        }
      } else if (doc.source === 'naissance') {
        title = 'Source naissance';
        meta = member.birthDate ? `Le ${formatDateDisplay(member.birthDate)}${member.birthPlace ? ', ' + member.birthPlace : ''} ...` : 'Naissance';
      } else if (doc.source === 'deces') {
        title = 'Source décès';
        meta = member.deathDate ? `Le ${formatDateDisplay(member.deathDate)}${member.deathPlace ? ', ' + member.deathPlace : ''} ...` : 'Décès';
      } else if (doc.source && doc.source.startsWith('mariage_')) {
        title = doc.title || 'Note de mariage';
        // Afficher la date de mariage si disponible
        if (doc.date_mariage && doc.date_mariage !== '0000-00-00') {
          meta = `Le ${formatDateDisplay(doc.date_mariage)}`;
          // Ajouter le nom du conjoint après la date
          if (doc.source_label) {
            // Supprimer "Mariage " du début de source_label pour garder uniquement "avec [nom]"
            const labelClean = doc.source_label.replace(/^Mariage\s+/i, '');
            meta += ` ${labelClean} ...`;
          }
        } else {
          // Si pas de date, supprimer "Mariage " aussi
          const labelClean = doc.source_label ? doc.source_label.replace(/^Mariage\s+/i, '') : 'Mariage';
          meta = labelClean;
        }
      }
    } else {
      title = doc.title || doc.file_name || 'Document';
      meta = doc.description ? `${doc.description} ...` : '';
    }
    
    // Bouton d'ouverture spécifique selon le type
    let viewButton = '';
    if (doc.type === 'note') {
      // Encoder les données en base64 pour éviter les problèmes d'apostrophes
      const docData = btoa(encodeURIComponent(JSON.stringify(doc)));
      viewButton = `<i class="fas fa-eye btn-edit" data-doc="${docData}" data-person-id="${personId}" onclick="viewNoteSimpleFromButton(this)" title="Voir la note"></i>`;
    } else if (doc.type === 'pdf' && doc.file_path) {
      viewButton = `<a href="${escapeHtml(doc.file_path)}" target="_blank" style="color: inherit; text-decoration: none;"><i class="fas fa-eye btn-edit" title="Voir le PDF"></i></a>`;
    } else if (doc.type === 'photo' && doc.file_path) {
      viewButton = `<i class="fas fa-eye btn-edit" data-photo-path="${escapeHtml(doc.file_path)}" data-photo-title="${escapeHtml(doc.title || 'Photo')}" onclick="openPhotoModalFromButton(this)" title="Voir la photo"></i>`;
    }
    
    html += `
      <div class="document-item">
        <div class="document-info">
          ${typeBadge}
          <div class="document-meta">${meta}</div>
        </div>
        <div class="document-actions">
          ${viewButton}
        </div>
      </div>
    `;
  });
  
  html += "</div>";
  container.innerHTML = html;
}

// Fonction wrapper pour viewNoteSimple utilisant data-attributes
function viewNoteSimpleFromButton(button) {
  const docData = button.getAttribute('data-doc');
  const personId = parseInt(button.getAttribute('data-person-id'));
  
  try {
    // Décoder les données
    const doc = JSON.parse(decodeURIComponent(atob(docData)));
    viewNoteSimple(doc, personId);
  } catch (error) {
    console.error('Erreur lors du décodage des données du document:', error);
    showQuickViewNotification('Erreur lors de l\'ouverture du document', 'error');
  }
}

// Fonction wrapper pour openPhotoModal utilisant data-attributes
function openPhotoModalFromButton(button) {
  const photoPath = button.getAttribute('data-photo-path');
  const photoTitle = button.getAttribute('data-photo-title');
  openPhotoModal(photoPath, photoTitle);
}

function viewNoteSimple(doc, personId) {
  const html = `
    <div class="documents-view-header">
      <button class="btn-back" onclick="openPersonQuickView(${personId})">
        <i class="fas fa-arrow-left"></i> Retour
      </button>
    </div>
    <div class="note-detail">
      <div class="note-content">${formatNotes(doc.content || "")}</div>
    </div>
  `;
  document.getElementById("documentsList").innerHTML = html;
}

function openPhotoModal(photoPath, title) {
  const modal = document.createElement("div");
  modal.className = "photo-modal";
  modal.innerHTML = `
    <div class="photo-modal-content">
      <button class="photo-modal-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
      <img src="${photoPath}" alt="${escapeHtml(title)}" />
      <div class="photo-modal-title">${escapeHtml(title)}</div>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
  document.body.appendChild(modal);
}

// ========================================
// UTILITAIRES
// ========================================
function closeDocumentsModal() {
  document.getElementById("documentsModal").classList.remove("show");
}

// Fonction pour formater une date au format "6 juin 1944"
function formatDateDisplay(dateStr) {
  if (!dateStr || dateStr === '0000-00-00') return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '-';
  const [year, month, day] = parts;
  
  // Noms des mois en français
  const mois = [
    '', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  
  // Gérer les dates partielles (jour ou mois manquant = 00)
  if (day === '00' && month === '00') {
    return year; // Seulement l'année
  } else if (day === '00') {
    const monthInt = parseInt(month, 10);
    return `${mois[monthInt]} ${year}`; // Mois et année (ex: "juin 1944")
  }
  
  const dayInt = parseInt(day, 10);
  const monthInt = parseInt(month, 10);
  return `${dayInt} ${mois[monthInt]} ${year}`; // Date complète (ex: "6 juin 1944")
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return escapeHtml(text);
  return escapeHtml(text.substring(0, maxLength)) + "...";
}

function formatNotes(notes) {
  if (!notes) return '';
  let formatted = notes.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex,
    '<a href="$1" target="_blank" class="note-link">$1 🔗</a>'
  );
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

function showQuickViewNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${
      type === "error"
        ? "#f44336"
        : "#2196f3"
    };
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10001;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Fermer la modal en cliquant sur l'overlay
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("documentsModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        closeDocumentsModal();
      }
    });
  // Fermer la modal avec la touche Échap
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeDocumentsModal();
    }
  });
});