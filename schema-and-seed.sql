-- ============================================================
-- Wine Tracker — Schema + Seed Data
-- Run this in Cloudflare D1 console (paste all at once)
-- ============================================================

-- Tables
CREATE TABLE IF NOT EXISTS wine_types (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS wines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  type_id    INTEGER NOT NULL,
  country    TEXT NOT NULL DEFAULT 'Unknown',
  region     TEXT,
  notes      TEXT,
  photo_url  TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (type_id) REFERENCES wine_types(id)
);

-- Wine types
INSERT OR IGNORE INTO wine_types (name) VALUES
  ('Cabernet Sauvignon'),
  ('Chianti'),
  ('Malbec'),
  ('Pinot Grigio'),
  ('Pinot Noir'),
  ('Red - Light'),
  ('Red - Medium'),
  ('Red - Full'),
  ('Rosé'),
  ('Shiraz'),
  ('Sparkling'),
  ('White - Crisp'),
  ('White - Medium'),
  ('White - Full'),
  ('Fortified'),
  ('Dessert');

-- Starter wines
-- Using a subquery to look up type_id by name so it stays flexible
INSERT INTO wines (name, type_id, country, region) VALUES
  ('Chateau Bel Air',                    (SELECT id FROM wine_types WHERE name = 'Red - Medium'),    'France',       'Bordeaux'),
  ('Appellation D''Origine Protégée',    (SELECT id FROM wine_types WHERE name = 'Red - Medium'),    'France',       'Bordeaux'),
  ('Penfolds',                           (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Australia', NULL),
  ('Penfolds Koonuga Hill',              (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Australia', NULL),
  ('Rochester',                          (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'USA',       NULL),
  ('DV Catena Cabernet / Malbec',        (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Argentina', NULL),
  ('Sangre de Toro',                     (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Spain',     NULL),
  ('Cabina 56 Reserve Aresti',           (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Chile',     NULL),
  ('Antawara',                           (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Argentina', NULL),
  ('Casillero del Diablo',               (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Chile',     NULL),
  ('Selección de Familia Gran Reserva',  (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Chile',     NULL),
  ('Single Estate Cabernet Sauvignon',   (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Chile',     NULL),
  ('Diablo',                             (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Chile',     NULL),
  ('Kaiken Ultra',                       (SELECT id FROM wine_types WHERE name = 'Cabernet Sauvignon'), 'Argentina', NULL),
  ('Chianti Classico Riserva Zingarelli',(SELECT id FROM wine_types WHERE name = 'Chianti'),          'Italy',      'Tuscany'),
  ('Chianti Riserva Cecchi',             (SELECT id FROM wine_types WHERE name = 'Chianti'),          'Italy',      'Tuscany'),
  ('Santa Julia',                        (SELECT id FROM wine_types WHERE name = 'Malbec'),           'Argentina',  NULL),
  ('Delle Venezia DOC Case Defra',       (SELECT id FROM wine_types WHERE name = 'Pinot Grigio'),     'Italy',      'Veneto'),
  ('Luis Felipe Edwards Central',        (SELECT id FROM wine_types WHERE name = 'Pinot Noir'),       'Chile',      NULL),
  ('Casillero del Diablo',               (SELECT id FROM wine_types WHERE name = 'Pinot Noir'),       'Chile',      NULL),
  ('Shiraz Cabernet Koonunga Hill',      (SELECT id FROM wine_types WHERE name = 'Shiraz'),           'Australia',  NULL),
  ('Cape Discovery',                     (SELECT id FROM wine_types WHERE name = 'Shiraz'),           'South Africa', NULL),
  ('Agustinos',                          (SELECT id FROM wine_types WHERE name = 'Shiraz'),           'Chile',      NULL);
