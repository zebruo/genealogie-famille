"use strict";

/**
 * Classe représentant un membre de la famille
 */
class FamilyMember {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName || "";
    this.firstNames = data.firstNames || "";
    this.lastName = data.lastName || "";
    this.birthDate = data.birthDate || "";
    this.fullBirthDate = data.fullBirthDate || data.birthDate || "";
    this.deathDate = data.deathDate || null;
    this.fullDeathDate = data.fullDeathDate || data.deathDate || "";
    this.birthPlace = data.birthPlace || "";
    this.deathPlace = data.deathPlace || "";
    this.sex = data.sex || "U";
    this.parents = [];
    this.siblings = [];
    this.parentIds = data.parentIds || [];
    this.siblingIds = data.siblingIds || [];
    this.depth = 0;
    this.spouseIds = data.spouseIds || [];
    this.marriages = data.marriages || {};
    this.occupation = data.occupation || "";
    this.notes = data.notes || "";
  }

  getDisplayName() {
    return (this.firstName + " " + this.lastName).trim();
  }

  getFirstNameWithInitials() {
    if (!this.firstNames) return this.firstName || "";

    var names = this.firstNames.split(' ').filter(n => n.trim() !== '');
    if (names.length <= 1) return this.firstNames;

    // Premier prénom en entier, les autres en initiales
    var result = names[0];
    for (var i = 1; i < names.length; i++) {
      result += ' ' + names[i].charAt(0).toUpperCase() + '.';
    }
    return result;
  }

  getDisplayDates() {
    if (!this.birthDate && !this.deathDate) return '';
    const birthYear = this.birthDate?.length > 4 ?
      this.birthDate.substring(0, 4) :
      this.birthDate;
    const deathYear = this.deathDate?.length > 4 ?
      this.deathDate.substring(0, 4) :
      this.deathDate;
    let result = '';
    const isDeceased = deathYear && deathYear !== '' && deathYear !== '0000' && deathYear !== '0';
    if (birthYear && !isDeceased) {
      const neLabel = this.sex === 'F' ? 'née en' : 'né en';
      result = neLabel + ' ' + birthYear;
    } else if (birthYear && isDeceased) {
      result = birthYear + ' - ' + deathYear;
    } else if (isDeceased) {
      result = '-' + deathYear;
    }
    return result;
  }
}

/**
 * Fonction utilitaire pour obtenir les prénoms avec initiales
 */
function getFirstNameWithInitials(person) {
  var firstNames = person.firstNames || person.firstName || "";
  if (!firstNames) return "";

  var names = firstNames.split(' ').filter(n => n.trim() !== '');
  if (names.length <= 1) return firstNames;

  // Premier prénom en entier, les autres en initiales
  var result = names[0];
  for (var i = 1; i < names.length; i++) {
    result += ' ' + names[i].charAt(0).toUpperCase() + '.';
  }
  return result;
}
