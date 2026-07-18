-- ============================================
-- FUTURE_FS_02 — Client Lead Management System
-- Schéma MySQL (v2 — pipeline enrichi)
-- ============================================

CREATE DATABASE IF NOT EXISTS mini_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mini_crm;

-- Administrateurs (accès sécurisé)
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads (prospects) — pipeline à 6 étapes + valeur de deal + société
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  company VARCHAR(150),
  source ENUM('website', 'linkedin', 'referral', 'email', 'phone', 'other') NOT NULL DEFAULT 'website',
  status ENUM('new', 'qualified', 'contacted', 'negotiation', 'converted', 'lost') NOT NULL DEFAULT 'new',
  value INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Notes / suivis liés à un lead
CREATE TABLE IF NOT EXISTS lead_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Index utiles pour la recherche et le tri
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Compte admin : voir backend/seed.js (admin / admin123)

-- Leads de démonstration
INSERT INTO leads (full_name, email, phone, company, source, status, value) VALUES
('Awa Konaté', 'awa.konate@example.com', '+228 90 11 22 33', 'Konaté Distribution', 'website', 'new', 250000),
('Kodjo Mensah', 'kodjo.mensah@example.com', '+228 91 22 33 44', 'Mensah & Fils', 'linkedin', 'contacted', 480000),
('Fatou Diallo', 'fatou.diallo@example.com', '+228 92 33 44 55', 'Diallo Textiles', 'referral', 'converted', 620000),
('Yao Adjovi', 'yao.adjovi@example.com', '+228 93 44 55 66', NULL, 'website', 'qualified', 150000),
('Nadia Bakary', 'nadia.bakary@example.com', '+228 94 55 66 77', 'Bakary Import-Export', 'phone', 'negotiation', 900000),
('Ibrahim Touré', 'ibrahim.toure@example.com', '+228 95 66 77 88', NULL, 'other', 'lost', 0);

INSERT INTO lead_notes (lead_id, content) VALUES
(1, 'Premier contact envoyé par email, en attente de réponse.'),
(2, 'Appelé le client, intéressé par une démo la semaine prochaine.'),
(3, 'Contrat signé, client converti avec succès.'),
(5, 'En négociation sur les conditions de paiement, relance prévue vendredi.');
