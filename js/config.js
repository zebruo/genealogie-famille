"use strict";

/**
 * Configuration globale de l'application d'arbre généalogique
 * Structure basée sur test.html - Mode vertical uniquement
 */
const CONFIG = {
  // Dimensions des nœuds (rectangles)
  node: {
    width: 80,
    height: 105,
  },

  // Espacements de l'arbre
  tree: {
    verticalSpacing: 220,      // Distance entre générations (ascendance)
    horizontalSpacing: 70,     // Distance entre nœuds même génération
    bendHeight: 25,            // Hauteur des coudes des liens
  },

  // Fratries
  sibling: {
    width: 70,                 // Largeur zone fratrie
    spacing: 100,              // Distance entre fratries
  },

  // Conjoints
  spouse: {
    spacing: 160,              // Distance horizontale entre conjoints
  },

  // Enfants
  children: {
    descent: 150,              // Distance verticale vers les enfants (Y positif)
    spacing: 30,               // Distance entre enfants
  },

  // Zoom et vue
  view: {
    zoomExtent: [0.5, 3],  // [min, max] - le max est aussi l'échelle initiale
  },

  // Marges (non utilisées avec le zoom - garder à 0)
  margins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  // Symboles
  symbols: {
    birth: "\u00B0",
    death: "\u271F",
  },

  // Durée des transitions
  transitionDuration: 600,
};
