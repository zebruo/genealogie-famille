# Arbre Généalogique Familial

**Version 1.0**

Application web professionnelle et interactive pour visualiser et gérer un arbre généalogique ascendant avec une interface moderne. Accès sécurisé par rôles (administrateur / visiteur).

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
- Recherche universelle avec autocomplétion et insensibilité aux accents
- Effets d'animation et survol

### Authentification et rôles
- Deux accès par mot de passe : **administrateur** et **visiteur**
- Rôle **administrateur** : lecture + écriture + validation des liens ARK
- Rôle **visiteur** : lecture seule (éléments admin masqués via `readonly.css`)
- Mots de passe hashés bcrypt, session PHP avec cookie HttpOnly

### Gestion des données
- Base de données MySQL
- API REST PHP pour les opérations CRUD
- Système de backup de la base de données (SQL, JSON, CSV, GEDCOM)
- Gestion des documents et fichiers GEDCOM
- Table `liens_verification` pour la validation des permaliens ARK

### Pages
- **Arbre généalogique** — visualisation interactive
- **Ajouter/éditer une personne** — formulaire complet
- **Gestion des lieux** — lieux associés aux membres
- **Gestion des unions** — mariages multiples
- **Gestionnaire de documents** — notes, PDFs, photos
- **Statistiques** — analyse de la généalogie
- **Permaliens** — consultation et validation des liens ARK (admin : édition + validation)
- **Backup** — sauvegarde et restauration de la base de données
- **Aide** — documentation utilisateur
- **Histoires & Anecdotes** — récits familiaux *(non implémenté)*
- **Convertisseur républicain** — conversion de dates

## Structure du projet

```
genealogie-famille/
├── index.html                      # Page principale - Arbre généalogique
├── add-person.html                 # Formulaire d'ajout/édition de personne
├── aide.html                       # Page d'aide utilisateur
├── backup-database.html            # Interface de backup base de données
├── convertisseur-republicain.html  # Convertisseur calendrier républicain
├── documents-manager.html          # Gestionnaire de documents
├── gestion-des-lieux.html          # Gestion des lieux
├── gestion_mariages_multiples.html # Gestion des unions multiples
├── histoires.html                  # Récits et histoires familiales
├── liens-documents.html            # Permaliens ARK (lecture/validation)
├── login.html                      # Page de connexion
├── menu-navigation.html            # Menu navigation (admin)
├── menu-navigation-users.html      # Menu navigation (tous rôles)
├── statistics.html                 # Page de statistiques
├── .htaccess                       # Configuration Apache
├── README.md                       # Documentation
│
├── admin/                          # Backend PHP
│   ├── api3.php                    # API principale pour les données
│   ├── api4.php                    # API pour les documents
│   ├── api-backup.php              # API de backup (non versionné)
│   ├── api-liens.php               # API gestion des permaliens et vérification
│   ├── auth.php                    # Fonctions d'authentification et rôles
│   ├── login.php                   # Endpoint de connexion/déconnexion
│   ├── config.php                  # Configuration credentials (non versionné)
│   ├── config_serv.php             # Configuration serveur production (non versionné)
│   ├── config.example.php          # Template de configuration
│   ├── famille_db.sql              # Structure de la base de données
│   ├── mariage_manager.php         # Gestionnaire de mariages
│   └── .htaccess                   # Protection du dossier admin
│
├── js/                             # JavaScript modulaire
│   ├── auth.js                     # Gestion des rôles côté client
│   ├── burger.js                   # Menu hamburger mobile
│   ├── config.js                   # Configuration globale (dimensions, zoom)
│   ├── darkMode.js                 # Mode sombre/clair
│   ├── family-member.js            # Classe FamilyMember
│   ├── family-tree-app.js          # Application principale (arbre, liens, nœuds)
│   ├── helpers.js                  # Fonctions utilitaires
│   ├── init.js                     # Initialisation et événements
│   ├── menu-loader.js              # Chargeur de menu dynamique
│   ├── modal-system.js             # Système de modales (alert, confirm)
│   ├── person-quick-view.js        # Quick View des personnes
│   ├── photo-modal.js              # Modal photos
│   ├── search-engine.js            # Moteur de recherche
│   ├── tree-visualizer.js          # Visualisation D3.js (SVG, zoom)
│   └── ui-manager.js               # Gestionnaire d'interface
│
├── styles/                         # Feuilles de style CSS
│   ├── family-tree-styles.css      # Styles principaux et système de badges
│   ├── convertisseur-styles.css    # Styles convertisseur républicain
│   ├── modal-system.css            # Styles des modales
│   ├── person-quick-view.css       # Styles Quick View
│   └── readonly.css                # Masquage des éléments admin pour les visiteurs
│
└── uploads/                        # Dossier uploads (non versionné)
```

## Installation

### Prérequis

- Serveur web avec PHP en module (Apache recommandé — WampServer, XAMPP...)
- PHP 8.2 ou supérieur (testé en 8.4)
- MySQL 8.0 ou supérieur (ou MariaDB 10.6 ou supérieur)
- Navigateur web moderne

### Configuration

1. **Télécharger la release**
   - Aller sur [github.com/zebruo/genealogie-famille/releases/latest](https://github.com/zebruo/genealogie-famille/releases/latest)
   - Télécharger l'archive ZIP, l'extraire et renommer le dossier obtenu en `genealogie-famille`

2. **Rendre le projet accessible via le serveur web**

   **Option A — Dossier public** : copier le dossier du projet dans le répertoire public du serveur (`htdocs`, `www`, `public_html`...). Le projet sera accessible à `http://localhost/genealogie-famille/`.

   **Option B — Virtual host** : déclarer un vhost dans `httpd-vhosts.conf` pointant vers le dossier du projet. Le projet sera accessible à `http://genealogie-famille/`.

3. **Créer la base de données et importer le schéma**
   - Ouvrir phpMyAdmin (ex. `http://localhost/phpmyadmin` avec WampServer, ou autre selon votre environnement)
   - Onglet **Bases de données** → créer `famille_db` (interclassement `utf8mb4_unicode_ci`)
   - Sélectionner la base `famille_db` → onglet **Importer** → importer le modèle `famille_db.sql` situé dans le dossier `admin` → **Exécuter**

4. **Configurer les credentials**
   - Renommer `admin/config.example.php` en `admin/config.php` (contient un mot de passe temporaire `admin`) et renseigner les informations de connexion à la base de données (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`)
   - Accéder à `http://genealogie-famille/login.html` et se connecter avec le mot de passe temporaire **`admin`** (valable pour les deux comptes)
   - Ouvrir `http://genealogie-famille/admin/generate-password.php` — l'outil est maintenant accessible
   - Saisir les vrais mots de passe (un pour le visiteur, un pour l'admin) → l'outil génère les deux hashs bcrypt
   - Copier le snippet affiché et le coller dans `config.php` en remplaçant les hashs temporaires
   - Se déconnecter et se reconnecter avec les vrais mots de passe — l'installation est terminée
   - ⚠️ Le mot de passe `admin` par défaut doit impérativement être remplacé avant toute mise en production

5. **Lancer l'application**
   - Accéder à `http://genealogie-famille/login.html` pour s'authentifier

> **Fonctionnalité optionnelle non incluse** : `backup-database.html` nécessite `admin/api-backup.php`, volontairement absent du dépôt public pour raisons de sécurité. Sans ce fichier, la page affiche simplement un message d'indisponibilité.

## Utilisation

### Navigation dans l'arbre

- **Zoom** : molette de la souris ou pinch sur mobile
- **Pan** : cliquer-glisser pour déplacer l'arbre
- **Centrer** : bouton "Centrer" pour recentrer la vue

### Recherche

- Taper dans la barre de recherche pour trouver une personne
- Insensible aux accents, recherche multi-mots
- Sélectionner un résultat pour centrer l'arbre sur cette personne

### Informations détaillées

- Cliquer sur un nœud pour ouvrir le panneau latéral
- Affichage des dates, lieux, profession, notes
- Accès aux documents associés
- Navigation vers les parents et enfants
- Enfants listés avec accès direct à leur fiche *(non implémenté)*

### Permaliens (liens ARK)

- Page accessible à tous les utilisateurs connectés
- Les administrateurs peuvent éditer les liens (double-clic) et les valider (bouton ✓)
- La date de validation est visible directement dans le tableau

## Technologies utilisées

### Frontend
- HTML5, CSS3 (Flexbox, Grid, variables CSS)
- JavaScript ES6+ (architecture modulaire)
- D3.js v7.8.5 (visualisation)
- Font Awesome 6.4.0 (icônes)

### Backend
- PHP 7.4+
- MySQL 5.7+ / MariaDB
- PDO pour les requêtes sécurisées
- API REST, sessions PHP

## Sécurité

- Credentials de base de données non versionnés (`.gitignore`)
- Mots de passe hashés avec `password_hash()` (bcrypt)
- Sessions PHP avec cookie HttpOnly/SameSite
- Requêtes préparées PDO contre les injections SQL
- Dossier `admin/` protégé par `.htaccess`
- Mode lecture seule pour les visiteurs (`readonly.css`)

## Historique des versions

- **v1.0** - Première version officielle : arbre D3.js, authentification admin/visiteur, permaliens ARK, backup, statistiques, aide

## Licence

Usage personnel — Tous droits réservés

## Auteur

Développé avec l'assistance de Claude (Anthropic)

---

**© 2026 - Généalogie familiale**

Créé avec soin pour préserver l'histoire familiale
