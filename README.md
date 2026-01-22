# Arbre Généalogique Familial

Application web professionnelle et interactive pour visualiser et gérer un arbre généalogique ascendant avec une interface moderne.

## Fonctionnalités

### Visualisation
- Arbre généalogique interactif avec D3.js
- Basculement entre mode horizontal et vertical
- Zoom et navigation fluide
- Affichage de 2 à 6 générations
- Connexions visuelles entre parents et enfants
- Affichage des mariages avec dates

### Interface utilisateur
- Design moderne et responsive
- Mode sombre / clair
- Menu de navigation avec hamburger
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
├── index.html                      # Page principale (109 lignes)
├── README.md                       # Documentation
│
├── admin/                          # Backend PHP
│   ├── api3.php                    # API principale pour les données
│   ├── api4.php                    # API pour les documents
│   ├── api-backup.php              # API de backup
│   ├── config.example.php          # Template de configuration
│   ├── backup-database.html        # Interface de backup
│   ├── gedcom-debug.php            # Débogueur GEDCOM
│   └── mariage_manager.php         # Gestionnaire de mariages
│
├── js/                             # JavaScript modulaire
│   ├── config.js                   # Configuration globale
│   ├── family-member.js            # Classe FamilyMember
│   ├── ui-manager.js               # Gestionnaire d'interface
│   ├── tree-visualizer.js          # Visualisation D3.js
│   ├── family-tree-app.js          # Application principale
│   ├── helpers.js                  # Fonctions utilitaires
│   ├── init.js                     # Initialisation
│   ├── search-engine.js            # Moteur de recherche
│   ├── modal-system.js             # Système de modales
│   ├── person-quick-view.js        # Quick View des personnes
│   ├── menu-loader.js              # Chargeur de menu
│   ├── darkMode.js                 # Mode sombre
│   └── burger.js                   # Menu hamburger
│
├── styles/                         # Feuilles de style CSS
│   ├── family-tree-styles.css      # Styles de l'arbre
│   ├── person-quick-view.css       # Styles Quick View
│   ├── modal-system.css            # Styles des modales
│   └── convertisseur-styles.css    # Styles convertisseur
│
└── menu-navigation.html            # Menu de navigation
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
- **Orientation**: Basculer entre horizontal et vertical

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
- CSS3 (Flexbox, Grid, animations)
- JavaScript ES6+ (architecture modulaire)
- D3.js v7.8.5 (visualisation)
- Font Awesome 6.4.0 (icônes)

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

- **config.js**: Configuration centralisée
- **family-member.js**: Modèle de données pour les membres de la famille
- **ui-manager.js**: Gestion de l'interface utilisateur
- **tree-visualizer.js**: Logique de visualisation D3.js
- **family-tree-app.js**: Orchestration de l'application
- **helpers.js**: Fonctions utilitaires réutilisables
- **init.js**: Point d'entrée de l'application

### Sécurité

- Credentials de base de données non versionnés (.gitignore)
- Fichier `config.example.php` pour template
- Backups SQL exclus du versioning
- Requêtes préparées PDO contre les injections SQL

## Contribution

Ce projet est un projet personnel familial. Les contributions externes ne sont pas acceptées.

## Licence

Usage personnel - Tous droits réservés

## Auteur

Développé avec l'assistance de Claude Sonnet 4.5

---

**© 2026 - Généalogie Durel**

Créé avec ❤️ pour préserver l'histoire familiale
