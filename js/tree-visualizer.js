"use strict";

/**
 * Classe responsable de la visualisation de l'arbre généalogique avec D3.js
 * Mode vertical uniquement
 */
class TreeVisualizer {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("tree-container");
  }

  getDimensions() {
    return {
      width: this.container.clientWidth - CONFIG.margins.left - CONFIG.margins.right,
      height: this.container.clientHeight - CONFIG.margins.top - CONFIG.margins.bottom,
    };
  }

  createSVG() {
    var dims = this.getDimensions();
    var svg = d3
      .select("#tree-container")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, dims.width + CONFIG.margins.left + CONFIG.margins.right, dims.height + CONFIG.margins.top + CONFIG.margins.bottom])
      .attr("preserveAspectRatio", "xMidYMid meet")
      .classed("vertical-mode", true);
    return svg;
  }

  setupZoom(svg, g) {
    this.zoom = d3
      .zoom()
      .scaleExtent(CONFIG.view.zoomExtent)
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(this.zoom);
    return this.zoom;
  }

  calculateOptimalTransform(nodes) {
    var dims = this.getDimensions();
    var bounds = this.getTreeBounds(nodes);
    var treeWidth = bounds.maxX - bounds.minX;
    var treeHeight = bounds.maxY - bounds.minY;

    var padding = 60;
    var scaleX = (dims.width - padding * 2) / treeWidth;
    var scaleY = (dims.height - padding * 2) / treeHeight;
    // Utiliser les limites de zoom de la config
    var scale = Math.min(scaleX, scaleY, CONFIG.view.zoomExtent[1]);
    scale = Math.max(scale, CONFIG.view.zoomExtent[0]);

    var centerX = (bounds.minX + bounds.maxX) / 2;
    var centerY = (bounds.minY + bounds.maxY) / 2;

    var translateX = dims.width / 2 - centerX * scale + CONFIG.margins.left;
    var translateY = dims.height / 2 - centerY * scale + CONFIG.margins.top;

    // Stocker le transform optimal pour le réutiliser
    this.lastOptimalTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    return this.lastOptimalTransform;
  }

  getTreeBounds(nodes) {
    var bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    // Calcul des bornes basé sur les nœuds
    nodes.forEach(function(d) {
      bounds.minX = Math.min(bounds.minX, d.x);
      bounds.maxX = Math.max(bounds.maxX, d.x);
      bounds.minY = Math.min(bounds.minY, d.y);
      bounds.maxY = Math.max(bounds.maxY, d.y);
    });

    // Étendre les bornes avec les dimensions des rectangles
    var nodeW = CONFIG.node.width / 2;
    var nodeH = CONFIG.node.height / 2;
    bounds.minX -= nodeW + 50;
    bounds.maxX += nodeW + 50;
    bounds.minY -= nodeH + 50;
    bounds.maxY += nodeH + 50;

    // Prendre en compte les fratries à gauche
    bounds.minX -= CONFIG.sibling.spacing * 2;

    // Prendre en compte les conjoints à droite et enfants en bas
    bounds.maxX += CONFIG.spouse.spacing * 2;
    bounds.maxY += CONFIG.children.descent + nodeH;

    return bounds;
  }

  drawMarriageLinks(g, nodes) {
    // Non utilisé dans la nouvelle structure - les liens de mariage sont dessinés dans drawRootFamily
  }
}
