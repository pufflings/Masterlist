-- =========================
-- DROP (safe to rerun)
-- =========================
DROP TRIGGER IF EXISTS puffling_id_trigger ON pufflings;
DROP TRIGGER IF EXISTS trg_gen_traits_id ON traits;
DROP TRIGGER IF EXISTS trg_gen_items_id ON items;

DROP TABLE IF EXISTS event_log CASCADE;
DROP TABLE IF EXISTS puffling_traits CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS item_trait_link CASCADE;

DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS main_story CASCADE;
DROP TABLE IF EXISTS news CASCADE;

DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS traits CASCADE;

DROP TABLE IF EXISTS pufflings CASCADE;
DROP TABLE IF EXISTS design_type CASCADE;

DROP TABLE IF EXISTS trait_type CASCADE;
DROP TABLE IF EXISTS item_type CASCADE;
DROP TABLE IF EXISTS rarity CASCADE;
DROP TABLE IF EXISTS status CASCADE;
DROP TABLE IF EXISTS species CASCADE;

DROP TABLE IF EXISTS seekers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP SEQUENCE IF EXISTS seeker_seq CASCADE;

DROP FUNCTION IF EXISTS gen_puffling_id() CASCADE;
DROP FUNCTION IF EXISTS gen_seeker_id() CASCADE;
DROP FUNCTION IF EXISTS gen_traits_id() CASCADE;
DROP FUNCTION IF EXISTS gen_items_id() CASCADE;
DROP FUNCTION IF EXISTS slugify(TEXT) CASCADE;

-- =========================
-- UTIL: slugify
-- =========================
CREATE OR REPLACE FUNCTION slugify(txt TEXT)
RETURNS TEXT AS $$
BEGIN
  IF txt IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(regexp_replace(txt, '[^a-zA-Z0-9]+', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =========================
-- CORE TABLES
-- =========================
CREATE TABLE users (
  discord_id BIGINT PRIMARY KEY,
  username   TEXT NOT NULL,
  hide       BOOLEAN DEFAULT FALSE
);

-- SEEKERS: sequence + default function
CREATE SEQUENCE seeker_seq;

CREATE OR REPLACE FUNCTION gen_seeker_id()
RETURNS TEXT AS $$
DECLARE
  next_id INT := nextval('seeker_seq');
BEGIN
  RETURN 'SEEKER-' || lpad(next_id::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE seekers (
  design     TEXT PRIMARY KEY DEFAULT gen_seeker_id(),
  name       TEXT NOT NULL,
  hide       BOOLEAN DEFAULT FALSE,
  image      TEXT,
  owner_id   BIGINT REFERENCES users(discord_id),
  artist     TEXT,
  designer   TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LOOKUPS
CREATE TABLE species   ( name TEXT PRIMARY KEY, description TEXT );
CREATE TABLE status    ( name TEXT PRIMARY KEY, description TEXT );
CREATE TABLE rarity    ( name TEXT PRIMARY KEY, description TEXT );
CREATE TABLE item_type ( name TEXT PRIMARY KEY, description TEXT );
CREATE TABLE trait_type( name TEXT PRIMARY KEY, description TEXT );

-- DESIGN TYPE (with optional prefix)
CREATE TABLE design_type (
  name        TEXT PRIMARY KEY,
  description TEXT,
  prefix      TEXT
);

-- PUFFLINGS
CREATE TABLE pufflings (
  design             TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  image              TEXT,
  humanoid_image     TEXT,
  type               TEXT REFERENCES design_type(name),
  species            TEXT REFERENCES species(name),
  owner_id           BIGINT REFERENCES users(discord_id),
  seeker_design      TEXT REFERENCES seekers(design),
  relationship       SMALLINT CHECK (relationship BETWEEN 1 AND 100),
  hide               BOOLEAN DEFAULT FALSE,
  heartbound_crystal BOOLEAN DEFAULT FALSE,
  artist             TEXT,
  designer           TEXT,
  value              NUMERIC,
  status             TEXT REFERENCES status(name),
  rarity             TEXT REFERENCES rarity(name),
  notes              TEXT
);

-- Puffling ID generation: prefix → incremental per prefix; empty prefix → use name
CREATE OR REPLACE FUNCTION gen_puffling_id()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix  TEXT;
  next_num  INT;
BEGIN
  SELECT COALESCE(prefix, '') INTO v_prefix
  FROM design_type
  WHERE name = NEW.type;

  IF v_prefix = '' THEN
    NEW.design := NEW.name;
  ELSE
    SELECT COUNT(*) + 1 INTO next_num
    FROM pufflings
    WHERE design LIKE v_prefix || '-%';

    NEW.design := v_prefix || '-' || lpad(next_num::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER puffling_id_trigger
BEFORE INSERT ON pufflings
FOR EACH ROW EXECUTE FUNCTION gen_puffling_id();

-- =========================
-- CONTENT TABLES
-- =========================
CREATE TABLE prompts (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  hide         BOOLEAN DEFAULT FALSE,
  image        TEXT,
  link         TEXT,
  start_date   DATE,
  end_date     DATE,
  archived     BOOLEAN DEFAULT FALSE,
  description  TEXT
);

CREATE TABLE main_story (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  hide         BOOLEAN DEFAULT FALSE,
  image        TEXT,
  link         TEXT,
  "new"        BOOLEAN DEFAULT FALSE,
  archived     BOOLEAN DEFAULT FALSE,
  description  TEXT
);

CREATE TABLE news (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  hide         BOOLEAN DEFAULT FALSE,
  image        TEXT,
  link         TEXT,
  "new"        BOOLEAN DEFAULT FALSE,
  description  TEXT
);

-- =========================
-- TRAITS (id auto from display_name if empty)
-- =========================
CREATE TABLE traits (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  hide          BOOLEAN DEFAULT FALSE,
  image         TEXT,
  type          TEXT REFERENCES trait_type(name),
  rarity        TEXT REFERENCES rarity(name),
  price         NUMERIC,
  description   TEXT
);

CREATE OR REPLACE FUNCTION gen_traits_id()
RETURNS TRIGGER AS $$
DECLARE
  base TEXT;
  probe TEXT;
  n INT := 1;
  exists_bool BOOLEAN;
BEGIN
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    base := slugify(NEW.display_name);
    IF base IS NULL OR base = '' THEN
      RAISE EXCEPTION 'traits.id is empty and display_name slug is empty';
    END IF;

    probe := base;
    LOOP
      SELECT EXISTS(SELECT 1 FROM traits t WHERE t.id = probe) INTO exists_bool;
      EXIT WHEN NOT exists_bool;
      n := n + 1;
      probe := base || n::text;
    END LOOP;

    NEW.id := probe;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gen_traits_id
BEFORE INSERT ON traits
FOR EACH ROW EXECUTE FUNCTION gen_traits_id();

-- =========================
-- ITEMS (id auto from display_name if empty)
-- =========================
CREATE TABLE items (
  id               TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  hide             BOOLEAN DEFAULT FALSE,
  stocked_in_shop  BOOLEAN DEFAULT FALSE,
  tradeable        BOOLEAN DEFAULT TRUE,
  image            TEXT,
  type             TEXT REFERENCES item_type(name),
  rarity           TEXT REFERENCES rarity(name),
  price            NUMERIC,
  description      TEXT,
  stock_quantity   INTEGER
);

CREATE OR REPLACE FUNCTION gen_items_id()
RETURNS TRIGGER AS $$
DECLARE
  base TEXT;
  probe TEXT;
  n INT := 1;
  exists_bool BOOLEAN;
BEGIN
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    base := slugify(NEW.display_name);
    IF base IS NULL OR base = '' THEN
      RAISE EXCEPTION 'items.id is empty and display_name slug is empty';
    END IF;

    probe := base;
    LOOP
      SELECT EXISTS(SELECT 1 FROM items i WHERE i.id = probe) INTO exists_bool;
      EXIT WHEN NOT exists_bool;
      n := n + 1;
      probe := base || n::text;
    END LOOP;

    NEW.id := probe;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gen_items_id
BEFORE INSERT ON items
FOR EACH ROW EXECUTE FUNCTION gen_items_id();

-- =========================
-- OPTIONAL 1↔1: items ↔ traits
-- Enforced via unique link table
-- =========================
CREATE TABLE item_trait_link (
  item_id  TEXT UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  trait_id TEXT UNIQUE REFERENCES traits(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, trait_id)
);

-- =========================
-- MANY-TO-MANY + QTY: users × items
-- =========================
CREATE TABLE inventory (
  user_id  BIGINT REFERENCES users(discord_id) ON DELETE CASCADE,
  item_id  TEXT   REFERENCES items(id) ON DELETE CASCADE,
  qty      INTEGER NOT NULL CHECK (qty >= 0),
  PRIMARY KEY (user_id, item_id)
);

-- =========================
-- MANY-TO-MANY: pufflings × traits (with note)
-- =========================
CREATE TABLE puffling_traits (
  puffling_design TEXT REFERENCES pufflings(design) ON DELETE CASCADE,
  trait_id        TEXT REFERENCES traits(id)        ON DELETE CASCADE,
  note            TEXT,
  PRIMARY KEY (puffling_design, trait_id)
);

-- =========================
-- LOG
-- =========================
CREATE TABLE event_log (
  id              BIGSERIAL PRIMARY KEY,
  occurred_at     TIMESTAMPTZ DEFAULT now(),
  actor_id        BIGINT REFERENCES users(discord_id),   -- who performed
  user_id         BIGINT REFERENCES users(discord_id),   -- target user for inventory ops
  item_id         TEXT   REFERENCES items(id),
  puffling_design TEXT   REFERENCES pufflings(design),
  action          TEXT NOT NULL,        -- e.g. 'inventory.add', 'inventory.remove'
  delta           INTEGER,              -- quantity change
  details         JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_log_user_time ON event_log(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_item_time ON event_log(item_id, occurred_at DESC);
