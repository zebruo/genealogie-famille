/**
 * Menu Navigation Loader - Universal
 * Charge le menu de navigation depuis un fichier externe spécifié
 * et initialise les scripts qui en dépendent
 * 
 * Usage:
 * - Par défaut: charge 'menu-navigation.html'
 * - Avec attribut: <script src="js/menu-loader.js" data-menu="menu-navigation-users.html"></script>
 */

(function() {
  'use strict';

  /**
   * Détermine quel fichier de menu charger
   */
  function getMenuFile() {
    // Chercher le script actuel pour voir s'il a un attribut data-menu
    const currentScript = document.currentScript || 
                          document.querySelector('script[src*="menu-loader.js"]');
    
    if (currentScript && currentScript.dataset.menu) {
      return currentScript.dataset.menu;
    }
    
    // Par défaut, charger menu-navigation.html
    return 'menu-navigation.html';
  }

  /**
   * Charge le contenu du menu depuis un fichier externe
   */
  function loadMenu() {
    const menuFile = getMenuFile();
    
    fetch(menuFile)
      .then(response => {
        if (!response.ok) {
          throw new Error('Erreur lors du chargement du menu: ' + response.status);
        }
        return response.text();
      })
      .then(html => {
        // Créer un conteneur temporaire pour le menu
        const menuContainer = document.createElement('div');
        menuContainer.id = 'menu-container';
        menuContainer.innerHTML = html;
        
        // Insérer le menu au début du body
        document.body.insertBefore(menuContainer, document.body.firstChild);
        
        // Attendre que le DOM soit complètement mis à jour
        requestAnimationFrame(() => {
          // Déclencher un événement personnalisé pour signaler que le menu est chargé
          const menuLoadedEvent = new CustomEvent('menuLoaded', {
            detail: { 
              timestamp: Date.now(),
              menuFile: menuFile
            }
          });
          document.dispatchEvent(menuLoadedEvent);
          
          // Initialiser le dark mode maintenant que le menu est présent
          if (typeof loadDarkModeScript === 'function') {
            loadDarkModeScript();
          }
          
          // Initialiser le burger menu
          if (typeof initBurgerMenu === 'function') {
            initBurgerMenu();
          }
        });
      })
      .catch(error => {
        console.error('Erreur lors du chargement du menu:', error);
        // Afficher un message d'erreur à l'utilisateur
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:red;color:white;padding:10px;border-radius:5px;z-index:10000;';
        errorDiv.textContent = 'Erreur de chargement du menu';
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
      });
  }

  // Charger le menu dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMenu);
  } else {
    // Le DOM est déjà chargé
    loadMenu();
  }
})();