-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : jeu. 14 mai 2026 à 16:55
-- Version du serveur : 8.3.0
-- Version de PHP : 8.2.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `famille_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `documents`
--

DROP TABLE IF EXISTS `documents`;
CREATE TABLE IF NOT EXISTS `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `person_id` int NOT NULL,
  `type` enum('note','pdf','photo') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'note',
  `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'membre ou mariage_ID',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Titre pour les notes',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Contenu pour les notes',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Description pour les PDF',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Nom original du fichier',
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Chemin du fichier sur le serveur',
  `file_size` int DEFAULT NULL COMMENT 'Taille du fichier en octets',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_person_id` (`person_id`),
  KEY `idx_type` (`type`),
  KEY `idx_source` (`source`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_person_type` (`person_id`,`type`),
  KEY `idx_person_source` (`person_id`,`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `mariages`
--

DROP TABLE IF EXISTS `mariages`;
CREATE TABLE IF NOT EXISTS `mariages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `epoux_id` int NOT NULL,
  `epouse_id` int NOT NULL,
  `date_mariage` date DEFAULT NULL,
  `date_mariage_affichage` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_mariage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_fin` date DEFAULT NULL COMMENT 'Date de divorce ou décès',
  `date_fin_affichage` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_fin` enum('divorce','deces','annulation','') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'Type de fin du mariage',
  `numero_ordre` tinyint DEFAULT '1' COMMENT 'Numéro d''ordre du mariage pour chaque personne',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `epoux_id` (`epoux_id`),
  KEY `epouse_id` (`epouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membres`
--

DROP TABLE IF EXISTS `membres`;
CREATE TABLE IF NOT EXISTS `membres` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prenom` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `surnom` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sex` enum('M','F','U') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'U',
  `date_naissance` date DEFAULT NULL,
  `date_naissance_affichage` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_naissance` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_naissance` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `date_deces` date DEFAULT NULL,
  `date_deces_affichage` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_deces` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_deces` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `occupation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `force_public` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `membres_total`
--

DROP TABLE IF EXISTS `membres_total`;
CREATE TABLE IF NOT EXISTS `membres_total` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prenom` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sex` enum('M','F','U') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'U',
  `date_naissance` date DEFAULT NULL,
  `lieu_naissance` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_deces` date DEFAULT NULL,
  `lieu_deces` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `relations`
--

DROP TABLE IF EXISTS `relations`;
CREATE TABLE IF NOT EXISTS `relations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enfant_id` int NOT NULL,
  `parent_id` int NOT NULL,
  `mariage_id` int DEFAULT NULL COMMENT 'ID du mariage dont est issu l''enfant',
  `type` enum('parent','sibling') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `enfant_id` (`enfant_id`),
  KEY `parent_id` (`parent_id`),
  KEY `mariage_id` (`mariage_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_person` FOREIGN KEY (`person_id`) REFERENCES `membres` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;



Voici les commandes SQL à exécuter dans phpMyAdmin (ou MySQL) :


-- 1. Création de la table de liaison
CREATE TABLE `document_members` (
  `document_id` int NOT NULL,
  `member_id`   int NOT NULL,
  PRIMARY KEY (`document_id`, `member_id`),
  KEY `idx_member_id` (`member_id`),
  CONSTRAINT `fk_dm_document` FOREIGN KEY (`document_id`)
    REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dm_member` FOREIGN KEY (`member_id`)
    REFERENCES `membres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Peupler la table avec les liaisons déjà existantes
--    (chaque document est déjà lié à son person_id)
INSERT INTO `document_members` (`document_id`, `member_id`)
SELECT `id`, `person_id`
FROM `documents`;
-- La commande 1 crée la structure. La commande 2 migre les données existantes — chaque document déjà en base obtient automatiquement sa liaison dans la nouvelle table, ce qui garantit la cohérence dès le départ.



-- Modification pour gestion des dates

ALTER TABLE membres 
  ADD COLUMN date_naissance_affichage VARCHAR(50) DEFAULT NULL AFTER date_naissance,
  ADD COLUMN date_deces_affichage VARCHAR(50) DEFAULT NULL AFTER date_deces;

ALTER TABLE mariages
  ADD COLUMN date_mariage_affichage VARCHAR(50) DEFAULT NULL AFTER date_mariage,
  ADD COLUMN date_fin_affichage VARCHAR(50) DEFAULT NULL AFTER date_fin;

-- Modification pour validation des liens

CREATE TABLE liens_verification (
  source_id   INT          NOT NULL,
  champ       VARCHAR(50)  NOT NULL,
  verified_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_id, champ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;  
