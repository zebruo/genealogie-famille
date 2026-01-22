/**
 * SYSTÈME DE MODALES UNIFIÉES
 * 
 * Fonctions pour afficher des notifications et confirmations stylisées
 * Compatible avec tous les navigateurs modernes
 * 
 * Auteur: Eric Durel
 * Date: Janvier 2026
 */

/**
 * Affiche un message temporaire avec une modale
 * 
 * @param {string} message - Le message à afficher
 * @param {string} type - Type de message: 'success', 'error', 'warning', 'info'
 * 
 * @example
 * showTemporaryInfo('Enregistrement réussi !', 'success');
 * showTemporaryInfo('Une erreur est survenue', 'error');
 */
function showTemporaryInfo(message, type = 'info') {
  // Configuration par type
  const config = {
    error: {
      icon: 'exclamation-circle',
      title: 'Erreur',
      btnClass: 'modal-btn-ok'
    },
    success: {
      icon: 'check-circle',
      title: 'Succès',
      btnClass: 'modal-btn-ok'
    },
    warning: {
      icon: 'exclamation-triangle',
      title: 'Avertissement',
      btnClass: 'modal-btn-ok'
    },
    info: {
      icon: 'info-circle',
      title: 'Information',
      btnClass: 'modal-btn-ok'
    }
  };
  
  const typeConfig = config[type] || config.info;
  
  // Créer l'overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Créer la modale
  const dialog = document.createElement('div');
  dialog.className = 'modal-content';
  
  dialog.innerHTML = `
    <div class="modal-header-qv type-${type}">
      <i class="fas fa-${typeConfig.icon} stat-card-icon"></i>
      <h3>${typeConfig.title}</h3>
    </div>
    <div class="modal-body">
      ${message}
    </div>
    <div class="modal-footer">
      <button class="modal-btn ${typeConfig.btnClass}">
        <i class="fas fa-check"></i>
        OK
      </button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Fonction pour fermer la modale
  let isClosing = false;
  const closeModal = () => {
    if (isClosing) return;
    isClosing = true;
    
    overlay.style.animation = 'fadeOutOverlay 0.3s ease';
    dialog.style.animation = 'scaleOut 0.3s ease';
    
    // Retirer l'écouteur clavier immédiatement
    document.removeEventListener('keydown', keyHandler);
    
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 300);
  };
  
  // Bouton OK
  const okBtn = dialog.querySelector('.modal-btn');
  okBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });
  
  // Fermeture en cliquant sur l'overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
  
  // Support du clavier (Enter ou Escape = Fermer)
  const keyHandler = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };
  document.addEventListener('keydown', keyHandler);
}

/**
 * Affiche une confirmation stylisée standard et retourne une Promise
 * 
 * @param {string} message - Le message de confirmation
 * @param {string} personName - Nom de la personne (optionnel, sera mis en valeur)
 * @returns {Promise<boolean>} - true si confirmé, false si annulé
 * 
 * @example
 * const confirmed = await showConfirm('Voulez-vous enregistrer ces modifications ?');
 * if (confirmed) {
 *   // Action confirmée
 * }
 * 
 * @example
 * const confirmed = await showConfirm('sera modifié. Confirmer ?', 'Jean Dupont');
 * // Affichera: "Jean Dupont sera modifié. Confirmer ?"
 */
function showConfirm(message, personName = '') {
  return new Promise((resolve) => {
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Créer la modale
    const dialog = document.createElement('div');
    dialog.className = 'modal-content';
    
    dialog.innerHTML = `
      <div class="modal-header-qv type-info">
        <i class="fas fa-question-circle stat-card-icon"></i>
        <h3>Confirmation requise</h3>
      </div>
      <div class="modal-body">
        <span class="modal-person-name">${personName}</span> ${message}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">
          <i class="fas fa-times"></i>
          Annuler
        </button>
        <button class="modal-btn modal-btn-confirm">
          <i class="fas fa-check"></i>
          Confirmer
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Fonction pour fermer la modale
    let isClosing = false;
    const closeModal = (confirmed) => {
      if (isClosing) return;
      isClosing = true;
      
      overlay.style.animation = 'fadeOutOverlay 0.3s ease';
      dialog.style.animation = 'scaleOut 0.3s ease';
      
      // Retirer l'écouteur clavier immédiatement
      document.removeEventListener('keydown', keyHandler);
      
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        resolve(confirmed);
      }, 300);
    };
    
    // Boutons
    const cancelBtn = dialog.querySelector('.modal-btn-cancel');
    const confirmBtn = dialog.querySelector('.modal-btn-confirm');
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal(false);
    });
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal(true);
    });
    
    // Fermeture en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(false);
      }
    });
    
    // Support du clavier (Escape = Annuler, Enter = Confirmer)
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeModal(true);
      }
    };
    document.addEventListener('keydown', keyHandler);
  });
}

/**
 * Affiche une confirmation de suppression (style danger) et retourne une Promise
 * 
 * @param {string} message - Le message de confirmation
 * @param {string} personName - Nom de la personne (optionnel, sera mis en valeur)
 * @returns {Promise<boolean>} - true si confirmé, false si annulé
 * 
 * @example
 * const confirmed = await showConfirmDelete('Voulez-vous supprimer cet élément ?');
 * if (confirmed) {
 *   // Suppression confirmée
 * }
 * 
 * @example
 * const confirmed = await showConfirmDelete('sera supprimé définitivement. Confirmer ?', 'Jean Dupont');
 * // Affichera: "Jean Dupont sera supprimé définitivement. Confirmer ?"
 */
function showConfirmDelete(message, personName = '') {
  return new Promise((resolve) => {
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Créer la modale
    const dialog = document.createElement('div');
    dialog.className = 'modal-content';
    
    dialog.innerHTML = `
      <div class="modal-header-qv type-warning">
        <i class="fas fa-exclamation-triangle doc-icon-documents"></i>
        <h3>Confirmation de suppression</h3>
      </div>
      <div class="modal-body">
        <span class="modal-person-name">${personName}</span> ${message}
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel">
          <i class="fas fa-times"></i>
          Annuler
        </button>
        <button class="modal-btn modal-btn-danger">
          <i class="fas fa-trash"></i>
          Supprimer
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Fonction pour fermer la modale
    let isClosing = false;
    const closeModal = (confirmed) => {
      if (isClosing) return;
      isClosing = true;
      
      overlay.style.animation = 'fadeOutOverlay 0.3s ease';
      dialog.style.animation = 'scaleOut 0.3s ease';
      
      // Retirer l'écouteur clavier immédiatement
      document.removeEventListener('keydown', keyHandler);
      
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        resolve(confirmed);
      }, 300);
    };
    
    // Boutons
    const cancelBtn = dialog.querySelector('.modal-btn-cancel');
    const dangerBtn = dialog.querySelector('.modal-btn-danger');
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal(false);
    });
    dangerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal(true);
    });
    
    // Fermeture en cliquant sur l'overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(false);
      }
    });
    
    // Support du clavier (Escape = Annuler, Enter = Confirmer la suppression)
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeModal(true);
      }
    };
    document.addEventListener('keydown', keyHandler);
  });
}