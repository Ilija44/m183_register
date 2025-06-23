-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 08. Feb 2024 um 18:09
-- Server-Version: 10.6.15-MariaDB
-- PHP-Version: 8.2.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
 /*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
 /*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 /*!40101 SET NAMES utf8mb4 */;

-- Datenbank anlegen und verwenden
CREATE DATABASE IF NOT EXISTS m183_lb2;
USE m183_lb2;

-- Tabelle für Rollen/Gruppen
CREATE TABLE `roles` (
  `ID` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tabelle für Benutzer
CREATE TABLE `users` (
  `ID` bigint(20) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tabelle für Berechtigungen (User <-> Rolle)
CREATE TABLE `permissions` (
  `ID` bigint(20) NOT NULL,
  `userID` bigint(20) NOT NULL,
  `roleID` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tabelle für Aufgaben/Tasks
CREATE TABLE `tasks` (
  `ID` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `userID` bigint(20) NOT NULL,
  `state` enum('open','in progress','done') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Tabelle für Einladungslinks (Gruppen-Invites, einmal gültig)
CREATE TABLE `invite_links` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `group_id` bigint(20) NOT NULL,
  `token` varchar(64) NOT NULL,
  `used` boolean DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Indizes setzen
ALTER TABLE `permissions` ADD PRIMARY KEY (`ID`);
ALTER TABLE `roles` ADD PRIMARY KEY (`ID`);
ALTER TABLE `tasks` ADD PRIMARY KEY (`ID`);
ALTER TABLE `users` ADD PRIMARY KEY (`ID`);

-- AUTO_INCREMENT aktivieren
ALTER TABLE `permissions` MODIFY `ID` bigint(20) NOT NULL AUTO_INCREMENT;
ALTER TABLE `tasks` MODIFY `ID` bigint(20) NOT NULL AUTO_INCREMENT;
ALTER TABLE `users` MODIFY `ID` bigint(20) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
 /*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
 /*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- Standard-Gruppen
INSERT INTO roles (ID, title) VALUES (1, 'Admin'), (2, 'User');

-- Beispiel-User (direkt einer Gruppe zugeordnet)
INSERT INTO users (ID, username, password) VALUES (1, 'admin1', 'Awesome.Pass34');
INSERT INTO users (ID, username, password) VALUES (2, 'user1', 'Amazing.Pass23');

-- Zuordnung User zu Gruppe/Rolle
INSERT INTO permissions (ID, userID, roleID) VALUES (NULL, 1, 1); -- admin1 ist Admin
INSERT INTO permissions (ID, userID, roleID) VALUES (NULL, 2, 2); -- user1 ist User
