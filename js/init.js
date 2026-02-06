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

// Contrôles de zoom mobile
document.addEventListener("DOMContentLoaded", function() {
  var zoomInBtn = document.getElementById("zoomInBtn");
  var zoomOutBtn = document.getElementById("zoomOutBtn");
  var centerBtnMobile = document.getElementById("centerBtnMobile");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", function() {
      if (familyTreeApp.visualizer && familyTreeApp.visualizer.zoom) {
        var svg = d3.select("#tree-container svg");
        var currentTransform = d3.zoomTransform(svg.node());
        var newScale = currentTransform.k * 1.3;
        newScale = Math.min(newScale, CONFIG.view.zoomExtent[1]);
        svg.transition().duration(200).call(
          familyTreeApp.visualizer.zoom.scaleTo,
          newScale
        );
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", function() {
      if (familyTreeApp.visualizer && familyTreeApp.visualizer.zoom) {
        var svg = d3.select("#tree-container svg");
        var currentTransform = d3.zoomTransform(svg.node());
        var newScale = currentTransform.k / 1.3;
        newScale = Math.max(newScale, CONFIG.view.zoomExtent[0]);
        svg.transition().duration(200).call(
          familyTreeApp.visualizer.zoom.scaleTo,
          newScale
        );
      }
    });
  }

  if (centerBtnMobile) {
    centerBtnMobile.addEventListener("click", function() {
      familyTreeApp.centerView();
    });
  }

  // Bouton orientation mobile
  var toggleOrientationMobile = document.getElementById("toggleOrientationMobile");
  if (toggleOrientationMobile) {
    toggleOrientationMobile.addEventListener("click", function() {
      var toggleBtn = document.getElementById("toggleOrientationButton");
      if (toggleBtn) toggleBtn.click();
    });
  }

  // Bouton retour mobile
  var returnToDefaultMobile = document.getElementById("returnToDefaultMobile");
  if (returnToDefaultMobile) {
    returnToDefaultMobile.addEventListener("click", function() {
      var returnBtn = document.getElementById("returnToDefaultButton");
      if (returnBtn) returnBtn.click();
    });
  }

  // Bouton point de départ mobile
  var setDefaultMobile = document.getElementById("setDefaultMobile");
  if (setDefaultMobile) {
    setDefaultMobile.addEventListener("click", function() {
      var setDefaultBtn = document.getElementById("setDefaultButton");
      if (setDefaultBtn) setDefaultBtn.click();
    });
  }

  // Touch feedback sur les nœuds
  document.addEventListener("touchstart", function(e) {
    var node = e.target.closest(".node");
    if (node) {
      node.classList.add("touched");
    }
  }, { passive: true });

  document.addEventListener("touchend", function() {
    var touchedNodes = document.querySelectorAll(".node.touched");
    touchedNodes.forEach(function(node) {
      node.classList.remove("touched");
    });
  }, { passive: true });
});

