"use strict";

/**
 * Initialisation de l'application
 */

// Créer l'instance de l'application
const familyTreeApp = new FamilyTreeApp();

// Attendre que le menu soit chargé avant d'initialiser
document.addEventListener('menuLoaded', () => {
  const rootTabHeader = document.getElementById("rootTabHeader");
  rootTabHeader?.addEventListener("click", () => {
    if (familyTreeApp.currentPersonId) {
      familyTreeApp.openPanel(familyTreeApp.currentPersonId);
    }
  });
  [
    "rootTabSitemap", "rootTabUsers", "rootTabMap", "rootTabDocs",
    "rootTabStats", "rootTabStories", "rootTabGedcom", "rootTabDna"
  ].forEach(id =>
    document.getElementById(id)?.addEventListener("click", e => e.stopPropagation())
  );
});

// Initialiser l'app dès que le DOM est prêt
document.addEventListener("DOMContentLoaded", () => {
  familyTreeApp.init();
});

// Gestionnaire de redimensionnement de la fenêtre
window.addEventListener("resize", function() {
  if (familyTreeApp.visualizer && familyTreeApp.familyTree) {
    setTimeout(function() {
      familyTreeApp.centerView();
    }, 100);
  }
});

