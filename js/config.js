"use strict";

/**
 * Configuration globale de l'application d'arbre généalogique
 * Structure basée sur test.html - Mode vertical uniquement
 */
const CONFIG = {
  // Dimensions des nœuds (rectangles)
  node: {
    width: 65,
    height: 85,
  },

  // Espacements de l'arbre
  tree: {
    verticalSpacing: 180,      // Distance entre générations (ascendance)
    horizontalSpacing: 60,     // Distance entre nœuds même génération
    bendHeight: 15,            // Hauteur des coudes des liens
  },

  // Fratries
  sibling: {
    width: 70,                 // Largeur zone fratrie
    spacing: 125,              // Distance entre fratries
  },

  // Conjoints
  spouse: {
    spacing: 180,              // Distance horizontale entre conjoints
  },

  // Enfants
  children: {
    descent: 180,              // Distance verticale vers les enfants (Y positif)
    spacing: 85,               // Distance entre enfants
  },

  // Zoom et vue
  view: {
    initialScale: 0.95,
    zoomExtent: [0.3, 3],
  },

  // Marges
  margins: {
    top: 50,
    right: 0,
    bottom: 50,
    left: 60,
  },

  // Symboles
  symbols: {
    birth: "\u00B0",
    death: "\u271F",
  },

  // Durée des transitions
  transitionDuration: 600,
};
