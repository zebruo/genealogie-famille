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
    var svg = d3.select("#tree-container svg");
    var dims = familyTreeApp.visualizer.getDimensions();
    var modeConfig = familyTreeApp.isHorizontal ? CONFIG.horizontal : CONFIG.vertical;
    svg.attr("viewBox", [
      0,
      0,
      dims.width + CONFIG.margins.left + CONFIG.margins.right + modeConfig.viewBoxWidthAdjustment,
      dims.height + CONFIG.margins.top + CONFIG.margins.bottom + modeConfig.viewBoxHeightAdjustment,
    ]);
    setTimeout(function() {
      familyTreeApp.centerView();
    }, 100);
  }
});
