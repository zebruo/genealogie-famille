"use strict";

/**
 * Configuration globale de l'application d'arbre généalogique
 */
const CONFIG = {
  margins: {
    top: 50,
    right: 0,
    bottom: 50,
    left: 60
  },
  nodeRadius: {
    default: 10,
    hover: 12,
    vertical: 13,
    verticalHover: 15
  },
  siblingRadius: {
    default: 7,
    hover: 9,
    vertical: 10,
    verticalHover: 12
  },
  transitionDuration: 600,
  zoomExtent: [0.4, 3],
  spacing: {
    textOffset: 13,
    verticalTextOffset: 20,
    siblingVertical: 30,
  },
  horizontal: {
    treeSizeMultiplier: 0.95,
    heightMultiplier: 1.5,
    separationSameParent: 1.6,
    separationDifferentParent: 2.0,
    familySpacing: 63,
    horizontalOffset: 125,
    childSpacingMultiplier: 0.85,
    horizontalMarriage: 30,
    marriageGap: 10,
    viewBoxWidthAdjustment: 0,   // Ajustement de la largeur de la viewBox
    viewBoxHeightAdjustment: -10,  // Ajustement de la hauteur de la viewBox
  },
  vertical: {
    treeSizeMultiplier: 1.9,
    widthMultiplier: 2,
    separationSameParent: 4.0,
    separationDifferentParent: 5.5,
    familySpacing: -130,
    horizontalOffset: 180,
    childSpacingMultiplier: 1.5,
    fixedScale: 0.8,
    rootSiblingOffset: 150,
    siblingSpacing: 135,
    horizontalMarriage: -30,
    marriageGap: 30,
    viewBoxWidthAdjustment: 0,   // Pas d'ajustement en mode vertical
    viewBoxHeightAdjustment: 0,  // Pas d'ajustement en mode vertical
  },
  symbols: {
    birth: "\u00B0",
    death: "\u271F",
  },
};
