// Gestion du menu burger (mobile uniquement)

// Variable pour éviter la double initialisation
let burgerMenuInitialized = false;

// Cette fonction sera appelée après le chargement du menu
function initBurgerMenu() {
  // Éviter la double initialisation
  if (burgerMenuInitialized) {
    return;
  }
  
  const burgerMenu = document.getElementById('burgerMenu');
  const burgerNav = document.getElementById('burgerNav');
  const burgerClose = document.getElementById('burgerClose');
  const burgerOverlay = document.getElementById('burgerOverlay');

  if (!burgerMenu || !burgerNav || !burgerClose || !burgerOverlay) {
    console.error('Menu burger : Éléments manquants, impossible d\'initialiser');
    return;
  }

  function openBurgerMenu() {
    burgerNav.classList.add('active');
    burgerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeBurgerMenu() {
    burgerNav.classList.remove('active');
    burgerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Ajouter les event listeners
  burgerMenu.addEventListener('click', openBurgerMenu, true);
  burgerClose.addEventListener('click', closeBurgerMenu);
  burgerOverlay.addEventListener('click', closeBurgerMenu);

  // Fermer le menu lors du clic sur un lien
  document.querySelectorAll('.burger-nav-item').forEach(item => {
    item.addEventListener('click', closeBurgerMenu);
  });

  // Gérer l'ouverture du person-panel depuis le burger menu
  const burgerOpenPanel = document.getElementById('burgerOpenPanel');
  if (burgerOpenPanel) {
    burgerOpenPanel.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      closeBurgerMenu();
      
      setTimeout(() => {
        const personPanel = document.getElementById('person-panel');
        if (personPanel && personPanel.classList.contains('is-open')) {
          if (typeof familyTreeApp !== 'undefined') {
            familyTreeApp.closePanel();
          }
        } else if (typeof familyTreeApp !== 'undefined' && familyTreeApp.currentPersonId) {
          familyTreeApp.openPanel(familyTreeApp.currentPersonId);
        } else {
          if (personPanel) {
            personPanel.classList.add('is-open');
            const arrow = document.getElementById('rootTabArrow');
            if (arrow) {
              arrow.classList.add('rotated');
            }
          }
        }
      }, 300);
    });
  }

  // Gérer le dark mode pour le menu burger
  const burgerDarkMode = document.getElementById('burgerDarkMode');
  if (burgerDarkMode) {
    burgerDarkMode.addEventListener('click', function(e) {
      e.preventDefault();
      const darkModeToggle = document.getElementById('dark-mode-toggle');
      if (darkModeToggle) {
        darkModeToggle.click();
      }
    });
  }

  // Fermer le menu avec la touche Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && burgerNav.classList.contains('active')) {
      closeBurgerMenu();
    }
  });

  burgerMenuInitialized = true;
}

// Initialisation au chargement
if (document.getElementById('burgerMenu')) {
  // Le menu est déjà présent, initialiser immédiatement
  initBurgerMenu();
} else {
  // Attendre que le menu soit chargé
  document.addEventListener('menuLoaded', initBurgerMenu);
}