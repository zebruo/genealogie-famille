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
    this.maxGenerations = 6;
    this.currentPersonId = null;
    this.searchDebounceTimer = null;
  }
  init() {
    var loader = document.getElementById("loader");
    loader.style.display = "flex";
    var self = this;
    // Flag pour savoir si un nœud a été cliqué (évite la fermeture du panneau)
    this.nodeClickedFlag = false;

    // Ajouter un gestionnaire de clic pour fermer le panneau
    document.addEventListener("click", function(e) {
      var personPanel = document.getElementById("person-panel");
      var rootTab = document.querySelector(".root-tab");
      if (personPanel.classList.contains("is-open")) {
        // Ne pas fermer si clic sur le panneau, le root-tab, un nœud, ou si un nœud vient d'être cliqué
        if (!personPanel.contains(e.target) &&
          !rootTab.contains(e.target) &&
          !e.target.closest(".node") &&
          !self.nodeClickedFlag) {
          self.closePanel();
        }
      }
      // Réinitialiser le flag après chaque clic
      self.nodeClickedFlag = false;
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

    // Vérifier si le panneau était ouvert AVANT de reconstruire l'arbre
    var personPanel = document.getElementById("person-panel");
    var wasOpen = personPanel && personPanel.classList.contains("is-open");

    this.rebuildTree(personId);

    // CORRECTION : Toujours utiliser familyDatabase pour avoir TOUTES les données
    var person = this.familyDatabase[personId];
    if (person) {
      var rootTabName = document.getElementById("rootTabName");
      if (rootTabName) {
        rootTabName.textContent = person.firstNames + " " + person.lastName;
      }
      // Si le panneau était ouvert, le garder ouvert et mettre à jour
      if (wasOpen) {
        this.displayPersonInfo(person);
        personPanel.classList.add("is-open");
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
  centerView() {
    if (this.visualizer.zoom && this.visualizer.lastOptimalTransform) {
      // Réutiliser le transform optimal stocké pour éviter les changements de taille
      d3.select("#tree-container svg")
        .transition()
        .duration(CONFIG.transitionDuration)
        .call(this.visualizer.zoom.transform, this.visualizer.lastOptimalTransform);
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
      '<div class="panel-header-left">' +
        '<h3>' + person.firstNames + ' ' + person.lastName + '</h3>' +
        '<button class="quick-view-btn" id="qv-btn-' + person.id + '" data-person-id="' + person.id + '" onclick="openPersonQuickView(' + person.id + ')">' +
          '<i class="fas fa-folder-open"></i> ' +
          '<span class="doc-clip-container"></span>' +
          '<span class="qv-label">' + initialTitle + '</span>' +
        '</button>' +
      '</div>' +
      '<button id="close-panel-button" class="close-panel-button">' +
        '<i class="fas fa-times"></i>' +
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

    var svg = d3.select("#tree-container svg");
    var g;

    // Réutiliser le SVG existant ou en créer un nouveau
    if (svg.empty()) {
      var container = document.getElementById("tree-container");
      container.innerHTML = "";
      svg = this.visualizer.createSVG();
      g = svg.append("g");
      this.visualizer.zoom = this.visualizer.setupZoom(svg, g);
    } else {
      // SVG existe déjà, on vide juste le groupe (comme test.html)
      g = svg.select("g");
      g.selectAll("*").remove();
    }
    var self = this;

    // Ajuster l'espacement horizontal si beaucoup de générations
    var hGap = this.maxGenerations > 4
      ? CONFIG.tree.horizontalSpacing * 0.8
      : CONFIG.tree.horizontalSpacing;

    // Layout avec nodeSize (comme test.html)
    var treemap = d3
      .tree()
      .nodeSize([hGap, CONFIG.tree.verticalSpacing])
      .separation(function(a, b) {
        var aSize = 1 + (self.showSiblings && a.data.siblings ? a.data.siblings.length : 0);
        var bSize = 1 + (self.showSiblings && b.data.siblings ? b.data.siblings.length : 0);
        return a.parent === b.parent
          ? Math.max(1.6, (aSize + bSize) / 1.2)
          : Math.max(2.0, (aSize + bSize) / 1.2);
      });

    var rootNode = d3.hierarchy(this.familyTree, function(d) {
      return d.parents;
    });
    var treeData = treemap(rootNode);

    // Appliquer Y négatif pour l'ascendance (comme test.html)
    var nodes = treeData.descendants();
    nodes.forEach(function(node) {
      node.y = -node.depth * CONFIG.tree.verticalSpacing;
    });

    // Dessiner d'abord tous les liens (arrière-plan)
    this.drawTreeLinks(g, treeData);
    //this.visualizer.drawMarriageLinks(g, nodes);                  à supprimer

    // Dessiner les fratries avant les nœuds principaux
    if (this.showSiblings) {
      this.drawSiblings(g, nodes);
    }

    // Dessiner les nœuds EN DERNIER pour qu'ils soient au-dessus de tous les liens
    this.drawTreeNodes(g, treeData);

    // Centrer la vue
    requestAnimationFrame(function() {
      setTimeout(function() {
        var finalTransform = self.visualizer.calculateOptimalTransform(nodes);
        svg.call(self.visualizer.zoom.transform, finalTransform);
      }, 150);
    });
  }
  drawTreeLinks(g, treeData) {
    var self = this;
    var links = treeData.links();
    var h = CONFIG.node.height;

    // Liens orthogonaux : source (enfant) vers target (ancêtre au-dessus)
    links.forEach(function(link) {
      var source = link.source;  // Personne (Y plus proche de 0)
      var target = link.target;  // Ancêtre (Y négatif, au-dessus)
      var bendY = (source.y + target.y) / 2;

      g.append("path")
        .attr("class", "link")
        .attr("d",
          "M " + source.x + " " + (source.y - h / 2) +
          " V " + bendY +
          " H " + target.x +
          " V " + (target.y + h / 2)
        );

      // Date de mariage des ancêtres (au centre de la barre horizontale entre les 2 parents)
      if (self.showMarriages && source.children && source.children.length === 2 && target === source.children[1]) {
        var parent1 = source.children[0];
        var parent2 = source.children[1];
        var midX = (parent1.x + parent2.x) / 2;

        // Chercher la date de mariage dans la base de données
        var marriageYear = "?";
        var parent1Data = self.familyDatabase[parent1.data.id];
        if (parent1Data && parent1Data.marriages && parent1Data.marriages[parent2.data.id]) {
          var marriageData = parent1Data.marriages[parent2.data.id];
          marriageYear = marriageData.marriageYear || marriageData.date || "?";
        }

        g.append("text")
          .attr("class", "marriage-date")
          .attr("x", midX)
          .attr("y", bendY - 5)
          .attr("text-anchor", "middle")
          .text("× " + marriageYear);
      }
    });
  }
  drawTreeNodes(g, treeData) {
    var self = this;
    var nodes = treeData.descendants();
    var rootNode = nodes[0];

    // Dessiner tous les nœuds sauf la racine (rectangles)
    nodes.slice(1).forEach(function(d) {
      self.drawNode(g, d.x, d.y, d.data, false, null);
    });

    // Dessiner la famille racine (conjoints, enfants, fratries)
    this.drawRootFamily(g, rootNode);

    // Re-dessiner le nœud racine en dernier pour qu'il soit au-dessus de tous les liens
    this.drawNode(g, rootNode.x, rootNode.y, rootNode.data, true);
  }
  drawRootFamily(g, rootNode) {
    var self = this;
    var h = CONFIG.node.height;
    var w = CONFIG.node.width;
    var bendHeight = CONFIG.tree.bendHeight;

    // === 1. FRATRIES DE LA RACINE (à gauche, liées par le HAUT) ===
    var siblings = rootNode.data.siblings || [];
    if (siblings.length > 0) {
      var topY = rootNode.y - h / 2;
      var linkY = topY - bendHeight;

      siblings.forEach(function(sibling, index) {
        var siblingX = rootNode.x - CONFIG.sibling.spacing * (index + 1);
        var siblingY = rootNode.y;

        // Lien par le HAUT : horizontal puis descend vers fratrie
        g.append("path")
          .attr("class", "sibling-link")
          .attr("d",
            "M " + rootNode.x + " " + linkY +
            " H " + siblingX +
            " V " + topY
          );

        self.drawNode(g, siblingX, siblingY, sibling, false, null);
      });
    }

    // === 2. MARIAGES ET ENFANTS ===
    var marriages = this.familyDatabase[rootNode.data.id] &&
      this.familyDatabase[rootNode.data.id].marriages ?
      this.familyDatabase[rootNode.data.id].marriages : {};

    var sortedMarriages = Object.entries(marriages).sort(function(a, b) {
      var yearA = parseInt(a[1].marriageYear || a[1].date) || 9999;
      var yearB = parseInt(b[1].marriageYear || b[1].date) || 9999;
      return yearA - yearB;
    });

    var spouseX = rootNode.x + CONFIG.spouse.spacing;

    sortedMarriages.forEach(function(item, index) {
      var spouseId = item[0];
      var spouseData = self.familyDatabase[spouseId];
      if (!spouseData) return;

      var currentSpouseX = spouseX + index * CONFIG.spouse.spacing;
      var prevX = index === 0 ? rootNode.x : currentSpouseX - CONFIG.spouse.spacing;

      // Lien mariage - du bord droit au bord gauche
      // Pointillés si plusieurs conjoints, trait plein sinon
      var linkStartX = prevX + w / 2;
      var linkEndX = currentSpouseX - w / 2;
      var marriageLinkClass = sortedMarriages.length > 1 ? "marriage-link-multiple" : "marriage-link";
      g.append("path")
        .attr("class", marriageLinkClass)
        .attr("d",
          "M " + linkStartX + " " + rootNode.y +
          " H " + linkEndX
        );

      // Date de mariage (au centre du lien)
      if (self.showMarriages) {
        var marriageData = item[1];
        var marriageYear = marriageData.marriageYear || marriageData.date || "?";
        var midX = (linkStartX + linkEndX) / 2;
        g.append("text")
          .attr("class", "marriage-date")
          .attr("x", midX)
          .attr("y", rootNode.y - 5)
          .attr("text-anchor", "middle")
          .text("× " + marriageYear);
      }

      // Numéro de mariage si plusieurs
      if (sortedMarriages.length > 1) {
        g.append("text")
          .attr("class", "marriage-number")
          .attr("x", currentSpouseX)
          .attr("y", rootNode.y + h / 2 + 16)
          .attr("text-anchor", "middle")
          .text(index + 1);
      }

      // Dessiner le conjoint
      self.drawNode(g, currentSpouseX, rootNode.y, spouseData, false, null);

      // === ENFANTS ===
      var marriageChildren = self.getMarriageChildren(rootNode.data.id, spouseId);
      if (marriageChildren.length > 0) {
        var childY = rootNode.y + CONFIG.children.descent;
        // Centre entre le parent précédent et le conjoint actuel
        var midX = (prevX + w / 2 + linkEndX) / 2;
        var topChildY = childY - h / 2;
        var horizontalY = topChildY - bendHeight;

        // Lien vertical du centre des parents vers la ligne horizontale
        g.append("path")
          .attr("class", "child-link")
          .attr("d",
            "M " + midX + " " + rootNode.y +
            " V " + horizontalY
          );

        // Calcul des positions des enfants
        var childSpacing = CONFIG.node.width + CONFIG.children.spacing;

        // Dessiner chaque enfant avec son lien
        marriageChildren.forEach(function(child, childIndex) {
          var childX;
          if (index === 0) {
            // Premier mariage : enfants vers la GAUCHE (de droite à gauche)
            childX = midX - childIndex * childSpacing;
          } else {
            // Mariages suivants : enfants vers la DROITE (de gauche à droite)
            childX = midX + childIndex * childSpacing;
          }

          // Lien : horizontal depuis midX puis vertical vers l'enfant
          g.append("path")
            .attr("class", "child-link")
            .attr("d",
              "M " + midX + " " + horizontalY +
              " H " + childX +
              " V " + topChildY
            );

          self.drawNode(g, childX, childY, child, false, null);
        });
      }
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
  drawSiblings(g, nodes) {
    var self = this;
    var h = CONFIG.node.height;
    var bendHeight = CONFIG.tree.bendHeight;

    // Dessiner les fratries des ancêtres (pas la racine - gérée par drawRootFamily)
    nodes.forEach(function(person) {
      if (person === nodes[0]) return;  // Skip root
      var siblings = person.data.siblings;
      if (!siblings || !siblings.length) return;

      siblings.forEach(function(sibling, index) {
        // Alterner gauche/droite : pair = gauche, impair = droite
        var isLeft = index % 2 === 0;
        var offset = Math.floor(index / 2) + 1;  // 1, 1, 2, 2, 3, 3...
        var direction = isLeft ? -1 : 1;
        var siblingX = person.x + direction * CONFIG.sibling.spacing * offset;
        var siblingY = person.y;

        // Lien par le HAUT : du haut de l'ancêtre, monte, va à gauche/droite, puis descend vers fratrie
        var topY = person.y - h / 2;
        var linkY = topY - bendHeight;

        g.append("path")
          .attr("class", "sibling-link")
          .attr("d",
            "M " + person.x + " " + linkY +
            " H " + siblingX +
            " V " + topY
          );

        // Dessiner le nœud fratrie
        self.drawNode(g, siblingX, siblingY, sibling, false, null);
      });
    });
  }

  /**
   * Dessine un nœud rectangle avec texte (nouvelle structure)
   * @param {d3.Selection} g - Groupe SVG parent
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {Object} person - Données de la personne
   * @param {boolean} isRoot - Est-ce le nœud racine
   * @param {string} strokeColor - Couleur de bordure optionnelle
   * @returns {d3.Selection} Le groupe du nœud créé
   */
  drawNode(g, x, y, person, isRoot, strokeColor) {
    var self = this;
    var nodeG = g.append("g")
      .attr("class", "node" + (isRoot ? " root-node" : ""))
      .attr("transform", "translate(" + x + "," + y + ")")
      .style("cursor", "pointer")
      .on("click", function() {
        self.nodeClickedFlag = true;  // Empêcher la fermeture du panneau
        self.selectPerson(person.id);
      });

    // Classe de sexe pour la couleur de bordure
    var sexClass = person.sex === 'M' ? 'male' : (person.sex === 'F' ? 'female' : 'unknown');

    // Rectangle du nœud avec coins arrondis
    nodeG.append("rect")
      .attr("x", -CONFIG.node.width / 2)
      .attr("y", -CONFIG.node.height / 2)
      .attr("width", CONFIG.node.width)
      .attr("height", CONFIG.node.height)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("class", sexClass)
      .style("stroke", strokeColor || null);

    // Ajouter le texte
    this.addNodeText(nodeG, person);

    return nodeG;
  }

  /**
   * Ajoute le texte multi-ligne dans un nœud rectangle
   * @param {d3.Selection} nodeG - Groupe du nœud
   * @param {Object} person - Données de la personne
   */
  addNodeText(nodeG, person) {
    var maxWidth = CONFIG.node.width - 10;  // Marge de 5px de chaque côté

    // Fonction pour tronquer le texte
    function truncateText(text, maxW) {
      if (!text) return "";
      var temp = nodeG.append("text").style("visibility", "hidden").text(text);
      var textWidth = temp.node().getComputedTextLength();
      temp.remove();

      if (textWidth <= maxW) return text;

      var truncated = text;
      while (truncated.length > 0) {
        truncated = truncated.slice(0, -1);
        temp = nodeG.append("text").style("visibility", "hidden").text(truncated + "…");
        textWidth = temp.node().getComputedTextLength();
        temp.remove();
        if (textWidth <= maxW) return truncated + "…";
      }
      return "…";
    }

    // Construire les lignes avec gaps
    var lines = [];
    var lineHeight = 15;
    var gapAfterFirstnames = 6;  // Gap entre prénoms et nom
    var gapAfterLastname = 8;    // Gap entre nom et dates

    // Prénoms - chaque prénom sur sa propre ligne
    var firstNames = person.firstNames || person.firstName || "";
    if (firstNames) {
      var prenoms = firstNames.trim().split(/\s+/);
      prenoms.forEach(function(prenom, index) {
        lines.push({
          text: truncateText(prenom, maxWidth),
          class: "node-text-firstname",
          extraGap: (index === prenoms.length - 1) ? gapAfterFirstnames : 0
        });
      });
    }

    // Nom de famille
    var lastName = person.lastName || "";
    if (lastName) {
      lines.push({
        text: truncateText(lastName.toUpperCase(), maxWidth),
        class: "node-text-lastname",
        extraGap: gapAfterLastname
      });
    }

    // Dates avec "né en" / "née en" selon le sexe
    var birthYear = "";
    var deathYear = "";
    if (person.birthDate) {
      birthYear = person.birthDate.length > 4 ? person.birthDate.substring(0, 4) : person.birthDate;
    }
    if (person.deathDate) {
      deathYear = person.deathDate.length > 4 ? person.deathDate.substring(0, 4) : person.deathDate;
    }

    var datesText = "";
    if (birthYear && deathYear) {
      datesText = birthYear + " - " + deathYear;
    } else if (birthYear) {
      var bornText = (person.sex === 'F') ? "née en " : "né en ";
      datesText = bornText + birthYear;
    } else if (deathYear) {
      datesText = CONFIG.symbols.death + " " + deathYear;
    }

    if (datesText) {
      lines.push({ text: datesText, class: "node-text-dates", extraGap: 0 });
    }

    // Calculer la hauteur totale avec les gaps
    var totalHeight = 0;
    lines.forEach(function(line) {
      totalHeight += lineHeight + (line.extraGap || 0);
    });
    var startY = -totalHeight / 2 + lineHeight / 2;

    // Créer l'élément texte avec tspans
    var textElem = nodeG.append("text")
      .attr("class", "node-text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle");

    var currentY = startY;
    lines.forEach(function(line, i) {
      textElem.append("tspan")
        .attr("x", 0)
        .attr("y", currentY)
        .attr("class", line.class)
        .text(line.text);
      currentY += lineHeight + (line.extraGap || 0);
    });
  }
}
