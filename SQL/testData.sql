-- ===== Reset =====
TRUNCATE TABLE
  event_log,
  puffling_traits,
  inventory,
  item_trait_link,
  items,
  traits,
  news,
  main_story,
  prompts,
  pufflings,
  design_type,
  trait_type,
  item_type,
  rarity,
  status,
  species,
  seekers,
  users
RESTART IDENTITY CASCADE;

-- reset SEEKER sequence (not owned by table)
SELECT setval('seeker_seq', 1, false);

-- ===== Lookups =====
INSERT INTO species(name, description) VALUES
  ('Puffling', 'Default species'),
  ('Avian', 'Alt species');
INSERT INTO status(name, description) VALUES
  ('Active','Active'), ('Dormant','Resting');
INSERT INTO rarity(name, description) VALUES
  ('Common','Common'), ('Rare','Rare'), ('Legendary','Legendary');
INSERT INTO item_type(name, description) VALUES
  ('Consumable','Use-once'), ('Weapon','Combat'), ('Material','Crafting');
INSERT INTO trait_type(name, description) VALUES
  ('Color','Palette'), ('Effect','FX'), ('Temperament','Behavior');

-- Design types (prefix logic)
INSERT INTO design_type(name, description, prefix) VALUES
  ('Standard Puffling','Default','PUF'),
  ('Make-Your-Own','Custom','MYO'),
  ('Special Event','Uses name',''),         -- empty prefix -> use name as design
  ('Shared Prefix','Same as PUF','PUF');    -- different type, same prefix

-- ===== Users =====
INSERT INTO users(discord_id, username) VALUES
  (1111,'Alice'),
  (2222,'Bob');

-- ===== Seekers (auto SEEKER-0001, -0002) =====
INSERT INTO seekers(name, owner_id) VALUES
  ('Seeker One', 1111),
  ('Seeker Two', 1111);

-- ===== Pufflings (auto design ids) =====
INSERT INTO pufflings(name, type, species, owner_id, status, rarity, relationship, heartbound_crystal)
VALUES
  ('Alpha',   'Standard Puffling', 'Puffling', 1111, 'Active',  'Common',    75, true),   -- -> PUF-0001
  ('Beta',    'Standard Puffling', 'Puffling', 1111, 'Active',  'Common',    60, false),  -- -> PUF-0002
  ('Gamma',   'Make-Your-Own',     'Puffling', 1111, 'Active',  'Rare',      50, false),  -- -> MYO-0001
  ('Delta',   'Special Event',     'Avian',    1111, 'Dormant', 'Legendary', 40, false),  -- -> Delta (no prefix)
  ('Epsilon', 'Shared Prefix',     'Puffling', 2222, 'Active',  'Rare',      55, false);  -- -> PUF-0003 (shared prefix)

-- ===== Content tables =====
INSERT INTO prompts(title, hide, image, link, start_date, end_date, archived, description) VALUES
  ('Weekly Prompt 1', false, 'https://img/p1.png', 'https://link/p1', CURRENT_DATE, CURRENT_DATE + 7, false, 'Do X'),
  ('Monthly Prompt', true,  NULL,                  NULL,               CURRENT_DATE, CURRENT_DATE + 30, false, 'Do Y');

INSERT INTO main_story(title, hide, image, link, "new", archived, description) VALUES
  ('Chapter 1', false, NULL, NULL, true,  false, 'Intro'),
  ('Chapter 2', false, NULL, NULL, false, false, 'Next');

INSERT INTO news(title, hide, image, link, "new", description) VALUES
  ('Launch', false, NULL, NULL, true,  'We launched'),
  ('Update', false, NULL, NULL, false, 'Minor fixes');

-- ===== Traits (id auto from display_name; duplicates test suffix) =====
INSERT INTO traits(id, display_name, hide, image, type, rarity, price, description) VALUES
  (NULL, 'Fire',        false, NULL, 'Effect',     'Common',    10, 'Hot'),
  (NULL, 'Fire',        false, NULL, 'Effect',     'Rare',      20, 'Hotter'),   -- -> fire2
  (NULL, 'Ice & Snow',  false, NULL, 'Effect',     'Common',    12, 'Cold'),     -- -> icesnow
  (NULL, 'Gentle',      false, NULL, 'Temperament','Common',     0, 'Mild');

-- ===== Items (id auto from display_name; duplicates test suffix) =====
INSERT INTO items(id, display_name, hide, stocked_in_shop, tradeable, image, type, rarity, price, description, stock_quantity) VALUES
  (NULL, 'Potion of Healing', false, true,  true,  NULL, 'Consumable', 'Common',     5,  'Heals a bit', 100),   -- -> potionofhealing
  (NULL, 'Potion of Healing', false, true,  true,  NULL, 'Consumable', 'Rare',      15,  'Heals more',   50),   -- -> potionofhealing2
  (NULL, 'Sword',             false, false, true,  NULL, 'Weapon',     'Rare',     100,  'Sharp',        10),   -- -> sword
  (NULL, 'Ice Shard',         false, false, true,  NULL, 'Material',   'Common',     2,  'Shard',        999);  -- -> iceshard

-- ===== Optional 1↔1 link (each side at most once) =====
-- Link base potion -> Fire
INSERT INTO item_trait_link(item_id, trait_id)
VALUES ('potionofhealing', 'fire');

-- -- These should fail if uncommented (uniqueness):
-- INSERT INTO item_trait_link(item_id, trait_id) VALUES ('potionofhealing', 'fire2'); -- same item twice -> error
-- INSERT INTO item_trait_link(item_id, trait_id) VALUES ('sword', 'fire');           -- same trait twice -> error

-- ===== Users × Items inventory (quantities) =====
INSERT INTO inventory(user_id, item_id, qty) VALUES
  (1111, 'potionofhealing', 5),
  (1111, 'sword',           1),
  (2222, 'potionofhealing', 9),
  (2222, 'potionofhealing2',1),
  (2222, 'iceshard',        3);

-- ===== Pufflings × Traits (with notes) =====
INSERT INTO puffling_traits(puffling_design, trait_id, note)
SELECT p.design, 'fire', 'breathes fire'
FROM pufflings p WHERE p.name = 'Alpha';

INSERT INTO puffling_traits(puffling_design, trait_id, note)
SELECT p.design, 'icesnow', 'chill aura'
FROM pufflings p WHERE p.name = 'Epsilon';

-- ===== Logs =====
INSERT INTO event_log(actor_id, user_id, item_id, action, delta, details)
VALUES
  (1111, 2222, 'potionofhealing', 'inventory.add',  2, '{"reason":"gift"}'),
  (1111, 2222, 'potionofhealing', 'inventory.remove', -1, '{"reason":"used"}'),
  (2222, NULL, NULL, 'puffling.create', NULL, jsonb_build_object('design', (SELECT design FROM pufflings WHERE name='Gamma')));

-- ===== Verifications =====

-- Seekers IDs
SELECT design, name FROM seekers ORDER BY design;

-- Pufflings IDs and types (check prefix logic)
SELECT design, name, type FROM pufflings ORDER BY design;

-- Count by prefix (PUF/MYO/name)
SELECT
  CASE WHEN position('-' IN design) > 0 THEN split_part(design, '-', 1) ELSE 'NO_PREFIX' END AS prefix,
  count(*) AS cnt
FROM pufflings
GROUP BY 1
ORDER BY 1;

-- Trait auto-ids
SELECT id, display_name FROM traits ORDER BY id;

-- Item auto-ids
SELECT id, display_name FROM items ORDER BY id;

-- 1↔1 links
SELECT i.id AS item_id, t.id AS trait_id
FROM item_trait_link l
JOIN items  i ON i.id = l.item_id
JOIN traits t ON t.id = l.trait_id;

-- Inventory summary
SELECT u.username, i.display_name, inv.qty
FROM inventory inv
JOIN users u ON u.discord_id = inv.user_id
JOIN items i ON i.id = inv.item_id
ORDER BY u.username, i.display_name;

-- Puffling traits with notes
SELECT p.design, p.name, t.display_name, pt.note
FROM puffling_traits pt
JOIN pufflings p ON p.design = pt.puffling_design
JOIN traits t ON t.id = pt.trait_id
ORDER BY p.design, t.display_name;

-- Recent logs
SELECT id, occurred_at, actor_id, user_id, item_id, action, delta, details
FROM event_log
ORDER BY occurred_at DESC, id DESC;
