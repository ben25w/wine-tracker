-- Create wine_types table
CREATE TABLE IF NOT EXISTS wine_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Create wines table
CREATE TABLE IF NOT EXISTS wines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type_id INTEGER NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (type_id) REFERENCES wine_types(id)
);

-- Insert some default wine types
INSERT OR IGNORE INTO wine_types (name) VALUES
  ('Red - Light'),
  ('Red - Medium'),
  ('Red - Full'),
  ('White - Crisp'),
  ('White - Medium'),
  ('White - Full'),
  ('Rosé'),
  ('Sparkling'),
  ('Fortified'),
  ('Dessert');
