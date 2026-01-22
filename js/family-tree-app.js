"use strict";

/**
 * Application principale de l'arbre généalogique
 */
class FamilyTreeApp {
  constructor() {
    this.familyDatabase = {};
    this.familyTree = null;
    this.zoom = null;
    this.showSiblings = false;
    this.showMarriages = false;
    this.isHorizontal = false; // Orientation de l'arbre par défaut
    this.maxGenerations = 6;
    this.currentPersonId = null;
    this.searchDebounceTimer = null;
  }
  init() {
    var loader = document.getElementById("loader");
    loader.style.display = "flex";
    var self = this;
    this.initializeOrientation(); // Initialise l'orientation de l'arbre
    // Ajouter un gestionnaire de clic pour fermer le panneau
    document.addEventListener("click", function(e) {
      var personPanel = document.getElementById("person-panel");
      var rootTab = document.querySelector(".root-tab");
      if (personPanel.classList.contains("is-open")) {
        if (!personPanel.contains(e.target) &&
          !rootTab.contains(e.target) &&
          !e.target.closest(".node")) {
          self.closePanel();
        }
      }
    });
    fetch("admin/api3.php?action=getFamilyData")
      .then(function(response) {
        if (!response.ok)
          throw new Error("Erreur HTTP: " + response.status);
        return response.json();
      })
      .then(function(data) {
        self.familyDatabase = data;
        self.ui = new UIManager(self);
        self.visualizer = new TreeVisualizer(self);
        var startingId = self.getStartingId();
        if (startingId) {
          self.rebuildTree(parseInt(startingId));
        } else {
          throw new Error("Aucun individu trouvé");
        }
      })
      .catch(function(error) {
        console.error("Erreur lors du chargement:", error);
        document.getElementById("tree-container").innerHTML =
          '<div style="padding: 40px; text-align: center; color: var(--text-secondary);"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i><p style="font-size: 1.1rem;">Erreur lors du chargement des données</p><p style="margin-top: 10px; font-size: 0.9rem;">' +
          error.message +
          "</p></div>";
      })
      .finally(function() {
        loader.style.display = "none";
      });
  }
  getStartingId() {
    var urlParams = new URLSearchParams(window.location.search);
    var urlPersonId = urlParams.get("person");
    var defaultPersonId = localStorage.getItem("defaultPersonId");
    if (urlPersonId && this.familyDatabase[urlPersonId]) {
      return urlPersonId;
    } else if (defaultPersonId && this.familyDatabase[defaultPersonId]) {
      return defaultPersonId;
    }
    var firstPerson = Object.values(this.familyDatabase)[0];
    return firstPerson ? firstPerson.id : null;
  }
  buildAncestralTree(personId, processedIds, currentDepth) {
    if (!processedIds) processedIds = new Set();
    if (currentDepth === undefined) currentDepth = 0;
    var currentId = String(personId);
    if (
      processedIds.has(currentId) ||
      currentDepth >= this.maxGenerations
    )
      return null;
    var personData = this.familyDatabase[currentId];
    if (!personData) return null;
    processedIds.add(currentId);
    var person = new FamilyMember(personData);
    person.depth = currentDepth;
    if (personData.parentIds && currentDepth < this.maxGenerations) {
      // Trier les parents pour avoir toujours le père en premier (gauche/haut) et la mère en second (droite/bas)
      var sortedParentIds = personData.parentIds.slice().sort((aId, bId) => {
        var parentA = this.familyDatabase[aId];
        var parentB = this.familyDatabase[bId];
        if (!parentA || !parentB) return 0;
        // Père (M) vient avant Mère (F)
        if (parentA.sex === 'M' && parentB.sex === 'F') return -1;
        if (parentA.sex === 'F' && parentB.sex === 'M') return 1;
        return 0;
      });
      person.parents = sortedParentIds
        .map((parentId) =>
          this.buildAncestralTree(
            parentId,
            processedIds,
            currentDepth + 1
          )
        )
        .filter(Boolean);
    }
    if (
      this.showSiblings &&
      personData.siblingIds &&
      personData.siblingIds.length &&
      (currentDepth === 0 || currentDepth === 1)
    ) {
      person.siblings = this.buildSiblings(
        personData,
        currentDepth,
        processedIds
      );
    }
    return person;
  }
  buildSiblings(personData, currentDepth, processedIds) {
    return personData.siblingIds
      .map((siblingId) => {
        var sibling = this.familyDatabase[siblingId];
        if (!sibling || processedIds.has(String(siblingId))) return null;
        var siblingCopy = {};
        for (var key in sibling) {
          if (sibling.hasOwnProperty(key))
            siblingCopy[key] = sibling[key];
        }
        siblingCopy.parents = [];
        siblingCopy.siblings = [];
        var siblingMember = new FamilyMember(siblingCopy);
        siblingMember.depth = currentDepth;
        return siblingMember;
      })
      .filter(Boolean);
  }
  rebuildTree(personId) {
    this.currentPersonId = personId;
    this.familyTree = this.buildAncestralTree(personId);
    this.updateTreeVisualization();
    this.updateDefaultButtonState();
    var newUrl = new URL(window.location);
    newUrl.searchParams.set("person", personId);
    window.history.pushState({}, "", newUrl);
    var person = this.familyDatabase[personId];
    if (person) {
      var rootTabName = document.getElementById("rootTabName");
      if (rootTabName) {
        rootTabName.textContent = person.firstNames + " " + person.lastName;
      }
      // Mise à jour du titre de la page
      document.title = person.firstNames + " " + person.lastName + " - Arbre Généalogique";
      // Mise à jour du nom de la personne dans le titre des contrôles
      this.updateCurrentPersonName(personId);
    }
  }
  updateDefaultButtonState() {
    var defaultButton = document.getElementById("setDefaultButton");
    var returnButton = document.getElementById("returnToDefaultButton");
    var storedDefaultId = localStorage.getItem("defaultPersonId");
    var currentPerson = this.familyDatabase[this.currentPersonId];
    if (storedDefaultId) {
      var defaultPerson = this.familyDatabase[storedDefaultId];
      var referenceFullName = defaultPerson ? (defaultPerson.firstName + " " + defaultPerson.lastName) : "";
      var refInfo = "<span class='tooltip-wrapper'>" + "<span style='color: #94a3b8; font-size: 0.8em;'>" +
        referenceFullName +
        "<span class='tooltip'>Retour point de départ</span>" +
        "</span></span>";
      returnButton.innerHTML = '<i class="fa-solid fa-bullseye"></i>' + refInfo;
      returnButton.style.display = "inline-flex";
    } else {
      returnButton.style.display = "none";
    }
    if (storedDefaultId && this.currentPersonId) {
      if (storedDefaultId === this.currentPersonId.toString()) {
        defaultButton.innerHTML =
          '<i class="fas fa-check-circle"></i> ' +
          currentPerson.firstName +
          " " +
          currentPerson.lastName;
        defaultButton.classList.add("active");
      } else {
        defaultButton.innerHTML =
          "<span class='tooltip-wrapper'>" +
          "<span style='color: #94a3b8; font-size: 0.8em;'>" +
          "<i class='fas fa-flag'></i>" + " " + currentPerson.firstName + " " + currentPerson.lastName +
          "<span class='tooltip'>Définir comme nouveau point de départ</span>" +
          "</span>" +
          "</span>";
        defaultButton.classList.remove("active");
      }
    }
  }
  updateCurrentPersonName(personId) {
    var person = this.familyDatabase[personId];
    var nameSpan = document.getElementById('current-person-name');
    if (person && nameSpan) {
      nameSpan.textContent = '(' + person.firstNames + ' ' + person.lastName + ')';
    }
  }
  selectPerson(personId) {
    document.getElementById("searchResults").style.display = "none";
    document.getElementById("searchInput").value = "";
    document.querySelector(".search-bar").classList.remove("has-text");
    this.rebuildTree(personId);
    // CORRECTION : Toujours utiliser familyDatabase pour avoir TOUTES les données
    var person = this.familyDatabase[personId];
    if (person) {
      var rootTabName = document.getElementById("rootTabName");
      if (rootTabName) {
        rootTabName.textContent = person.firstNames + " " + person.lastName;
      }
      var personPanel = document.getElementById("person-panel");
      if (personPanel && personPanel.classList.contains("is-open")) {
        this.displayPersonInfo(person);
      }
    }
  }
  toggleSiblings() {
    this.showSiblings = document.getElementById("toggleSiblings").checked;
    if (this.currentPersonId) this.rebuildTree(this.currentPersonId);
  }
  toggleMarriageDates() {
    this.showMarriages = document.getElementById(
      "toggleMarriageDates"
    ).checked;
    if (this.currentPersonId) this.rebuildTree(this.currentPersonId);
  }
  toggleOrientation() {
    this.isHorizontal = !this.isHorizontal;
    var button = document.getElementById("toggleOrientationButton");
    button.innerHTML = this.isHorizontal ?
      '<i class="fas fa-sitemap fa-rotate-270"></i>Paysage' : // ← Inversé
      '<i class="fas fa-sitemap fa-rotate-180"></i>Portrait'; // ← Inversé
    var generationSelect = document.getElementById("generationSelect");
    if (!this.isHorizontal) {
      if (this.maxGenerations > 5) {
        this.maxGenerations = 5;
        generationSelect.value = "5";
      }
      Array.from(generationSelect.options).forEach(option => {
        if (parseInt(option.value) > 5) {
          option.disabled = true;
        }
      });
    } else {
      // Mode horizontal: réactiver toutes les options
      this.maxGenerations = 6;
      generationSelect.value = "6";
      Array.from(generationSelect.options).forEach(option => {
        option.disabled = false;
      });
    }
    if (this.currentPersonId) this.rebuildTree(this.currentPersonId);
  }
  initializeOrientation() {
  var button = document.getElementById("toggleOrientationButton");
  var generationSelect = document.getElementById("generationSelect");
  
  if (this.isHorizontal) {
    // Mode horizontal par défaut
    button.innerHTML = '<i class="fas fa-sitemap fa-rotate-270"></i>Paysage';
  } else {
    // Mode vertical par défaut
    button.innerHTML = '<i class="fas fa-sitemap fa-rotate-180"></i>Portrait';
    
    // Limiter à 5 générations en mode vertical
    if (this.maxGenerations > 5) {
this.maxGenerations = 5;
generationSelect.value = "5";
    }
    Array.from(generationSelect.options).forEach(option => {
if (parseInt(option.value) > 5) {
  option.disabled = true;
}
    });
  }
}
  centerView() {
    if (this.visualizer.zoom && this.familyTree) {
      var rootNode = d3.hierarchy(this.familyTree, (d) => d.parents);
      var dims = this.visualizer.getDimensions();
      var modeConfig = this.isHorizontal ?
        CONFIG.horizontal :
        CONFIG.vertical;
      var self = this;
      var treeData = d3
        .tree()
        .size(
          this.isHorizontal ? [dims.height, dims.width * modeConfig.treeSizeMultiplier] : [
            dims.width * (modeConfig.widthMultiplier || 1),
            dims.height * modeConfig.treeSizeMultiplier,
          ]
        )
        .separation(function(a, b) {
          var aSize =
            1 +
            (self.showSiblings && a.data.siblings ?
              a.data.siblings.length :
              0);
          var bSize =
            1 +
            (self.showSiblings && b.data.siblings ?
              b.data.siblings.length :
              0);
          return a.parent === b.parent ?
            Math.max(
              modeConfig.separationSameParent,
              (aSize + bSize) / 1.2
            ) :
            Math.max(
              modeConfig.separationDifferentParent,
              (aSize + bSize) / 1.2
            );
        })(rootNode);
      if (!this.isHorizontal) {
        var nodes = treeData.descendants();
        var maxY = Math.max.apply(
          null,
          nodes.map(function(n) {
            return n.y;
          })
        );
        nodes.forEach(function(node) {
          node.y = maxY - node.y;
        });
      }
      var transform = this.visualizer.calculateOptimalTransform(
        treeData.descendants()
      );
      d3.select("#tree-container svg")
        .transition()
        .duration(CONFIG.transitionDuration)
        .call(this.visualizer.zoom.transform, transform);
    }
  }
  async setDefaultPerson() {
    if (this.currentPersonId) {
      const person = this.familyDatabase[this.currentPersonId];
      const personName = person.firstNames + " " + person.lastName;
      const message = "défini(e) comme point de départ par défaut. Voulez-vous confirmer ?";
      
      const confirmed = await showConfirm(message, personName);
      
      if (confirmed) {
        localStorage.setItem("defaultPersonId", this.currentPersonId);
        showTemporaryInfo("Personne par défaut enregistrée !", "success");
      }
      
      this.updateDefaultButtonState();
      var personPanel = document.getElementById("person-panel");
      if (personPanel && personPanel.classList.contains("is-open")) {
        var panelHeader = document.querySelector(".panel-header h3");
        if (panelHeader) {
          var displayedPersonId = null;
          for (var id in this.familyDatabase) {
            var p = this.familyDatabase[id];
            if ((p.firstName + " " + p.lastName) === panelHeader.textContent) {
              displayedPersonId = id;
              break;
            }
          }
          if (displayedPersonId) {
            // CORRECTION : Toujours utiliser familyDatabase pour avoir TOUTES les données
            var displayedPerson = this.familyDatabase[displayedPersonId];
            if (displayedPerson) {
              this.displayPersonInfo(displayedPerson);
            }
          }
        }
      }
    }
  }
  returnToDefault() {
    var defaultPersonId = localStorage.getItem("defaultPersonId");
    if (defaultPersonId && this.familyDatabase[defaultPersonId]) {
      this.rebuildTree(parseInt(defaultPersonId));
      var person = this.findPersonInTree(this.familyTree, parseInt(defaultPersonId));
      if (!person) {
        person = this.familyDatabase[parseInt(defaultPersonId)];
      }
      if (person) {
        var rootTabName = document.getElementById("rootTabName");
        if (rootTabName) {
          rootTabName.textContent = person.firstNames + " " + person.lastName;
        }
        var personPanel = document.getElementById("person-panel");
        if (personPanel && personPanel.classList.contains("is-open")) {
          this.displayPersonInfo(person);
        }
      }
    } else {
      alert("Aucun point de départ n'a été défini");
    }
  }
  openPanel(personId) {
    // CORRECTION : Toujours utiliser familyDatabase pour avoir TOUTES les données
    var person = this.familyDatabase[personId];
    if (person) {
      this.displayPersonInfo(person);
      document.getElementById("person-panel").classList.add("is-open");
      var arrow = document.getElementById("rootTabArrow");
      if (arrow) {
        arrow.classList.add("rotated");
      }
      var rootTabName = document.getElementById("rootTabName");
      if (rootTabName) {
        rootTabName.textContent = person.firstNames + " " + person.lastName;
      }
    }
  }
  findPersonInTree(node, personId) {
    if (!node) return null;
    if (node.id == personId) return node;
    if (node.parents && node.parents.length > 0) {
      for (var i = 0; i < node.parents.length; i++) {
        var found = this.findPersonInTree(node.parents[i], personId);
        if (found) return found;
      }
    }
    if (node.siblings && node.siblings.length > 0) {
      for (var i = 0; i < node.siblings.length; i++) {
        if (node.siblings[i].id == personId) return node.siblings[i];
      }
    }
    return null;
  }
  closePanel() {
    document.getElementById("person-panel").classList.remove("is-open");
    var arrow = document.getElementById("rootTabArrow");
    if (arrow) {
      arrow.classList.remove("rotated");
    }
    if (this.currentPersonId && this.familyDatabase) {
      var person = this.familyDatabase[this.currentPersonId];
      if (person) {
        var rootTabName = document.getElementById("rootTabName");
        if (rootTabName) {
          rootTabName.textContent = person.firstNames + " " + person.lastName;
        }
      }
    }
  }
  displayPersonInfo(person) {
    var panelContent = document.getElementById("panel-content");
    var panelHeader = document.querySelector(".person-panel .panel-header.fixed-header");
    var defaultPersonId = localStorage.getItem("defaultPersonId");
    var referencePersonId = defaultPersonId ? parseInt(defaultPersonId) : this.currentPersonId;
    var referencePerson = this.familyDatabase[referencePersonId];
    if (person.id == referencePersonId) {
      referencePersonId = this.currentPersonId;
      referencePerson = this.familyDatabase[referencePersonId];
    }
    var depth = 0;
    var relationType = "root";
    if (person.id == referencePersonId) {
      depth = 0;
      relationType = "root";
    } else {
      var refPerson = this.familyDatabase[referencePersonId];
      if (refPerson && refPerson.spouseIds && refPerson.spouseIds.includes(parseInt(person.id))) {
        relationType = "spouse";
      } else if (refPerson && refPerson.siblingIds && refPerson.siblingIds.includes(parseInt(person.id))) {
        relationType = "sibling";
      } else {
        var isUncleAunt = false;
        if (refPerson && refPerson.parentIds) {
          for (var i = 0; i < refPerson.parentIds.length; i++) {
            var parent = this.familyDatabase[refPerson.parentIds[i]];
            if (parent && parent.siblingIds) {
              if (parent.siblingIds.includes(parseInt(person.id))) {
                relationType = "uncle-aunt";
                isUncleAunt = true;
                break;
              }
            }
          }
        }
        if (!isUncleAunt && person && person.parentIds) {
          for (var i = 0; i < person.parentIds.length; i++) {
            var personParent = this.familyDatabase[person.parentIds[i]];
            if (personParent && refPerson && refPerson.siblingIds) {
              if (refPerson.siblingIds.includes(parseInt(personParent.id))) {
                relationType = "nephew-niece";
                isUncleAunt = true;
                break;
              }
            }
          }
        }
        if (!isUncleAunt) {
          var isCousin = false;
          if (person && person.parentIds) {
            for (var i = 0; i < person.parentIds.length; i++) {
              var personParent = this.familyDatabase[person.parentIds[i]];
              if (personParent && refPerson && refPerson.parentIds) {
                for (var j = 0; j < refPerson.parentIds.length; j++) {
                  var refParent = this.familyDatabase[refPerson.parentIds[j]];
                  if (refParent && refParent.siblingIds &&
                    refParent.siblingIds.includes(parseInt(personParent.id))) {
                    relationType = "cousin";
                    isCousin = true;
                    break;
                  }
                  if (personParent && personParent.siblingIds &&
                    personParent.siblingIds.includes(parseInt(refParent.id))) {
                    relationType = "cousin";
                    isCousin = true;
                    break;
                  }
                }
              }
              if (isCousin) break;
            }
          }
          if (!isCousin) {
            var tempTree = this.buildAncestralTree(referencePersonId, new Set(), 0);
            var personInTempTree = this.findPersonInTree(tempTree, person.id);
            if (personInTempTree) {
              depth = personInTempTree.depth;
              relationType = "ascendant";
              if (tempTree.siblings && tempTree.siblings.some(s => s.id == person.id)) {
                relationType = "sibling";
              }
            } else {
              var reverseTree = this.buildAncestralTree(person.id, new Set(), 0);
              var refInReverseTree = this.findPersonInTree(reverseTree, referencePersonId);
              if (refInReverseTree) {
                depth = -refInReverseTree.depth;
                relationType = "descendant";
              } else {
                relationType = "none";
              }
            }
          }
        }
      }
    }
    var getRelationship = function(depth, sex, isAscendant) {
      if (depth === 0) return null;
      var male = {
        1: isAscendant ? "père" : "fils",
        2: isAscendant ? "grand-père (aïeul)" : "petit-fils",
        3: isAscendant ? "arrière-grand-père (bisaïeul)" : "arrière-petit-fils",
        4: isAscendant ? "arrière-arrière-grand-père (trisaïeul)" : "arrière-arrière-petit-fils",
        5: isAscendant ? "arrière-arrière-arrière-grand-père" : "arrière-arrière-arrière-petit-fils",
        6: isAscendant ? "arrière-arrière-arrière-arrière-grand-père" : "arrière-arrière-arrière-arrière-petit-fils"
      };
      var female = {
        1: isAscendant ? "mère" : "fille",
        2: isAscendant ? "grand-mère (aïeule)" : "petite-fille",
        3: isAscendant ? "arrière-grand-mère (bisaïeule)" : "arrière-petite-fille",
        4: isAscendant ? "arrière-arrière-grand-mère (trisaïeule)" : "arrière-arrière-petite-fille",
        5: isAscendant ? "arrière-arrière-arrière-grand-mère" : "arrière-arrière-arrière-petite-fille",
        6: isAscendant ? "arrière-arrière-arrière-arrière-grand-mère" : "arrière-arrière-arrière-arrière-petite-fille"
      };
      var neutral = {
        1: isAscendant ? "parent" : "enfant",
        2: isAscendant ? "grand-parent" : "petit-enfant",
        3: isAscendant ? "arrière-grand-parent" : "arrière-petit-enfant",
        4: isAscendant ? "arrière-arrière-grand-parent" : "arrière-arrière-petit-enfant",
        5: isAscendant ? "arrière-arrière-arrière-grand-parent" : "arrière-arrière-arrière-petit-enfant",
        6: isAscendant ? "arrière-arrière-arrière-arrière-grand-parent" : "arrière-arrière-arrière-arrière-petit-enfant"
      };
      if (sex === "M") {
        return male[depth] || (isAscendant ? "ancêtre (génération " + depth + ")" : "descendant (génération -" + depth + ")");
      } else if (sex === "F") {
        return female[depth] || (isAscendant ? "ancêtre (génération " + depth + ")" : "descendante (génération -" + depth + ")");
      } else {
        return neutral[depth] || (isAscendant ? "ancêtre (génération " + depth + ")" : "descendant (génération -" + depth + ")");
      }
    };
    var formatRelationship = function(currentPerson, referencePerson, depth, relationType) {
      var getArticleWithRelation = function(sex, relation) {
        if (relation.startsWith("arrière") || /^[aeiouy]/i.test(relation)) {
          return "l'";
        }
        return sex === "F" ? "la " : "le ";
      };
      var getPreposition = function(name) {
        var firstChar = name.charAt(0).toLowerCase();
        var voyelles = ['a', 'e', 'i', 'o', 'u', 'y', 'h', 'é', 'è', 'ê', 'ë', 'à', 'â'];
        return voyelles.includes(firstChar) ? "d'" : "de ";
      };
      var currentFullName = currentPerson.firstNames + " " + currentPerson.lastName; //degré de parenté
      var referenceFullName = referencePerson.firstNames + " " + referencePerson.lastName; //degré de parenté
      var refInfo = " <span style='color: #6c757d; font-size: 0.9em;'>(point de départ: " + referenceFullName + ")</span>";
      var html = '<div style="line-height: 1.6;">';
      if (relationType === "root") {
        return "Personne de départ (racine)";
      }
      if (relationType === "spouse") {
        var spouseLabel = currentPerson.sex === "M" ? "conjoint" :
          currentPerson.sex === "F" ? "conjointe" : "conjoint(e)";
        var refSpouseLabel = referencePerson.sex === "M" ? "conjoint" :
          referencePerson.sex === "F" ? "conjointe" : "conjoint(e)";
        html += currentFullName + ' est <strong>' + getArticleWithRelation(currentPerson.sex, spouseLabel) + spouseLabel + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.<br>';
        html += referenceFullName + ' est <strong>' + getArticleWithRelation(referencePerson.sex, refSpouseLabel) + refSpouseLabel + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.';
        html += '</div>';
        return html;
      }
      if (relationType === "sibling") {
        var siblingLabel = currentPerson.sex === "M" ? "frère" :
          currentPerson.sex === "F" ? "sœur" : "frère/sœur";
        var refSiblingLabel = referencePerson.sex === "M" ? "frère" :
          referencePerson.sex === "F" ? "sœur" : "frère/sœur";
        html += currentFullName + ' est <strong>' + getArticleWithRelation(currentPerson.sex, siblingLabel) + siblingLabel + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.<br>';
        html += referenceFullName + ' est <strong>' + getArticleWithRelation(referencePerson.sex, refSiblingLabel) + refSiblingLabel + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.';
        html += '</div>';
        return html;
      }
      if (relationType === "uncle-aunt") {
        var uncleLabel = currentPerson.sex === "M" ? "oncle" :
          currentPerson.sex === "F" ? "tante" : "oncle/tante";
        var nephewLabel = referencePerson.sex === "M" ? "neveu" :
          referencePerson.sex === "F" ? "nièce" : "neveu/nièce";
        html += currentFullName + ' est <strong>' + getArticleWithRelation(currentPerson.sex, uncleLabel) + uncleLabel + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.<br>';
        html += referenceFullName + ' est <strong>' + getArticleWithRelation(referencePerson.sex, nephewLabel) + nephewLabel + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.';
        html += '</div>';
        return html;
      }
      if (relationType === "nephew-niece") {
        var nephewLabel = currentPerson.sex === "M" ? "neveu" :
          currentPerson.sex === "F" ? "nièce" : "neveu/nièce";
        var uncleLabel = referencePerson.sex === "M" ? "oncle" :
          referencePerson.sex === "F" ? "tante" : "oncle/tante";
        html += currentFullName + ' est <strong>' + getArticleWithRelation(currentPerson.sex, nephewLabel) + nephewLabel + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.<br>';
        html += referenceFullName + ' est <strong>' + getArticleWithRelation(referencePerson.sex, uncleLabel) + uncleLabel + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.';
        html += '</div>';
        return html;
      }
      if (relationType === "cousin") {
        var cousinLabel = currentPerson.sex === "M" ? "cousin germain" :
          currentPerson.sex === "F" ? "cousine germaine" : "cousin(e) germain(e)";
        var refCousinLabel = referencePerson.sex === "M" ? "cousin germain" :
          referencePerson.sex === "F" ? "cousine germaine" : "cousin(e) germain(e)";
        html += currentFullName + ' est <strong>' + (currentPerson.sex === "F" ? "la " : "le ") + cousinLabel + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.<br>';
        html += referenceFullName + ' est <strong>' + (referencePerson.sex === "F" ? "la " : "le ") + refCousinLabel + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.';
        html += '</div>';
        return html;
      }
      if (relationType === "none") {
        html += "Aucun lien de parenté <strong>direct</strong> trouvé entre " + currentFullName + " et " + referenceFullName + ".";
        html += '</div>';
        return html;
      }
      if (depth > 0) {
        var relationToReference = getRelationship(depth, currentPerson.sex, true);
        var relationFromReference = getRelationship(depth, referencePerson.sex, false);
        html += referenceFullName + ' est <strong>' + getArticleWithRelation(referencePerson.sex, relationFromReference) + relationFromReference + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.<br>';
        html += currentFullName + ' est <strong>' + getArticleWithRelation(currentPerson.sex, relationToReference) + relationToReference + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.';
      } else {
        var absDepth = Math.abs(depth);
        var relationToReference = getRelationship(absDepth, referencePerson.sex, true);
        var relationFromReference = getRelationship(absDepth, currentPerson.sex, false);
        html += currentFullName + ' est <strong>' + getArticleWithRelation(currentPerson.sex, relationFromReference) + relationFromReference + '</strong> ' +
          getPreposition(referenceFullName) + referenceFullName + '.<br>';
        html += referenceFullName + ' est <strong>' + getArticleWithRelation(referencePerson.sex, relationToReference) + relationToReference + '</strong> ' +
          getPreposition(currentFullName) + currentFullName + '.';
      }
      html += '</div>';
      return html;
    }.bind(this);
    var formatInfo = function(label, value) {
      var displayValue = value || "Non renseigné";
      return (
        '<div class="panel-info-item"><span class="panel-label">' +
        label +
        ' :</span><span class="panel-value">' +
        displayValue +
        "</span></div>"
      );
    };
    var getGenderIcon = function(sex) {
      if (sex === "M") {
        return '<i class="fas fa-mars" style="color: #45b7af;"></i>';
      } else if (sex === "F") {
        return '<i class="fas fa-venus" style="color: #e91e63;"></i>';
      } else {
        return '<i class="fas fa-genderless" style="color: #999;"></i> Inconnu';
      }
    };
    // Calculer le nombre total de documents
    var totalDocs = 0;
    if (person.notes) totalDocs++; // Note membre
    if (person.doc_naissance) totalDocs++; // Source naissance
    if (person.doc_deces) totalDocs++; // Source décès
    // Compter les notes de mariage
    if (person.marriages) {
      Object.values(person.marriages).forEach(function(marriage) {
        if (marriage.notes) totalDocs++;
      });
    }
    var initialTitle = totalDocs > 0 ? "Voir documents" : "Pas de documents";
    // Le badge sera ajouté dynamiquement après le chargement des données API
    
    // Construction du header
    var headerHtml =
      '<h3>' +
      person.firstNames +
      " " +
      person.lastName +
      "</h3>" +
      '<button class="quick-view-btn root-tab-icon" id="qv-btn-' + person.id + '" data-person-id="' + person.id + '" onclick="openPersonQuickView(' + person.id + ')">' +
      '<i class="fas fa-folder-open"></i>' +
      '<span class="doc-clip-container"></span>' +
      '<span class="tooltip">' + initialTitle + '</span>' +
      '</button>';
    
    // Construction du content
    var contentHtml = '';
    contentHtml += '<h4><i class="fas fa-user"></i> Lien</h4>';
    contentHtml += '<div class="panel-info-group">';
    //contentHtml += formatInfo("Prénoms", person.firstNames);
    contentHtml += formatInfo("Genre", getGenderIcon(person.sex));
    contentHtml += formatInfo("Parenté", formatRelationship(person, referencePerson, depth, relationType));
    if (relationType === "ascendant" || relationType === "descendant") {
      contentHtml += formatInfo("Numéro de génération", Math.abs(depth));
    }
    contentHtml += "</div>";
    contentHtml += '<h4><i class="fas fa-baby"></i> Naissance</h4>';
    contentHtml += '<div class="panel-info-group">';
    contentHtml += formatInfo("Date", person.fullBirthDate);
    contentHtml += formatInfo("Lieu", person.birthPlace);
    if (person.doc_naissance) {
      contentHtml += '<div class="panel-info-item">';
      contentHtml += '<span class="panel-label">Sources :</span>';
      contentHtml += '<span class="panel-value" style="white-space: pre-wrap;">' + formatNotes(person.doc_naissance) + '</span>';
      contentHtml += '</div>';
    }
    contentHtml += "</div>";
    if (person.occupation) {
      contentHtml += '<h4><i class="fas fa-briefcase"></i> Profession</h4>';
      contentHtml += '<div class="panel-info-group">';
      contentHtml += formatInfo("Profession", person.occupation);
      contentHtml += "</div>";
    }
    if (person.notes) {
      contentHtml += '<h4><i class="fas fa-sticky-note"></i> Notes</h4>';
      contentHtml += '<div class="panel-info-group">';
      contentHtml += '<div class="panel-info-item">';
      contentHtml += '<span class="panel-value" style="white-space: pre-wrap;">' + formatNotes(person.notes) + '</span>';
      contentHtml += '</div>';
      contentHtml += "</div>";
    }
    var self = this;
    var spouses = person.spouseIds
      .map(function(id) {
        return self.familyDatabase[id];
      })
      .filter(function(s) {
        return s;
      })
      .sort(function(a, b) {
        // Trier par numero_ordre des mariages
        var marriageA = person.marriages && person.marriages[a.id] ? person.marriages[a.id] : {};
        var marriageB = person.marriages && person.marriages[b.id] ? person.marriages[b.id] : {};
        var ordreA = marriageA.numeroOrdre || 999;
        var ordreB = marriageB.numeroOrdre || 999;
        return ordreA - ordreB;
      });
    if (spouses.length > 0) {
      contentHtml += '<h4><i class="fas fa-ring"></i> Mariages</h4>';
      spouses.forEach(function(spouse, index) {
        var marriageData =
          person.marriages && person.marriages[spouse.id] ?
          person.marriages[spouse.id] : {};
        var numeroOrdre = marriageData.numeroOrdre || (index + 1);
        var marriageDate =
          marriageData.fullMarriageDate || marriageData.marriageDate || marriageData.date || "";
        var marriagePlace =
          marriageData.marriagePlace || marriageData.place || "";
        var divorceDate =
          marriageData.fullDivorceDate || marriageData.divorceDate || "";
        var hasDivorce = marriageData.hasDivorce || false;
        var divorcePlace =
          marriageData.divorcePlace || "";
        var marriageNotes =
          marriageData.notes || "";
        contentHtml += '<div class="panel-info-group marriage-group">';
        contentHtml += '<div class="panel-info-item spouse-name">';
        contentHtml +=
          '<span class="panel-label"><i class="fas fa-ring"></i>' +
          (spouses.length > 1 ? '<span style="margin-left: 6px;">' + numeroOrdre + '</span>' : '') +
          '</span>';
        contentHtml += `<span class="panel-value">avec ${spouse.firstNames} ${spouse.lastName}</span>`;
        contentHtml += "</div>";
        // Calcul de l'âge au mariage
        var marriageAgeText = "";
        if (marriageDate && person.birthDate) {
          var birthYear = parseInt(person.birthDate.substring(0, 4));
          var marriageYear;
          var firstDashPos = marriageDate.indexOf('-');
          if (firstDashPos >= 2 && firstDashPos <= 2) {
            marriageYear = parseInt(marriageDate.substring(6, 10));
          } else {
            marriageYear = parseInt(marriageDate.substring(0, 4));
          }
          if (marriageYear && birthYear && marriageYear >= birthYear) {
            var ageAtMarriage = marriageYear - birthYear;
            marriageAgeText = " (" + ageAtMarriage + " ans)";
          } else {
          }
        }
        var marriageDateDisplay = marriageDate ? marriageDate + marriageAgeText : "";
        contentHtml += formatInfo("Mariage / Pacs", marriageDateDisplay);
        contentHtml += formatInfo("Lieu", marriagePlace);
        if (divorceDate && divorceDate === spouse.fullDeathDate) {
          // Si la date de fin du mariage correspond à la date de décès
          contentHtml += formatInfo("Décès de " + (spouse.sex === 'M' ? "son mari" : spouse.sex === 'F' ? "son épouse" : "son conjoint"), spouse.fullDeathDate);
        } else if (hasDivorce && !divorceDate) {
          // Divorce sans date
          contentHtml += formatInfo("Statut", "Divorcé");
        } else if (divorceDate && divorceDate !== person.fullDeathDate && divorceDate !== spouse.fullDeathDate) {
          contentHtml += formatInfo((person.sex === 'F' ? "Divorcée" : "Divorcé") + " le", divorceDate);
        }
        if (marriageNotes) {
          contentHtml += '<div class="panel-info-item">';
          contentHtml += '<span class="panel-label">Sources :</span>';
          contentHtml += '<span class="panel-value" style="white-space: pre-wrap;">' + formatNotes(marriageNotes) + '</span>';
          contentHtml += '</div>';
        }
        contentHtml += "</div>";
      });
    }
    if (person.fullDeathDate) {
      contentHtml += '<h4><i class="fas fa-cross"></i> Décès</h4>';
      contentHtml += '<div class="panel-info-group">';
      var ageText = "";
      if (person.birthDate && person.deathDate) {
        var birthYear = parseInt(person.birthDate.substring(0, 4));
        var deathYear = parseInt(person.deathDate.substring(0, 4));
        var age = deathYear - birthYear;
        ageText = " (" + age + " ans)";
      }
      contentHtml += formatInfo("Date", person.fullDeathDate + ageText);
      contentHtml += formatInfo("Lieu", person.deathPlace);
      if (person.doc_deces) {
        contentHtml += '<div class="panel-info-item">';
        contentHtml += '<span class="panel-label">Sources :</span>';
        contentHtml += '<span class="panel-value" style="white-space: pre-wrap;">' + formatNotes(person.doc_deces) + '</span>';
        contentHtml += '</div>';
      }
      contentHtml += "</div>";
    }
    
    // Mettre à jour le header et le content séparément
    if (panelHeader) {
      panelHeader.innerHTML = headerHtml;
    }
    panelContent.innerHTML = contentHtml;
    // Mettre à jour le trombone du bouton quick-view
    updateQuickViewButtonClip(person.id);
  }
  updateTreeVisualization() {
    if (!this.familyTree) {
      console.error("L'arbre généalogique n'est pas disponible");
      return;
    }
    var container = document.getElementById("tree-container");
    container.innerHTML = "";
    var svg = this.visualizer.createSVG();
    var g = svg
      .append("g")
      .attr(
        "transform",
        "translate(" +
        CONFIG.margins.left +
        "," +
        CONFIG.margins.top +
        ")"
      );
    this.visualizer.zoom = this.visualizer.setupZoom(svg, g);
    var dims = this.visualizer.getDimensions();
    var modeConfig = this.isHorizontal ?
      CONFIG.horizontal :
      CONFIG.vertical;
    var self = this;
    var treemap = d3
      .tree()
      .size(
        this.isHorizontal ? [
          dims.height * (modeConfig.heightMultiplier || 1),
          dims.width * modeConfig.treeSizeMultiplier,
        ] : [
          dims.width * (modeConfig.widthMultiplier || 1),
          dims.height * modeConfig.treeSizeMultiplier,
        ]
      )
      .separation(function(a, b) {
        var aSize =
          1 +
          (self.showSiblings && a.data.siblings ?
            a.data.siblings.length :
            0);
        var bSize =
          1 +
          (self.showSiblings && b.data.siblings ?
            b.data.siblings.length :
            0);
        return a.parent === b.parent ?
          Math.max(
            modeConfig.separationSameParent,
            (aSize + bSize) / 1.2
          ) :
          Math.max(
            modeConfig.separationDifferentParent,
            (aSize + bSize) / 1.2
          );
      });
    var rootNode = d3.hierarchy(this.familyTree, function(d) {
      return d.parents;
    });
    var treeData = treemap(rootNode);
    if (!this.isHorizontal) {
      var nodes = treeData.descendants();
      var maxY = Math.max.apply(
        null,
        nodes.map(function(n) {
          return n.y;
        })
      );
      nodes.forEach(function(node) {
        node.y = maxY - node.y;
      });
    }
    var nodes = treeData.descendants();
    if (this.isHorizontal) {
      var initialTransform =
        this.visualizer.calculateOptimalTransform(nodes);
      svg.call(this.visualizer.zoom.transform, initialTransform);
    }
    // Dessiner d'abord tous les liens (arrière-plan)
    this.drawTreeLinks(g, treeData);
    this.visualizer.drawMarriageLinks(g, nodes);
    // Dessiner les fratries avant les nœuds principaux
    if (this.showSiblings) {
      this.drawSiblings(g, nodes);
    }
    // Dessiner les nœuds EN DERNIER pour qu'ils soient au-dessus de tous les liens
    this.drawTreeNodes(g, treeData);
    var self = this;
    requestAnimationFrame(function() {
      setTimeout(function() {
        var finalTransform =
          self.visualizer.calculateOptimalTransform(nodes);
        if (self.isHorizontal) {
          svg
            .transition()
            .duration(400)
            .call(self.visualizer.zoom.transform, finalTransform);
        } else {
          svg.call(self.visualizer.zoom.transform, finalTransform);
        }
      }, 150);
    });
  }
  drawTreeLinks(g, treeData) {
    var links = treeData.links();
    var isVertical = !this.isHorizontal;
    var radius = isVertical ?
      CONFIG.nodeRadius.vertical :
      CONFIG.nodeRadius.default;
    if (this.isHorizontal) {
      var linkGenerator = d3
        .link(d3.curveStep)
        .x(function(d) {
          return d.y;
        })
        .y(function(d) {
          return d.x;
        });
      g.selectAll(".link")
        .data(links)
        .join("path")
        .attr("class", "link")
        .attr("d", linkGenerator)
        .transition()
        .duration(CONFIG.transitionDuration);
    } else {
      var childrenWithParents = new Map();
      links.forEach(function(link) {
        var childId = link.target.data.id;
        if (!childrenWithParents.has(childId)) {
          childrenWithParents.set(childId, []);
        }
        childrenWithParents.get(childId).push(link);
      });
      childrenWithParents.forEach(function(parentLinks) {
        if (parentLinks.length === 0) return;
        var child = parentLinks[0].target;
        var childX = child.x;
        var childY = child.y - radius;
        if (parentLinks.length === 1) {
          var parent = parentLinks[0].source;
          var midY = (childY + parent.y + radius) / 2;
          g.append("path")
            .attr("class", "link")
            .attr(
              "d",
              "M " +
              childX +
              "," +
              childY +
              " V " +
              midY +
              " H " +
              parent.x +
              " V " +
              (parent.y + radius)
            );
        } else if (parentLinks.length === 2) {
          var parent1 = parentLinks[0].source;
          var parent2 = parentLinks[1].source;
          var avgParentY = (parent1.y + parent2.y) / 2 + radius;
          var branchY = (childY + avgParentY) / 2;
          g.append("path")
            .attr("class", "link")
            .attr("d", "M " + childX + "," + childY + " V " + branchY);
          g.append("path")
            .attr("class", "link")
            .attr(
              "d",
              "M " + parent1.x + "," + branchY + " H " + parent2.x
            );
          g.append("path")
            .attr("class", "link")
            .attr(
              "d",
              "M " +
              parent1.x +
              "," +
              branchY +
              " V " +
              (parent1.y + radius)
            );
          g.append("path")
            .attr("class", "link")
            .attr(
              "d",
              "M " +
              parent2.x +
              "," +
              branchY +
              " V " +
              (parent2.y + radius)
            );
        }
      });
    }
  }
  drawTreeNodes(g, treeData) {
    var self = this;
    var isVertical = !this.isHorizontal;
    var nodeRadius = isVertical ?
      CONFIG.nodeRadius.vertical :
      CONFIG.nodeRadius.default;
    var nodeGroups = g
      .selectAll(".node")
      .data(treeData.descendants())
      .join("g")
      .attr("class", function(d) {
        return "node depth-" + d.data.depth;
      })
      .attr("transform", function(d) {
        return self.isHorizontal ?
          "translate(" + d.y + "," + d.x + ")" :
          "translate(" + d.x + "," + d.y + ")";
      })
      .style("cursor", "pointer")
      .on("click", function(event, d) {
        self.selectPerson(d.data.id);
      });
    nodeGroups.append("circle").attr("r", nodeRadius);
    this.visualizer.addHoverEffect(nodeGroups);
    this.addNodeTexts(nodeGroups);
    var rootNode = treeData.descendants()[0];
    this.drawRootFamily(g, rootNode);
    // Re-dessiner le nœud racine en dernier pour qu'il soit au-dessus de tous les liens
    var rootGroup = g
      .append("g")
      .attr("class", "node depth-" + rootNode.data.depth)
      .attr("transform", function() {
        return self.isHorizontal ?
          "translate(" + rootNode.y + "," + rootNode.x + ")" :
          "translate(" + rootNode.x + "," + rootNode.y + ")";
      })
      .style("cursor", "pointer")
      .on("click", function() {
        self.selectPerson(rootNode.data.id);
      })
      .datum(rootNode);
    rootGroup.append("circle").attr("r", nodeRadius);
    this.visualizer.addHoverEffect(rootGroup);
    this.addNodeTexts(rootGroup);
  }
  drawRootFamily(g, rootNode) {
    var self = this;
    var modeConfig = this.isHorizontal ?
      CONFIG.horizontal :
      CONFIG.vertical;
    var isVertical = !this.isHorizontal;
    var rootRadius = isVertical ?
      CONFIG.nodeRadius.vertical :
      CONFIG.nodeRadius.default;
    var spouseRadius = isVertical ?
      CONFIG.siblingRadius.vertical :
      CONFIG.siblingRadius.default;
    var rootCoord = this.isHorizontal ? rootNode.x : rootNode.x;
    var siblings = rootNode.data.siblings || [];
    var siblingSpacing = this.isHorizontal ?
      CONFIG.spacing.siblingVertical :
      CONFIG.vertical.siblingSpacing;
    if (siblings.length > 0) {
      var horizontalSiblingOffset = 20;
      siblings.forEach(function(sibling, index) {
        if (self.isHorizontal) {
          var siblingCoord =
            rootCoord + siblingSpacing + index * siblingSpacing;
          g.append("path")
            .attr("class", "sibling-link")
            .attr(
              "d",
              "M " +
              rootNode.y +
              "," +
              (rootCoord + rootRadius) +
              " L " +
              rootNode.y +
              "," +
              siblingCoord +
              " L " +
              (rootNode.y + horizontalSiblingOffset) +
              "," +
              siblingCoord +
              " L " +
              (rootNode.y + spouseRadius * 2) +
              "," +
              siblingCoord
            );
          self.drawFamilyMember(
            g,
            sibling,
            rootNode.y + spouseRadius * 2,
            siblingCoord,
            "sibling"
          );
        } else {
          var rootSiblingOffset = CONFIG.vertical.rootSiblingOffset;
          var siblingCoord =
            rootCoord + rootSiblingOffset + index * siblingSpacing;
          g.append("path")
            .attr("class", "sibling-link")
            .attr(
              "d",
              "M " +
              (rootCoord + rootRadius) +
              "," +
              rootNode.y +
              " L " +
              siblingCoord +
              "," +
              rootNode.y +
              " L " +
              siblingCoord +
              "," +
              (rootNode.y - horizontalSiblingOffset) +
              " L " +
              siblingCoord +
              "," +
              (rootNode.y - spouseRadius * 2)
            );
          self.drawFamilyMember(
            g,
            sibling,
            siblingCoord,
            rootNode.y - spouseRadius * 2,
            "sibling"
          );
        }
      });
    }
    var marriages =
      this.familyDatabase[rootNode.data.id] &&
      this.familyDatabase[rootNode.data.id].marriages ?
      this.familyDatabase[rootNode.data.id].marriages : {};
    var sortedMarriages = Object.entries(marriages).sort(function(a, b) {
      var yearA = parseInt(a[1].marriageYear || a[1].date) || 9999;
      var yearB = parseInt(b[1].marriageYear || b[1].date) || 9999;
      return yearA - yearB;
    });
    var spouseSpacing = modeConfig.familySpacing;
    var childSpacing =
      modeConfig.familySpacing * modeConfig.childSpacingMultiplier;
    var horizontalOffset = this.isHorizontal ?
      -modeConfig.familySpacing * 2.5 :
      modeConfig.familySpacing * 0.5;
    var currentCoord = rootCoord;
    var previousSpouseCoord = rootCoord;
    var previousChildrenWidth = 0;
    var previousChildrenEndX = 0;
    sortedMarriages.forEach(function(item, index) {
      var spouseId = item[0];
      var spouseData = self.familyDatabase[spouseId];
      if (!spouseData) return;
      var marriageChildren = self.getMarriageChildren(
        rootNode.data.id,
        spouseId
      );
      var childrenHeight = marriageChildren.length * childSpacing;
      var childrenWidth = self.isHorizontal ?
        childrenHeight :
        marriageChildren.length * childSpacing;
      var totalMarriageHeight = self.isHorizontal ?
        Math.max(childrenHeight, spouseSpacing) :
        Math.max(childrenWidth, spouseSpacing);
      var spouseCoord;
      if (self.isHorizontal) {
        spouseCoord = currentCoord - totalMarriageHeight;
      } else {
        var baseSpouseSpacing = Math.abs(spouseSpacing);
        if (index === 0) {
          spouseCoord = currentCoord - baseSpouseSpacing * 1.5;
        } else {
          if (previousChildrenWidth > 0 && previousChildrenEndX > 0) {
            var minChildrenGap = childSpacing * 1.5;
            var nextChildrenStartX =
              previousChildrenEndX - minChildrenGap;
            var thisChildrenWidth =
              marriageChildren.length * childSpacing;
            spouseCoord = nextChildrenStartX - thisChildrenWidth / 2;
          } else {
            var minSpouseGap = baseSpouseSpacing * 1.5;
            spouseCoord =
              previousSpouseCoord - spouseRadius - minSpouseGap;
          }
        }
      }
      if (self.isHorizontal) {
        if (index === 0) {
          g.append("path")
            .attr(
              "class",
              sortedMarriages.length === 1 ?
              "spouse-link-single" :
              "spouse-link"
            )
            .attr(
              "d",
              "M " +
              rootNode.y +
              "," +
              (rootNode.x - rootRadius) +
              " L " +
              rootNode.y +
              "," +
              (spouseCoord + spouseRadius)
            );
        } else {
          g.append("path")
            .attr("class", "spouse-link")
            .attr(
              "d",
              "M " +
              rootNode.y +
              "," +
              (previousSpouseCoord - spouseRadius) +
              " L " +
              rootNode.y +
              "," +
              (spouseCoord + spouseRadius)
            );
        }
        self.drawFamilyMember(
          g,
          spouseData,
          rootNode.y,
          spouseCoord,
          "spouse"
        );
        if (sortedMarriages.length > 1) {
          var midChildY = (spouseCoord + previousSpouseCoord) / 2;
          g.append("text")
            .attr("class", "marriage-number")
            .attr("x", rootNode.y - 2)
            .attr("y", midChildY - 12)
            .attr("text-anchor", "end")
            .text(index + 1);
        }
        if (marriageChildren.length > 0) {
          var midChildY = (spouseCoord + previousSpouseCoord) / 2;
          var totalChildrenHeight =
            (marriageChildren.length - 1) * childSpacing;
          var childStartY = midChildY - totalChildrenHeight / 2;
          g.append("path")
            .attr("class", "child-link")
            .attr(
              "d",
              "M " +
              rootNode.y +
              "," +
              midChildY +
              " H " +
              (rootNode.y + horizontalOffset)
            );
          if (marriageChildren.length > 1) {
            g.append("path")
              .attr("class", "child-link")
              .attr(
                "d",
                "M " +
                (rootNode.y + horizontalOffset) +
                "," +
                childStartY +
                " V " +
                (childStartY + totalChildrenHeight)
              );
          }
          marriageChildren.forEach(function(child, childIndex) {
            var childY = childStartY + childIndex * childSpacing;
            g.append("path")
              .attr("class", "child-link")
              .attr(
                "d",
                "M " +
                (rootNode.y + horizontalOffset) +
                "," +
                childY +
                " H " +
                (rootNode.y + horizontalOffset - spouseRadius * 4)
              );
            self.drawFamilyMember(
              g,
              child,
              rootNode.y + horizontalOffset - spouseRadius * 4,
              childY,
              "child"
            );
          });
        }
        // Calculer la position de la date (50% entre chaque conjoint)
        var datePosition;
        if (index === 0) {
          datePosition = rootNode.x + (spouseCoord - rootNode.x) * 0.5;
        } else {
          datePosition = previousSpouseCoord + (spouseCoord - previousSpouseCoord) * 0.5;
        }
        // Date de mariage (conditionnelle) - dessinée EN DERNIER pour être au-dessus
        if (self.showMarriages) {
          var marriageData = item[1];
          var marriageYear = marriageData.marriageYear || marriageData.date || "?";
          g.append("text")
            .attr("class", "marriage-symbol-year horizontal")
            .attr("x", rootNode.y - 10)
            .attr("y", datePosition)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text("x " + marriageYear);
        }
      } else {
        if (index === 0) {
          g.append("path")
            .attr(
              "class",
              sortedMarriages.length === 1 ?
              "spouse-link-single" :
              "spouse-link"
            )
            .attr(
              "d",
              "M " +
              (rootNode.x - rootRadius) +
              "," +
              rootNode.y +
              " L " +
              (spouseCoord + spouseRadius) +
              "," +
              rootNode.y
            );
        } else {
          g.append("path")
            .attr("class", "spouse-link")
            .attr(
              "d",
              "M " +
              (previousSpouseCoord - spouseRadius) +
              "," +
              rootNode.y +
              " L " +
              (spouseCoord + spouseRadius) +
              "," +
              rootNode.y
            );
        }
        // Calculer la position de la date (50% entre chaque conjoint)
        var datePosition;
        if (index === 0) {
          datePosition = rootNode.x + (spouseCoord - rootNode.x) * 0.5;
        } else {
          datePosition = previousSpouseCoord + (spouseCoord - previousSpouseCoord) * 0.5;
        }
        // Date de mariage (conditionnelle)
        if (self.showMarriages) {
          var marriageData = item[1];
          var marriageYear = marriageData.marriageYear || marriageData.date || "?";
          g.append("text")
            .attr("class", "marriage-symbol-year vertical")
            .attr("x", datePosition)
            .attr("y", rootNode.y - 10)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text("x " + marriageYear);
        }
        var spouseGroup = self.drawFamilyMember(
          g,
          spouseData,
          spouseCoord,
          rootNode.y,
          "spouse"
        );
        spouseGroup.classed("root-spouse", true);
        var marriageNumberX;
        if (sortedMarriages.length > 1) {
          if (index === 0) {
            marriageNumberX = (rootNode.x + spouseCoord) / 2;
          } else {
            marriageNumberX = (spouseCoord + previousSpouseCoord) / 2;
          }
          g.append("text")
            .attr("class", "marriage-number")
            .attr("x", marriageNumberX + 4)
            .attr("y", rootNode.y + 15)
            .attr("text-anchor", "start")
            .text(index + 1);
        }
        if (marriageChildren.length > 0) {
          var totalChildrenWidth = marriageChildren.length * childSpacing;
          var childStartX, verticalBarStartX;
          var isSecondMarriage = index === 1;
          if (
            sortedMarriages.length > 1 &&
            marriageNumberX !== undefined
          ) {
            verticalBarStartX = marriageNumberX;
            if (isSecondMarriage) {
              var firstChildX = verticalBarStartX;
              childStartX = firstChildX;
            } else {
              var firstChildX = verticalBarStartX;
              childStartX =
                firstChildX -
                (marriageChildren.length - 1) * childSpacing;
            }
          } else {
            var centerBetweenParents = (rootNode.x + spouseCoord) / 2;
            verticalBarStartX = centerBetweenParents;
            if (marriageChildren.length === 1) {
              childStartX = centerBetweenParents;
            } else {
              childStartX = centerBetweenParents - totalChildrenWidth / 2;
            }
          }
          g.append("path")
            .attr("class", "child-link")
            .attr(
              "d",
              "M " +
              verticalBarStartX +
              "," +
              rootNode.y +
              " V " +
              (rootNode.y - horizontalOffset)
            );
          if (marriageChildren.length > 1) {
            var childRadius = isVertical ?
              CONFIG.siblingRadius.vertical :
              CONFIG.siblingRadius.default;
            var childY = rootNode.y - horizontalOffset + spouseRadius * 4;
            var firstChildX = childStartX;
            var lastChildX =
              childStartX + (marriageChildren.length - 1) * childSpacing;
            if (sortedMarriages.length > 1) {
              if (isSecondMarriage) {
                var horizontalLineX = firstChildX - childRadius;
                g.append("path")
                  .attr("class", "child-link")
                  .attr(
                    "d",
                    "M " +
                    horizontalLineX +
                    "," +
                    childY +
                    " H " +
                    (horizontalLineX +
                      (marriageChildren.length - 1) * 0)
                  );
                g.append("path")
                  .attr("class", "child-link")
                  .attr(
                    "d",
                    "M " +
                    horizontalLineX +
                    "," +
                    childY +
                    " H " +
                    (lastChildX - childRadius)
                  );
              } else {
                var horizontalLineX = lastChildX + childRadius;
                g.append("path")
                  .attr("class", "child-link")
                  .attr(
                    "d",
                    "M " +
                    (firstChildX + childRadius) +
                    "," +
                    childY +
                    " H " +
                    horizontalLineX
                  );
              }
            } else {
              g.append("path")
                .attr("class", "child-link")
                .attr(
                  "d",
                  "M " +
                  firstChildX +
                  "," +
                  (rootNode.y - horizontalOffset) +
                  " H " +
                  lastChildX
                );
            }
          }
          marriageChildren.forEach(function(child, childIndex) {
            var childX = childStartX + childIndex * childSpacing;
            var childLineY = rootNode.y - horizontalOffset;
            var childY = rootNode.y - horizontalOffset + spouseRadius * 4;
            var childRadius = isVertical ?
              CONFIG.siblingRadius.vertical :
              CONFIG.siblingRadius.default;
            if (sortedMarriages.length > 1) {
              if (isSecondMarriage) {
                if (childIndex === 0) {
                  g.append("path")
                    .attr("class", "child-link")
                    .attr(
                      "d",
                      "M " + childX + "," + childLineY + " V " + childY
                    );
                }
              } else {
                if (childIndex === marriageChildren.length - 1) {
                  g.append("path")
                    .attr("class", "child-link")
                    .attr(
                      "d",
                      "M " + childX + "," + childLineY + " V " + childY
                    );
                }
              }
            } else {
              g.append("path")
                .attr("class", "child-link")
                .attr(
                  "d",
                  "M " + childX + "," + childLineY + " V " + childY
                );
            }
            if (
              sortedMarriages.length > 1 &&
              marriageChildren.length > 1
            ) {
              if (isSecondMarriage) {
                var connectionX = childX - childRadius;
                g.append("path")
                  .attr("class", "child-link")
                  .attr(
                    "d",
                    "M " + childX + "," + childY + " H " + connectionX
                  );
              } else {
                var connectionX = childX + childRadius;
                g.append("path")
                  .attr("class", "child-link")
                  .attr(
                    "d",
                    "M " + childX + "," + childY + " H " + connectionX
                  );
              }
            }
            self.drawFamilyMember(g, child, childX, childY, "child");
          });
          previousChildrenEndX = childStartX;
        }
      }
      previousSpouseCoord = spouseCoord;
      previousChildrenWidth =
        marriageChildren.length > 0 ?
        marriageChildren.length * childSpacing :
        0;
      currentCoord = self.isHorizontal ?
        spouseCoord - spouseSpacing :
        spouseCoord + spouseSpacing;
    });
  }
  getMarriageChildren(rootId, spouseId) {
    return Object.values(this.familyDatabase)
      .filter(function(p) {
        return (
          p.parentIds &&
          p.parentIds.includes(rootId) &&
          p.parentIds.includes(parseInt(spouseId))
        );
      })
      .sort(function(a, b) {
        return (a.birthDate || "").localeCompare(b.birthDate || "");
      });
  }
  drawFamilyMember(g, member, x, y, memberType) {
    var self = this;
    var isVertical = !this.isHorizontal;
    var memberGroup = g
      .append("g")
      .attr("class", "node " + memberType)
      .attr("transform", "translate(" + x + "," + y + ")")
      .style("cursor", "pointer")
      .on("click", function() {
        self.selectPerson(member.id);
      });
    memberGroup.attr("data-member-type", memberType);
    var nodeRadius = isVertical ?
      CONFIG.nodeRadius.vertical :
      CONFIG.nodeRadius.default;
    var siblingRadius = isVertical ?
      CONFIG.siblingRadius.vertical :
      CONFIG.siblingRadius.default;
    memberGroup
      .append("circle")
      .attr("r", memberType === "default" ? nodeRadius : siblingRadius)
      .attr("class", "depth-0");
    this.visualizer.addHoverEffect(memberGroup, memberType === "default");
    var isChild = memberType === "child";
    var isSpouse = memberType === "spouse";
    var isSibling = memberType === "sibling";
    var textAbove =
      isChild || isSpouse || (isSibling && !self.isHorizontal);
    var textOffset = isVertical ?
      CONFIG.spacing.verticalTextOffset :
      CONFIG.spacing.textOffset;
    var textOffsetX = textAbove ? 0 : textOffset;
    var nameDy = textAbove ? "-2em" : "-0.5em";
    var textAnchor = textAbove ? "middle" : "start";
    var textContainer = memberGroup
      .append("g")
      .attr("transform", "translate(" + textOffsetX + ", -5)");
    if (textAbove && !self.isHorizontal) {
      textContainer
        .append("text")
        .attr("class", "person-name")
        .attr("dy", "-3.2em")
        .style("text-anchor", textAnchor)
        .text(getFirstNameWithInitials(member));
      textContainer
        .append("text")
        .attr("class", "person-name")
        .attr("dy", "-1.9em")
        .style("text-anchor", textAnchor)
        .text(member.lastName);
    } else if (textAbove && self.isHorizontal) {
      var displayName = getFirstNameWithInitials(member) + " " + member.lastName;
      var memberName = textContainer
        .append("text")
        .attr("class", "person-name")
        .attr("dy", nameDy)
        .style("text-anchor", textAnchor)
        .text(displayName);
      var nameWidth = memberName.node().getComputedTextLength();
      datesX = nameWidth / 2;
    } else {
      var displayName = getFirstNameWithInitials(member) + " " + member.lastName;
      var memberName = textContainer
        .append("text")
        .attr("class", "person-name")
        .attr("dy", nameDy)
        .style("text-anchor", textAnchor)
        .text(displayName);
      var nameWidth = memberName.node().getComputedTextLength();
      datesX = nameWidth / 2;
    }
    var datesX = textAbove ? 0 : nameWidth / 2;
    var datesDy = textAbove ?
      isVertical ?
      "-0.8em" :
      "-0.9em" :
      "0.5em";
    var birthYear =
      member.birthDate && member.birthDate.length > 4 ?
      member.birthDate.substring(0, 4) :
      member.birthDate;
    var deathYear =
      member.deathDate && member.deathDate.length > 4 ?
      member.deathDate.substring(0, 4) :
      member.deathDate;
    var datesText = '';
    var isDeceased = deathYear && deathYear !== '' && deathYear !== '0000' && deathYear !== '0';
    if (birthYear && !isDeceased) {
      var neLabel = member.sex === 'F' ? 'née en' : 'né en';
      datesText = neLabel + ' ' + birthYear;
    } else if (birthYear && isDeceased) {
      datesText = birthYear + ' - ' + deathYear;
    } else if (isDeceased) {
      datesText = '- ' + deathYear;
    }
    textContainer
      .append("text")
      .attr("class", "person-dates")
      .attr("x", datesX)
      .attr("dy", datesDy)
      .style("text-anchor", "middle")
      .text(datesText);
    return memberGroup;
  }
  addNodeTexts(nodeGroups) {
    var self = this;
    var isVertical = !this.isHorizontal;
    if (isVertical) {
      nodeGroups.each(function(d) {
        var group = d3.select(this);
        if (d.depth === 0) {
          var firstNames = d.data.firstNames || d.data.firstName || "";
          var names = firstNames.split(' ').filter(n => n.trim() !== '');
          var fixedDateToCirle = -2.0; // Distance souhaitée entre date et cercle
          var dateDy = fixedDateToCirle;
          var lastNameDy = dateDy - 1.2;
          var firstNameStartDy = lastNameDy - (names.length * 1.3);
          names.forEach(function(name, index) {
            group.append("text")
              .attr("class", "person-name")
              .attr("dy", (firstNameStartDy + index * 1.3) + "em")
              .attr("x", 0)
              .style("text-anchor", "middle")
              .text(name);
          });
          group.append("text")
            .attr("class", "person-name")
            .attr("dy", lastNameDy + "em")
            .attr("x", 0)
            .style("text-anchor", "middle")
            .text(d.data.lastName || "");
          group.append("text")
            .attr("class", "person-dates")
            .attr("dy", dateDy + "em")
            .attr("x", 0)
            .style("text-anchor", "middle")
            .text(d.data.getDisplayDates());
        } else {
          group.append("text")
            .attr("class", "person-name")
            .attr("dy", "-3.5em")
            .attr("x", 0)
            .style("text-anchor", "middle")
            .text(d.data.getFirstNameWithInitials() || "");
          group.append("text")
            .attr("class", "person-name")
            .attr("dy", "-2.2em")
            .attr("x", 0)
            .style("text-anchor", "middle")
            .text(d.data.lastName || "");
          group.append("text")
            .attr("class", "person-dates")
            .attr("dy", "-1em")
            .attr("x", 0)
            .style("text-anchor", "middle")
            .text(d.data.getDisplayDates());
        }
      });
    } else {
      nodeGroups.each(function(d) {
        var group = d3.select(this);
        var baseOffset =
          d.parents && d.parents.length > 0 ?
          -CONFIG.spacing.textOffset :
          CONFIG.spacing.textOffset;
        var anchor =
          d.parents && d.parents.length > 0 ? "end" : "start";
        if (d.depth === 0) {
          // Décalage supplémentaire pour le bloc racine
          var rootTextOffset = CONFIG.spacing.rootTextOffset || 58;
          var firstNames = d.data.firstNames || d.data.firstName || "";
          var names = firstNames.split(' ').filter(n => n.trim() !== '');
          var dateDy = -0.5;
          var lastNameDy = -1.6;
          var firstNameStartDy = lastNameDy - (names.length * 1.3);
          var lastNameEl = group.append("text")
            .attr("class", "person-name")
            .attr("dy", lastNameDy + "em")
            .attr("x", rootTextOffset)
            .style("text-anchor", "middle")
            .text(d.data.lastName || "");
          // Mesure la largeur du nom
          var lastNameWidth = lastNameEl.node().getComputedTextLength();
          // Centre du nom
          var nameCenterX = rootTextOffset;
          // Empile les prénoms centrés
          names.forEach(function(name, index) {
            group.append("text")
              .attr("class", "person-name")
              .attr("dy", (firstNameStartDy + index * 1.3) + "em")
              .attr("x", nameCenterX)
              .style("text-anchor", "middle")
              .text(name);
          });
          // Dates centrées sous le nom
          group.append("text")
            .attr("class", "person-dates")
            .attr("dy", dateDy + "em")
            .attr("x", nameCenterX)
            .style("text-anchor", "middle")
            .text(d.data.getDisplayDates());
        } else {
          // Cas non-racine avec initiales
          var displayName = d.data.getFirstNameWithInitials() + " " + d.data.lastName;
          group.append("text")
            .attr("class", "person-name")
            .attr("dy", "-0.6em")
            .attr("x", baseOffset)
            .style("text-anchor", anchor)
            .text(displayName)
            .each(function(d) {
              d.nameWidth = this.getComputedTextLength();
            });
          group.append("text")
            .attr("class", "person-dates")
            .attr("dy", "0.5em")
            .attr("x", baseOffset + (d.nameWidth / 2) * (d.parents && d.parents.length > 0 ? -1 : 1))
            .style("text-anchor", "middle")
            .text(d.data.getDisplayDates());
        }
      });
    }
  }
  drawSiblings(g, nodes) {
    var self = this;
    nodes.forEach(function(person) {
      if (
        person !== nodes[0] &&
        (person.data.depth === 0 || person.data.depth === 1)
      ) {
        var siblings = person.data.siblings;
        if (!siblings || !siblings.length) return;
        var siblingPositions = siblings
          .map(function(sibling, index) {
            var spacingValue = self.isHorizontal ?
              CONFIG.spacing.siblingVertical :
              CONFIG.vertical.siblingSpacing;
            var offset = Math.ceil((index + 1) / 2) * spacingValue;
            var side;
            if (self.isHorizontal) {
              var isEven = index % 2 === 0;
              side = isEven ? 1 : -1;
            } else {
              var isEven = index % 2 === 0;
              side = isEven ? -1 : 1;
            }
            return {
              sibling: sibling,
              coord: (self.isHorizontal ? person.x : person.x) + offset * side,
            };
          })
          .sort(function(a, b) {
            return a.coord - b.coord;
          });
        siblingPositions.forEach(function(item) {
          self.drawSiblingConnection(g, person, item.coord);
          self.drawSibling(g, person, item.sibling, item.coord);
        });
      }
    });
  }
  drawSiblingConnection(g, person, targetCoord) {
    var isVertical = !this.isHorizontal;
    var radius = isVertical ?
      CONFIG.nodeRadius.vertical :
      CONFIG.nodeRadius.default;
    var siblingRadius = isVertical ?
      CONFIG.siblingRadius.vertical :
      CONFIG.siblingRadius.default;
    var horizontalOffset = -14;
    if (this.isHorizontal) {
      g.append("path")
        .attr("class", "sibling-link")
        .attr(
          "d",
          "M " +
          (person.y - radius) +
          "," +
          person.x +
          " L " +
          (person.y + horizontalOffset) +
          "," +
          person.x +
          " L " +
          (person.y + horizontalOffset) +
          "," +
          targetCoord +
          " L " +
          (person.y - siblingRadius) +
          "," +
          targetCoord
        );
    } else {
      g.append("path")
        .attr("class", "sibling-link")
        .attr(
          "d",
          "M " +
          person.x +
          "," +
          (person.y - radius) +
          " L " +
          person.x +
          "," +
          (person.y + horizontalOffset) +
          " L " +
          targetCoord +
          "," +
          (person.y + horizontalOffset) +
          " L " +
          targetCoord +
          "," +
          (person.y - siblingRadius)
        );
    }
  }
  drawSibling(g, person, sibling, siblingCoord) {
    var self = this;
    var isVertical = !this.isHorizontal;
    var siblingRadius = isVertical ?
      CONFIG.siblingRadius.vertical :
      CONFIG.siblingRadius.default;
    var textOffset = isVertical ?
      CONFIG.spacing.verticalTextOffset :
      CONFIG.spacing.textOffset;
    var siblingGroup = g
      .append("g")
      .attr("class", "sibling-group")
      .attr("data-member-type", "sibling")
      .attr(
        "transform",
        this.isHorizontal ?
        "translate(" + person.y + "," + siblingCoord + ")" :
        "translate(" + siblingCoord + "," + person.y + ")"
      )
      .style("cursor", "pointer")
      .on("click", function() {
        self.selectPerson(sibling.id);
      });
    siblingGroup
      .append("circle")
      .attr("r", siblingRadius)
      .attr("class", "depth-" + person.data.depth);
    this.visualizer.addHoverEffect(siblingGroup, false);
    if (this.isHorizontal) {
      var displayName = getFirstNameWithInitials(sibling) + " " + sibling.lastName;
      var siblingName = siblingGroup
        .append("text")
        .attr("class", "person-name")
        .attr("x", textOffset)
        .attr("dy", "-0.5em")
        .text(displayName);
      var nameWidth = siblingName.node().getComputedTextLength();
      siblingGroup
        .append("text")
        .attr("class", "person-dates")
        .attr("x", textOffset + nameWidth / 2)
        .attr("dy", "0.5em")
        .style("text-anchor", "middle")
        .text(sibling.getDisplayDates());
    } else {
      siblingGroup
        .append("text")
        .attr("class", "person-name")
        .attr("x", 0)
        .attr("dy", "-3.6em")
        .style("text-anchor", "middle")
        .text(getFirstNameWithInitials(sibling));
      siblingGroup
        .append("text")
        .attr("class", "person-name")
        .attr("x", 0)
        .attr("dy", "-2.3em")
        .style("text-anchor", "middle")
        .text(sibling.lastName || "");
      siblingGroup
        .append("text")
        .attr("class", "person-dates")
        .attr("x", 0)
        .attr("dy", "-1.1em")
        .style("text-anchor", "middle")
        .text(sibling.getDisplayDates());
    }
  }
}
