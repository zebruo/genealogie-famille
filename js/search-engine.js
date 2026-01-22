/**
 * Moteur de recherche dynamique universel
 * Compatible avec :
 * - tree-family (arbre généalogique)
 * - add-person (gestion des membres)
 * 
 * Détecte automatiquement le contexte et s'adapte
 */

class UniversalSearchEngine {
  constructor(contextData) {
    // Détecter le contexte (tree-family ou add-person)
    this.context = this.detectContext(contextData);
    this.data = contextData;
    
    // Éléments DOM
    this.searchInput = null;
    this.searchResults = null;
    this.clearSearchButton = null;
    
    // Pour add-person : recherche de relation
    this.relationSearchInput = null;
    this.relationResults = null;
  }

  /**
   * Détecte automatiquement le contexte d'utilisation
   * @param {Object} contextData - Données du contexte (app ou state)
   * @returns {string} 'tree-family' ou 'add-person'
   */
  detectContext(contextData) {
    // Si c'est un objet avec familyDatabase, c'est tree-family
    if (contextData && contextData.familyDatabase) {
      return 'tree-family';
    }
    // Si c'est un objet avec members (array), c'est add-person
    if (contextData && Array.isArray(contextData.members)) {
      return 'add-person';
    }
    // Par défaut, tree-family
    return 'tree-family';
  }

  /**
   * Initialise les éléments DOM selon le contexte
   */
  setupElements() {
    if (this.context === 'tree-family') {
      this.setupTreeFamilyElements();
    } else {
      this.setupAddPersonElements();
    }
  }

  /**
   * Initialise les éléments pour tree-family
   */
  setupTreeFamilyElements() {
    this.searchInput = document.getElementById('searchInput');
    this.searchResults = document.getElementById('searchResults');
    this.clearSearchButton = document.getElementById('clearSearch');
  }

  /**
   * Initialise les éléments pour add-person
   */
  setupAddPersonElements() {
    // Recherche principale
    this.searchInput = document.querySelector('.search-input');
    this.searchResults = document.querySelector('.search-suggestions');
    this.clearSearchButton = document.querySelector('.clear-search');
    
    // Recherche de relation
    this.relationSearchInput = document.querySelector('.relation-search-input');
    this.relationResults = document.querySelector('.relation-search-results');
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    if (this.context === 'tree-family') {
      this.setupTreeFamilyListeners();
    } else {
      this.setupAddPersonListeners();
    }
  }

  /**
   * Configure les listeners pour tree-family
   */
  setupTreeFamilyListeners() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.handleTreeFamilySearch.bind(this));
    }
    
    if (this.clearSearchButton) {
      this.clearSearchButton.addEventListener('click', this.clearSearch.bind(this));
    }
    
    // Fermer en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar')) {
        this.hideResults();
      }
    });
  }

  /**
   * Configure les listeners pour add-person
   */
  setupAddPersonListeners() {
    // Recherche principale
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.handleAddPersonMainSearch.bind(this));
    }
    
    if (this.clearSearchButton) {
      this.clearSearchButton.addEventListener('click', this.clearAddPersonSearch.bind(this));
    }
    
    // Recherche de relation
    if (this.relationSearchInput) {
      this.relationSearchInput.addEventListener('input', this.handleAddPersonRelationSearch.bind(this));
    }
    
    // Fermer en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        this.searchResults?.classList.remove('show');
      }
      if (!e.target.closest('.relation-search-container')) {
        this.relationResults?.classList.remove('show');
      }
    });
  }

  /**
   * Normalise le texte (supprime accents, minuscules, trim)
   * @param {string} text - Texte à normaliser
   * @returns {string} Texte normalisé
   */
  normalizeString(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Gère la recherche pour tree-family
   * @param {Event} e - Événement input
   */
  handleTreeFamilySearch(e) {
    const searchValue = e.target.value.trim();
    const searchBar = document.querySelector('.search-bar');
    
    if (searchBar) {
      searchBar.classList.toggle('has-text', searchValue.length > 0);
    }
    
    if (this.clearSearchButton) {
      this.clearSearchButton.style.display = searchValue.length > 0 ? 'block' : 'none';
    }
    
    clearTimeout(this.data.searchDebounceTimer);
    
    if (searchValue.length < 2) {
      this.hideResults();
      return;
    }
    
    this.data.searchDebounceTimer = setTimeout(() => {
      this.performTreeFamilySearch(searchValue);
    }, 200);
  }

  /**
   * Effectue la recherche pour tree-family avec scoring
   * @param {string} searchTerm - Terme de recherche
   */
  performTreeFamilySearch(searchTerm) {
    const normalizedSearch = this.normalizeString(searchTerm);
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
    
    const scoredResults = Object.values(this.data.familyDatabase || {})
      .map((person) => {
        let score = 0;
        const normalizedFirstNames = this.normalizeString(
          person.firstNames || person.firstName || ''
        );
        const normalizedLastName = this.normalizeString(person.lastName || '');
        const normalizedFullName = normalizedFirstNames + ' ' + normalizedLastName;
        const normalizedBirthPlace = this.normalizeString(person.birthPlace || '');
        const normalizedDeathPlace = this.normalizeString(person.deathPlace || '');
        
        const allWordsMatch = searchWords.every(
          (word) =>
            normalizedFullName.includes(word) ||
            normalizedBirthPlace.includes(word) ||
            normalizedDeathPlace.includes(word)
        );
        
        if (!allWordsMatch) return null;
        
        if (normalizedFullName === normalizedSearch) score += 100;
        if (normalizedFirstNames === normalizedSearch || normalizedLastName === normalizedSearch)
          score += 80;
        if (normalizedFullName.startsWith(normalizedSearch)) score += 60;
        
        searchWords.forEach((word) => {
          if (normalizedFirstNames.includes(word)) score += 20;
          if (normalizedLastName.includes(word)) score += 20;
          if (normalizedBirthPlace.includes(word)) score += 15;
          if (normalizedDeathPlace.includes(word)) score += 10;
        });
        
        return { person, score };
      })
      .filter((result) => result !== null && result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    
    this.displayTreeFamilyResults(scoredResults, searchTerm);
  }

  /**
   * Affiche les résultats pour tree-family
   * @param {Array} results - Résultats avec scores
   * @param {string} searchTerm - Terme de recherche
   */
  displayTreeFamilyResults(results, searchTerm) {
    if (results.length === 0) {
      this.searchResults.innerHTML =
        '<div class="no-results"><i class="fas fa-search"></i> Aucun résultat trouvé</div>';
      this.searchResults.style.display = 'block';
      return;
    }
    
    this.searchResults.style.display = 'block';
    
    const resultsHTML = results.map((item) => {
      const person = item.person;
      const fullName = (person.firstNames || person.firstName) + ' ' + person.lastName;
      const highlightedName = this.highlightText(fullName, searchTerm);
      
      let birthInfo = '';
      if (person.birthDate) {
        const year = person.birthDate.substring(0, 4);
        birthInfo = '° ' + year;
        if (person.birthPlace) {
          birthInfo += ' à ' + this.highlightText(person.birthPlace, searchTerm);
        }
      }
      
      let deathInfo = '';
      if (person.deathDate) {
        const year = person.deathDate.substring(0, 4);
        deathInfo = '✟ ' + year;
        if (person.deathPlace) {
          deathInfo += ' à ' + this.highlightText(person.deathPlace, searchTerm);
        }
      }
      
      return `
        <div class="search-result-item" data-person-id="${person.id}">
          <div class="search-result-name">${highlightedName}</div>
          <div class="search-result-details">
            ${birthInfo ? '<div>' + birthInfo + '</div>' : ''}
            ${deathInfo ? '<div>' + deathInfo + '</div>' : ''}
          </div>
        </div>
      `;
    }).join('');
    
    this.searchResults.innerHTML = resultsHTML;
    
    // Ajouter les event listeners
    this.searchResults.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const personId = parseInt(e.currentTarget.getAttribute('data-person-id'));
        if (this.data.selectPerson) {
          this.data.selectPerson(personId);
        }
      });
    });
  }

  /**
   * Gère la recherche principale pour add-person
   * @param {Event} e - Événement input
   */
  handleAddPersonMainSearch(e) {
    const query = this.normalizeString(e.target.value);
    
    if (!query || query.length < 2) {
      this.data.filteredMembers = this.sortMembers(this.data.members);
      this.searchResults.classList.remove('show');
    } else {
      // Diviser la recherche en mots individuels
      const searchWords = query.split(/\s+/).filter(w => w.length > 0);
      
      this.data.filteredMembers = this.data.members.filter(m => {
        const fullName = this.normalizeString(`${m.firstNames} ${m.lastName}`);
        const birthPlace = this.normalizeString(m.birthPlace || '');
        const deathPlace = this.normalizeString(m.deathPlace || '');
        
        // Tous les mots doivent être trouvés dans au moins un des champs
        return searchWords.every(word => 
          fullName.includes(word) ||
          birthPlace.includes(word) ||
          deathPlace.includes(word)
        );
      });
      
      const suggestions = this.data.filteredMembers.slice(0, 10);
      
      if (suggestions.length > 0) {
        this.searchResults.innerHTML = suggestions.map(m => `
          <div class="suggestion-item" onclick="selectMemberFromSuggestion(${m.id})">
            <div class="suggestion-main">
              ${this.highlightMatch(m.firstNames + ' ' + m.lastName, e.target.value)}
            </div>
            <div class="suggestion-details">
              ${m.birthDate 
                ? `<span>(${m.birthDate}${m.deathDate ? ' - ' + m.deathDate : ''})</span>` 
                : ''}
              ${m.birthPlace ? `<span>${m.birthPlace}</span>` : ''}
            </div>
          </div>
        `).join('');
        this.searchResults.classList.add('show');
      } else {
        this.searchResults.innerHTML = '<div class="suggestion-item">Aucun résultat</div>';
        this.searchResults.classList.add('show');
      }
    }
    
    this.data.currentPage = 1;
    
    // Appeler les fonctions de rendu si elles existent
    if (typeof window.renderTable === 'function') {
      window.renderTable();
    }
    if (typeof window.renderPagination === 'function') {
      window.renderPagination();
    }
  }

  /**
   * Gère la recherche de relation pour add-person
   * @param {Event} e - Événement input
   */
  handleAddPersonRelationSearch(e) {
    const query = this.normalizeString(e.target.value);
    
    if (query.length < 2) {
      this.relationResults.classList.remove('show');
      return;
    }
    
    // Diviser la recherche en mots individuels
    const searchWords = query.split(/\s+/).filter(w => w.length > 0);
    
    const filtered = this.data.members.filter(m => {
      const fullName = this.normalizeString(`${m.firstNames} ${m.lastName}`);
      
      // Tous les mots doivent être trouvés dans le nom complet
      const matchesSearch = searchWords.every(word => fullName.includes(word));
      
      // Exclure le membre en édition
      const notEditingMember = !this.data.editingMember || m.id !== this.data.editingMember.id;
      
      return matchesSearch && notEditingMember;
    });
    
    if (filtered.length > 0) {
      this.relationResults.innerHTML = filtered.slice(0, 10).map(m => `
        <div class="suggestion-item" onclick="selectRelation(${m.id})">
          <div class="suggestion-main">
            ${this.highlightMatch(m.firstNames + ' ' + m.lastName, e.target.value)}
          </div>
          <div class="suggestion-details">
            ${m.birthDate 
              ? `<span>(${m.birthDate}${m.deathDate ? ' - ' + m.deathDate : ''})</span>` 
              : ''}
            ${m.birthPlace ? `<span>${m.birthPlace}</span>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      this.relationResults.innerHTML = '<div class="suggestion-item">Aucun résultat</div>';
    }
    
    this.relationResults.classList.add('show');
  }

  /**
   * Met en surbrillance pour tree-family
   * @param {string} text - Texte à traiter
   * @param {string} searchTerm - Terme recherché
   * @returns {string} HTML avec surbrillance
   */
  highlightText(text, searchTerm) {
    if (!text) return '';
    if (!searchTerm || searchTerm.trim() === '') return text;
    
    const normalizedSearch = this.normalizeString(searchTerm.trim());
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
    let result = text;
    
    searchWords.forEach((word) => {
      let lastIndex = 0;
      let tempResult = '';
      const normalizedResult = this.normalizeString(result);
      let insideTag = false;
      
      for (let i = 0; i < result.length; i++) {
        if (result[i] === '<') {
          insideTag = true;
        }
        if (result[i] === '>') {
          insideTag = false;
          tempResult += result.substring(lastIndex, i + 1);
          lastIndex = i + 1;
          continue;
        }
        if (insideTag) continue;
        
        if (normalizedResult.substr(i, word.length) === word && !insideTag) {
          tempResult += result.substring(lastIndex, i);
          const matchedText = result.substr(i, word.length);
          tempResult += '<span class="search-highlight">' + matchedText + '</span>';
          lastIndex = i + word.length;
          i += word.length - 1;
        }
      }
      tempResult += result.substring(lastIndex);
      if (tempResult !== result) result = tempResult;
    });
    
    return result;
  }

  /**
   * Met en surbrillance pour add-person (supporte multi-mots)
   * Utilise la même logique éprouvée que highlightText
   * @param {string} text - Texte à traiter
   * @param {string} query - Terme recherché
   * @returns {string} HTML avec surbrillance
   */
  highlightMatch(text, query) {
    if (!query || !text) return text;
    
    const searchWords = this.normalizeString(query).split(/\s+/).filter(w => w.length > 0);
    let result = text;
    
    searchWords.forEach(word => {
      let lastIndex = 0;
      let tempResult = '';
      const normalizedResult = this.normalizeString(result);
      let insideTag = false;
      
      for (let i = 0; i < result.length; i++) {
        // Détecter si on est dans une balise HTML
        if (result[i] === '<') {
          insideTag = true;
        }
        if (result[i] === '>') {
          insideTag = false;
          tempResult += result.substring(lastIndex, i + 1);
          lastIndex = i + 1;
          continue;
        }
        
        // Ne pas highlighter si on est dans une balise
        if (insideTag) continue;
        
        // Vérifier si on a une correspondance
        if (normalizedResult.substr(i, word.length) === word && !insideTag) {
          tempResult += result.substring(lastIndex, i);
          const matchedText = result.substr(i, word.length);
          tempResult += '<span class="suggestion-highlight">' + matchedText + '</span>';
          lastIndex = i + word.length;
          i += word.length - 1;
        }
      }
      
      tempResult += result.substring(lastIndex);
      if (tempResult !== result) {
        result = tempResult;
      }
    });
    
    return result;
  }

  /**
   * Efface la recherche
   */
  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    if (this.clearSearchButton) {
      this.clearSearchButton.style.display = 'none';
    }
    this.hideResults();
    
    if (this.context === 'tree-family') {
      const searchBar = document.querySelector('.search-bar');
      if (searchBar) {
        searchBar.classList.remove('has-text');
      }
    }
  }

  /**
   * Efface la recherche add-person
   */
  clearAddPersonSearch() {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    if (this.searchResults) {
      this.searchResults.classList.remove('show');
    }
    this.data.filteredMembers = this.sortMembers(this.data.members);
    this.data.currentPage = 1;
    
    if (typeof window.renderTable === 'function') {
      window.renderTable();
    }
    if (typeof window.renderPagination === 'function') {
      window.renderPagination();
    }
  }

  /**
   * Masque les résultats
   */
  hideResults() {
    if (this.searchResults) {
      this.searchResults.style.display = 'none';
      this.searchResults.innerHTML = '';
    }
  }

  /**
   * Trie les membres par nom (pour add-person)
   * @param {Array} members - Tableau des membres
   * @returns {Array} Membres triés
   */
  sortMembers(members) {
    return [...members].sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstNames}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstNames}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalSearchEngine;
}

// Rétrocompatibilité avec les anciens noms
if (typeof window !== 'undefined') {
  window.SearchEngine = UniversalSearchEngine;
  window.AddPersonSearchEngine = UniversalSearchEngine;
}