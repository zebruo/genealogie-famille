# Arbre Généalogique Familial

**Version 2.4**

Application web professionnelle et interactive pour visualiser et gérer un arbre généalogique ascendant avec une interface moderne.

## Fonctionnalités

### Visualisation
- Arbre généalogique interactif avec D3.js
- Nœuds rectangulaires avec bordures colorées (bleu/rose selon sexe)
- Zoom et navigation fluide (limites configurables 0.2x - 3x)
- Affichage de 2 à 6 générations
- Connexions visuelles entre parents et enfants
- Affichage des mariages avec dates (liens pointillés si plusieurs conjoints)
- Affichage des fratries

### Interface utilisateur
- Design moderne et responsive
- Mode sombre / clair
- Menu de navigation avec hamburger (mobile)
- Barre supérieure fixe avec contrôles
- Panneau latéral avec informations détaillées
- Quick View pour les documents
- Recherche universelle avec autocomplétion
- Effets d'animation et survol

### Gestion des données
- Base de données MySQL
- API REST PHP pour les opérations CRUD
- Système de backup automatique de la base de données
- Gestion des documents et fichiers GEDCOM

## Structure du projet

```
genealogie-famille/
├── index.html                      # Page principale - Arbre généalogique
├── add-person.html                 # Formulaire d'ajout/édition de personne
├── gestion-des-lieux.html          # Gestion des lieux
├── gestion_mariages_multiples.html # Gestion des mariages multiples
├── documents-manager.html          # Gestionnaire de documents
├── statistics.html                 # Page de statistiques
├── convertisseur-republicain.html  # Convertisseur calendrier républicain
├── menu-navigation.html            # Menu de navigation principal
├── menu-navigation-users.html      # Menu de navigation utilisateurs
├── .htaccess                       # Configuration Apache
├── README.md                       # Documentation
│
├── admin/                          # Backend PHP
│   ├── api3.php                    # API principale pour les données
│   ├── api4.php                    # API pour les documents
│   ├── api-backup.php              # API de backup
│   ├── config.php                  # Configuration (non versionné)
│   ├── config.example.php          # Template de configuration
│   ├── backup-database.html        # Interface de backup
│   ├── gedcom-debug.php            # Débogueur GEDCOM
│   └── mariage_manager.php         # Gestionnaire de mariages
│
├── js/                             # JavaScript modulaire
│   ├── config.js                   # Configuration globale (dimensions, espacements, zoom)
│   ├── family-member.js            # Classe FamilyMember
│   ├── ui-manager.js               # Gestionnaire d'interface
│   ├── tree-visualizer.js          # Visualisation D3.js (SVG, zoom, centrage)
│   ├── family-tree-app.js          # Application principale (dessin arbre, liens, nœuds)
│   ├── helpers.js                  # Fonctions utilitaires
│   ├── init.js                     # Initialisation et événements
│   ├── search-engine.js            # Moteur de recherche
│   ├── modal-system.js             # Système de modales
│   ├── person-quick-view.js        # Quick View des personnes
│   ├── menu-loader.js              # Chargeur de menu
│   ├── darkMode.js                 # Mode sombre
│   └── burger.js                   # Menu hamburger mobile
│
├── styles/                         # Feuilles de style CSS
│   ├── family-tree-styles.css      # Styles principaux (~3000 lignes)
│   ├── person-quick-view.css       # Styles Quick View
│   ├── modal-system.css            # Styles des modales
│   └── convertisseur-styles.css    # Styles convertisseur
│
└── uploads/                        # Dossier uploads (non versionné)
```

## Installation

### Prérequis

- Serveur web (Apache, Nginx, etc.)
- PHP 7.4 ou supérieur
- MySQL 5.7 ou supérieur
- Navigateur web moderne

### Configuration

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/zebruo/genealogie-famille.git
   cd genealogie-famille
   ```

2. **Configurer la base de données**
   ```bash
   # Créer une base de données MySQL
   mysql -u root -p
   CREATE DATABASE famille_db CHARACTER SET utf8 COLLATE utf8_general_ci;
   ```

3. **Configurer les credentials**
   ```bash
   # Copier le fichier de configuration exemple
   cp admin/config.example.php admin/config.php

   # Éditer admin/config.php avec vos credentials
   nano admin/config.php
   ```

4. **Importer les données**
   - Créer les tables nécessaires dans votre base de données
   - Importer vos données généalogiques

5. **Lancer l'application**
   - Ouvrir `index.html` dans votre navigateur via un serveur web local
   - Ou utiliser l'extension "Live Server" dans VS Code

## Utilisation

### Navigation dans l'arbre

- **Zoom**: Molette de la souris ou pinch sur mobile
- **Pan**: Cliquer-glisser pour déplacer l'arbre
- **Centrer**: Bouton "Centrer" pour recentrer la vue

### Recherche

- Taper dans la barre de recherche pour trouver une personne
- Sélectionner un résultat pour centrer l'arbre sur cette personne
- Autocomplétion en temps réel

### Informations détaillées

- Cliquer sur un nœud pour ouvrir le panneau latéral
- Affichage des dates, lieux, profession, notes
- Accès aux documents associés
- Navigation vers les parents et enfants

### Paramètres

- **Générations**: Choisir le nombre de générations à afficher (2-6)
- **Point de départ**: Définir une personne comme point de départ par défaut
- **Mode sombre**: Basculer entre thème clair et sombre

## Technologies utilisées

### Frontend
- HTML5
- CSS3 (Flexbox, Grid, animations, variables CSS)
- JavaScript ES6+ (architecture modulaire)
- D3.js v7.8.5 (visualisation)
- Font Awesome 6.4.0 (icônes)
- Google Fonts (Poppins, Inter, Lato)

### Backend
- PHP 7.4+
- MySQL 5.7+
- PDO pour les requêtes sécurisées
- API REST

### Outils de développement
- Git pour le versioning
- GitHub pour l'hébergement du code

## Architecture

### Architecture modulaire

Le code JavaScript est organisé en modules séparés pour une meilleure maintenabilité:

- **config.js**: Configuration centralisée (dimensions nœuds, espacements, zoom)
- **family-member.js**: Modèle de données pour les membres de la famille
- **ui-manager.js**: Gestion de l'interface utilisateur et panneau latéral
- **tree-visualizer.js**: Logique de visualisation D3.js (SVG, zoom, calcul bounds)
- **family-tree-app.js**: Orchestration de l'application (dessin arbre, liens, nœuds)
- **helpers.js**: Fonctions utilitaires réutilisables
- **init.js**: Point d'entrée de l'application

### Sécurité

- Credentials de base de données non versionnés (.gitignore)
- Fichier `config.example.php` pour template
- Backups SQL exclus du versioning
- Dossier uploads exclu du versioning
- Requêtes préparées PDO contre les injections SQL

## Historique des versions

- **v2.4** - Consolidation CSS (styles top-bar), nouvelles pages, .htaccess
- **v2.3** - Nettoyage code obsolète, nouvelles pages (add-person, menu-users)
- **v2.2** - Améliorations UI panel et zoom optimal
- **v2.1** - Gaps texte, liens mariage conditionnels, nettoyage
- **v2.0** - Refonte majeure avec rectangles et liens orthogonaux

## Contribution

Ce projet est un projet personnel familial. Les contributions externes ne sont pas acceptées.

## Licence

Usage personnel - Tous droits réservés

## Auteur

Développé avec l'assistance de Claude

---

**© 2026 - Généalogie Durel**

Créé avec soin pour préserver l'histoire familiale