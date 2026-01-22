"use strict";

/**
 * Gestionnaire de l'interface utilisateur
 */
class UIManager {
  constructor(app) {
    this.app = app;
    // Initialiser le moteur de recherche externe
    this.searchEngine = new UniversalSearchEngine(app);
    this.setupElements();
    this.setupEventListeners();
  }

  setupElements() {
    // Initialiser les éléments du moteur de recherche
    this.searchEngine.setupElements();

    // Autres éléments UI
    this.generationSelect = document.getElementById("generationSelect");
    this.toggleSiblings = document.getElementById("toggleSiblings");
    this.toggleMarriageDates = document.getElementById(
      "toggleMarriageDates"
    );
    this.toggleSiblings.checked = this.app.showSiblings;
    this.toggleMarriageDates.checked = this.app.showMarriages;
  }

  setupEventListeners() {
    // Initialiser les événements du moteur de recherche
    this.searchEngine.setupEventListeners();

    // Événements pour les autres contrôles
    this.generationSelect.addEventListener(
      "change",
      this.handleGenerationChange.bind(this)
    );
    document
      .getElementById("toggleOrientationButton")
      .addEventListener("click", () => this.app.toggleOrientation());
    document
      .getElementById("centerViewButton")
      .addEventListener("click", () => this.app.centerView());
    document
      .getElementById("returnToDefaultButton")
      .addEventListener("click", () => this.app.returnToDefault());
    document
      .getElementById("setDefaultButton")
      .addEventListener("click", () => this.app.setDefaultPerson());
    this.toggleSiblings.addEventListener("change", () =>
      this.app.toggleSiblings()
    );
    this.toggleMarriageDates.addEventListener("change", () =>
      this.app.toggleMarriageDates()
    );
    document
      .getElementById("close-panel-button")
      .addEventListener("click", () => this.app.closePanel());
  }

  // MÉTHODES DE RECHERCHE SUPPRIMÉES - maintenant dans SearchEngine externe
  handleGenerationChange(e) {
    var selectedValue = parseInt(e.target.value);
    if (!this.app.isHorizontal && selectedValue > 5) {
      selectedValue = 5;
      e.target.value = "5";
    }
    this.app.maxGenerations = selectedValue;
    if (this.app.currentPersonId) {
      this.app.rebuildTree(this.app.currentPersonId);
      setTimeout(() => this.app.centerView(), 100);
    }
  }
}
