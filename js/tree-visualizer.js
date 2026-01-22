"use strict";

/**
 * Classe responsable de la visualisation de l'arbre généalogique avec D3.js
 */
class TreeVisualizer {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById("tree-container");
  }

  getDimensions() {
    return {
      width: this.container.clientWidth -
        CONFIG.margins.left -
        CONFIG.margins.right,
      height: this.container.clientHeight -
        CONFIG.margins.top -
        CONFIG.margins.bottom,
    };
  }

  createSVG() {
    var dims = this.getDimensions();
    var modeConfig = this.app.isHorizontal ? CONFIG.horizontal : CONFIG.vertical;
    var svg = d3
      .select("#tree-container")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [
        0,
        0,
        dims.width + CONFIG.margins.left + CONFIG.margins.right + modeConfig.viewBoxWidthAdjustment,
        dims.height + CONFIG.margins.top + CONFIG.margins.bottom + modeConfig.viewBoxHeightAdjustment,
      ])
      .attr("preserveAspectRatio", "xMidYMid meet");
    //.style("cursor", "move");
    if (!this.app.isHorizontal) {
      svg.classed("vertical-mode", true);
    }
    return svg;
  }

  setupZoom(svg, g) {
    this.zoom = d3
      .zoom()
      .scaleExtent(CONFIG.zoomExtent)
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(this.zoom);
    return this.zoom;
  }

  calculateOptimalTransform(nodes) {
    var dims = this.getDimensions();
    var isHorizontal = this.app.isHorizontal;
    var bounds = this.getTreeBounds(nodes);
    var treeWidth = bounds.maxY - bounds.minY;
    var treeHeight = bounds.maxX - bounds.minX;
    var basePadding = isHorizontal ? 40 : 40;
    var maxTreeSize = Math.max(treeWidth, treeHeight);
    var padding =
      maxTreeSize > 1500 ?
      basePadding * 0.6 :
      maxTreeSize > 1000 ?
      basePadding * 0.8 :
      basePadding;
    var centerX = (bounds.minX + bounds.maxX) / 2;
    var centerY = (bounds.minY + bounds.maxY) / 2;
    var scale;
    if (isHorizontal) {
      var scaleX = (dims.width - padding * 2) / treeWidth;
      var scaleY = (dims.height - padding * 2) / treeHeight;
      scale = Math.min(scaleX, scaleY, 2.5);
      scale = Math.max(scale, 0.75);
    } else {
      var scaleX = (dims.width - padding * 2) / treeWidth;
      var scaleY = (dims.height - padding * 2) / treeHeight;
      var calculatedScale = Math.min(scaleX, scaleY);
      scale = Math.min(calculatedScale, 1.0);
      scale = Math.max(scale, 0.5);
    }
    var horizontalOffset = 0;
    var translateX, translateY;
    if (isHorizontal) {
      translateX =
        dims.width / 2 -
        centerY * scale +
        CONFIG.margins.left +
        horizontalOffset;
      translateY = dims.height / 2 - centerX * scale + CONFIG.margins.top;
      return d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
    } else {
      translateX =
        dims.width / 2 -
        centerX * scale +
        CONFIG.margins.left +
        horizontalOffset;
      translateY = dims.height / 2 - centerY * scale + CONFIG.margins.top;
      return d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
    }
  }

  getTreeBounds(nodes) {
    var isHorizontal = this.app.isHorizontal;
    var bounds = nodes.reduce(
      (bounds, d) => ({
        minX: Math.min(bounds.minX, d.x),
        maxX: Math.max(bounds.maxX, d.x),
        minY: Math.min(bounds.minY, d.y),
        maxY: Math.max(bounds.maxY, d.y),
      }), {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
      }
    );
    var svg = d3.select("#tree-container svg g");
    if (!svg.empty() && svg.selectAll("circle").size() > 0) {
      var circleCount = svg.selectAll("circle").size();
      if (!isHorizontal) {
        bounds = {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        };
      }
      var spouseCoords = [];
      svg.selectAll("circle").each(function() {
        var transform = this.parentNode.getAttribute("transform");
        var memberType = this.parentNode.getAttribute("data-member-type");
        var parentClasses = this.parentNode.getAttribute("class") || "";
        if (transform) {
          var match = transform.match(/translate\(([^,]+),([^)]+)\)/);
          if (match) {
            var tx = parseFloat(match[1]);
            var ty = parseFloat(match[2]);
            if (memberType === "spouse") {
              spouseCoords.push({
                x: tx,
                y: ty
              });
            }
            if (isHorizontal) {
              bounds.minY = Math.min(bounds.minY, tx);
              bounds.maxY = Math.max(bounds.maxY, tx);
              bounds.minX = Math.min(bounds.minX, ty);
              bounds.maxX = Math.max(bounds.maxX, ty);
            } else {
              var isSpouse = parentClasses.includes("spouse");
              var isChild = parentClasses.includes("child");
              var isSibling = parentClasses.includes("sibling");
              if (!isSpouse && !isChild && !isSibling) {
                bounds.minX = Math.min(bounds.minX, tx);
                bounds.maxX = Math.max(bounds.maxX, tx);
                bounds.minY = Math.min(bounds.minY, ty);
                bounds.maxY = Math.max(bounds.maxY, ty);
              } else {}
            }
          }
        }
      });
      if (spouseCoords.length > 0) {}
      if (isHorizontal) {
        svg.selectAll("text").each(function() {
          try {
            var parentGroup = this.parentNode;
            var memberType = parentGroup.getAttribute("data-member-type");
            var bbox = this.getBBox();
            var transform = parentGroup.getAttribute("transform");
            if (transform) {
              var match = transform.match(/translate\(([^,]+),([^)]+)\)/);
              if (match) {
                var tx = parseFloat(match[1]);
                var ty = parseFloat(match[2]);
                var x = parseFloat(this.getAttribute("x") || 0);
                var y = parseFloat(this.getAttribute("y") || 0);
                bounds.minY = Math.min(bounds.minY, tx + x + bbox.x);
                bounds.maxY = Math.max(
                  bounds.maxY,
                  tx + x + bbox.x + bbox.width
                );
                bounds.minX = Math.min(bounds.minX, ty + y + bbox.y);
                bounds.maxX = Math.max(
                  bounds.maxX,
                  ty + y + bbox.y + bbox.height
                );
              }
            }
          } catch (e) {}
        });
      }
    } else {
      bounds = nodes.reduce(
        (bounds, d) => ({
          minX: Math.min(bounds.minX, d.x),
          maxX: Math.max(bounds.maxX, d.x),
          minY: Math.min(bounds.minY, d.y),
          maxY: Math.max(bounds.maxY, d.y),
        }),
        bounds
      );
    }
    if (bounds.minX === Infinity || bounds.maxX === -Infinity) {
      bounds = nodes.reduce(
        (bounds, d) => ({
          minX: Math.min(bounds.minX, d.x),
          maxX: Math.max(bounds.maxX, d.x),
          minY: Math.min(bounds.minY, d.y),
          maxY: Math.max(bounds.maxY, d.y),
        }), {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
        }
      );
      if (!isHorizontal) {
        bounds.minX -= 200;
        bounds.maxX += 200;
      } else {
        bounds.minX -= 100;
        bounds.maxX += 100;
      }
    }
    var padding = 40;
    bounds.minY -= padding;
    bounds.maxY += padding;
    bounds.minX -= padding;
    bounds.maxX += padding;
    return bounds;
  }

  addHoverEffect(element, isNode) {
    if (isNode === undefined) isNode = true;
    var isVertical = !this.app.isHorizontal;
    var radiusConfig = isNode ? CONFIG.nodeRadius : CONFIG.siblingRadius;
    var defaultRadius = isVertical ?
      radiusConfig.vertical :
      radiusConfig.default;
    var hoverRadius = isVertical ?
      radiusConfig.verticalHover :
      radiusConfig.hover;
    element
      .on("mouseover", function() {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("r", hoverRadius);
      })
      .on("mouseout", function() {
        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("r", defaultRadius);
      });
  }

  drawMarriageLinks(g, nodes) {
    if (!this.app.showMarriages) return;
    var marriageLinks = g.append("g").attr("class", "marriage-links");
    var processedMarriages = new Set();
    nodes.forEach((person) => {
      if (!person.data.spouseIds || !person.data.spouseIds.length) return;
      person.data.spouseIds.forEach((spouseId) => {
        var marriageKey = [person.data.id, spouseId].sort().join("-");
        if (processedMarriages.has(marriageKey)) return;
        var spouse = nodes.find((n) => n.data.id === spouseId);
        if (!spouse || person.y !== spouse.y) return;
        processedMarriages.add(marriageKey);
        this.drawSingleMarriageLink(marriageLinks, person, spouse);
      });
    });
  }

  drawSingleMarriageLink(marriageLinks, person, spouse) {
    var isVertical = !this.app.isHorizontal;
    var modeConfig = isVertical ? CONFIG.vertical : CONFIG.horizontal;
    var hoffset = modeConfig.horizontalMarriage;
    var gap = modeConfig.marriageGap;
    var radius = isVertical ?
      CONFIG.nodeRadius.vertical :
      CONFIG.nodeRadius.default;
    if (isVertical) {
      var midX = (person.x + spouse.x) / 2;
      var startY = person.y + radius;
      var endY = spouse.y + radius;
      marriageLinks
        .append("path")
        .attr("class", "spouse-link")
        .attr(
          "d",
          "M " +
          person.x +
          "," +
          startY +
          " C " +
          person.x +
          "," +
          (person.y - hoffset) +
          " " +
          (midX - gap) +
          "," +
          (person.y - hoffset) +
          " " +
          (midX - gap) +
          "," +
          (person.y - hoffset)
        );
      marriageLinks
        .append("path")
        .attr("class", "spouse-link")
        .attr(
          "d",
          "M " +
          (midX + gap) +
          "," +
          (person.y - hoffset) +
          " C " +
          (midX + gap) +
          "," +
          (person.y - hoffset) +
          " " +
          spouse.x +
          "," +
          (person.y - hoffset) +
          " " +
          spouse.x +
          "," +
          endY
        );
      if (this.app.showMarriages) {
        var marriageData =
          this.app.familyDatabase[person.data.id] &&
          this.app.familyDatabase[person.data.id].marriages ?
          this.app.familyDatabase[person.data.id].marriages[
            spouse.data.id
          ] :
          null;
        var marriageYear =
          marriageData && marriageData.marriageYear ?
          marriageData.marriageYear :
          marriageData && marriageData.date ?
          marriageData.date :
          "?";
        marriageLinks
          .append("text")
          .attr("class", "marriage-symbol-year vertical")
          .attr("x", midX)
          .attr("y", person.y - hoffset)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text("x " + marriageYear);
      }
    } else {
      var midY = (person.x + spouse.x) / 2;
      marriageLinks
        .append("path")
        .attr("class", "spouse-link")
        .attr(
          "d",
          "M " +
          (person.y - radius) +
          "," +
          person.x +
          " C " +
          (person.y - hoffset) +
          "," +
          person.x +
          " " +
          (person.y - hoffset) +
          "," +
          (midY - gap) +
          " " +
          (person.y - hoffset) +
          "," +
          (midY - gap)
        );
      marriageLinks
        .append("path")
        .attr("class", "spouse-link")
        .attr(
          "d",
          "M " +
          (person.y - hoffset) +
          "," +
          (midY + gap) +
          " C " +
          (person.y - hoffset) +
          "," +
          (midY + gap) +
          " " +
          (person.y - hoffset) +
          "," +
          spouse.x +
          " " +
          (spouse.y - radius) +
          "," +
          spouse.x
        );
      if (this.app.showMarriages) {
        var marriageData =
          this.app.familyDatabase[person.data.id] &&
          this.app.familyDatabase[person.data.id].marriages ?
          this.app.familyDatabase[person.data.id].marriages[
            spouse.data.id
          ] :
          null;
        var marriageYear =
          marriageData && marriageData.marriageYear ?
          marriageData.marriageYear :
          marriageData && marriageData.date ?
          marriageData.date :
          "?";
        marriageLinks
          .append("text")
          .attr("class", "marriage-symbol-year horizontal")
          .attr("x", person.y - hoffset)
          .attr("y", midY)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .text("x " + marriageYear);
      }
    }
  }
}
