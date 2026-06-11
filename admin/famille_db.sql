-- ============================================================
--  famille_db — Schéma de la base de données généalogique
--  Charset : utf8mb4 / utf8mb4_unicode_ci
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- ============================================================
--  TABLE : membres
-- ============================================================

DROP TABLE IF EXISTS `membres`;
CREATE TABLE IF NOT EXISTS `membres` (
  `id`                        int          NOT NULL AUTO_INCREMENT,
  `prenom`                    varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `surnom`                    varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom`                       varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sex`                       enum('M','F','U') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'U',
  `date_naissance`            date         DEFAULT NULL,
  `date_naissance_affichage`  varchar(50)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_naissance`            varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_naissance`             text         COLLATE utf8mb4_unicode_ci,
  `date_deces`                date         DEFAULT NULL,
  `date_deces_affichage`      varchar(50)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_deces`                varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_deces`                 text         COLLATE utf8mb4_unicode_ci,
  `occupation`                varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes`                     text         COLLATE utf8mb4_unicode_ci,
  `force_public`              tinyint(1)   NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABLE : mariages
-- ============================================================

DROP TABLE IF EXISTS `mariages`;
CREATE TABLE IF NOT EXISTS `mariages` (
  `id`                      int          NOT NULL AUTO_INCREMENT,
  `epoux_id`                int          NOT NULL,
  `epouse_id`               int          NOT NULL,
  `date_mariage`            date         DEFAULT NULL,
  `date_mariage_affichage`  varchar(50)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_mariage`            varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_fin`                date         DEFAULT NULL COMMENT 'Date de divorce ou décès',
  `date_fin_affichage`      varchar(50)  COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_fin`                enum('divorce','deces','annulation','') COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'Type de fin du mariage',
  `numero_ordre`            tinyint      DEFAULT '1' COMMENT 'Numéro d''ordre du mariage pour chaque personne',
  `notes`                   text         COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `epoux_id`  (`epoux_id`),
  KEY `epouse_id` (`epouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABLE : relations
-- ============================================================

DROP TABLE IF EXISTS `relations`;
CREATE TABLE IF NOT EXISTS `relations` (
  `id`         int  NOT NULL AUTO_INCREMENT,
  `enfant_id`  int  NOT NULL,
  `parent_id`  int  NOT NULL,
  `mariage_id` int  DEFAULT NULL COMMENT 'ID du mariage dont est issu l''enfant',
  `type`       enum('parent','sibling') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `enfant_id`  (`enfant_id`),
  KEY `parent_id`  (`parent_id`),
  KEY `mariage_id` (`mariage_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ============================================================
--  TABLE : documents
-- ============================================================

DROP TABLE IF EXISTS `documents`;
CREATE TABLE IF NOT EXISTS `documents` (
  `id`          int          NOT NULL AUTO_INCREMENT,
  `person_id`   int          NOT NULL,
  `type`        enum('note','pdf','photo') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'note',
  `source`      varchar(50)  COLLATE utf8mb4_general_ci NOT NULL COMMENT 'membre ou mariage_ID',
  `title`       varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Titre pour les notes',
  `content`     text         COLLATE utf8mb4_general_ci COMMENT 'Contenu pour les notes',
  `description` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Description pour les PDF',
  `file_name`   varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Nom original du fichier',
  `file_path`   varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Chemin du fichier sur le serveur',
  `file_size`   int          DEFAULT NULL COMMENT 'Taille du fichier en octets',
  `created_at`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_person_id`     (`person_id`),
  KEY `idx_type`          (`type`),
  KEY `idx_source`        (`source`),
  KEY `idx_created_at`    (`created_at`),
  KEY `idx_person_type`   (`person_id`,`type`),
  KEY `idx_person_source` (`person_id`,`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
--  TABLE : document_members  (liaison N-N documents ↔ membres)
-- ============================================================

DROP TABLE IF EXISTS `document_members`;
CREATE TABLE IF NOT EXISTS `document_members` (
  `document_id` int NOT NULL,
  `member_id`   int NOT NULL,
  PRIMARY KEY (`document_id`, `member_id`),
  KEY `idx_member_id` (`member_id`),
  CONSTRAINT `fk_dm_document` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dm_member`   FOREIGN KEY (`member_id`)   REFERENCES `membres`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  TABLE : liens_verification  (validation des permaliens ARK)
-- ============================================================

DROP TABLE IF EXISTS `liens_verification`;
CREATE TABLE IF NOT EXISTS `liens_verification` (
  `source_id`   int         NOT NULL,
  `champ`       varchar(50) NOT NULL,
  `verified_at` datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`source_id`, `champ`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  CONTRAINTES — clés étrangères
-- ============================================================

ALTER TABLE `documents`
  ADD CONSTRAINT `fk_documents_person` FOREIGN KEY (`person_id`) REFERENCES `membres` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
