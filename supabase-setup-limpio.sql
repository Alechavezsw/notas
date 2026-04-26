-- Supabase SQL Editor: pegá y ejecutá todo de una vez. Re-ejecutable (IF NOT EXISTS, DROP TRIGGER/POLICY).

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  name TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT 'gray',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'tags') THEN
    ALTER TABLE projects ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'stages') THEN
    ALTER TABLE projects ADD COLUMN stages JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'description') THEN
    ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'objectives') THEN
    ALTER TABLE projects ADD COLUMN objectives JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Nueva Nota',
  category TEXT NOT NULL DEFAULT 'General',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'pinned') THEN
    ALTER TABLE notes ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'tags') THEN
    ALTER TABLE notes ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on notes" ON notes;
CREATE POLICY "Allow all operations on notes" ON notes FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- updated_at (función + triggers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- billetera
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billetera (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cantidades JSONB NOT NULL DEFAULT '{}'::jsonb,
  dinero_actual JSONB NOT NULL DEFAULT '[]'::jsonb,
  a_cobrar JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billetera' AND column_name = 'dinero_actual') THEN
    ALTER TABLE billetera ADD COLUMN dinero_actual JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billetera' AND column_name = 'gastos') THEN
    ALTER TABLE billetera ADD COLUMN gastos JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billetera' AND column_name = 'deudas') THEN
    ALTER TABLE billetera ADD COLUMN deudas JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billetera' AND column_name = 'deudores') THEN
    ALTER TABLE billetera ADD COLUMN deudores JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_billetera_updated_at ON billetera;
CREATE TRIGGER update_billetera_updated_at
  BEFORE UPDATE ON billetera
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE billetera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on billetera" ON billetera;
CREATE POLICY "Allow all operations on billetera" ON billetera FOR ALL USING (true) WITH CHECK (true);

INSERT INTO billetera (id, cantidades, dinero_actual, a_cobrar)
VALUES ('default', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- salud (registros JSONB por fecha: peso, agua, sueño, ánimo, pasosSalud, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salud (
  id TEXT PRIMARY KEY DEFAULT 'default',
  registros JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_salud_updated_at ON salud;
CREATE TRIGGER update_salud_updated_at
  BEFORE UPDATE ON salud
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE salud ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on salud" ON salud;
CREATE POLICY "Allow all operations on salud" ON salud FOR ALL USING (true) WITH CHECK (true);

INSERT INTO salud (id, registros)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- mind_maps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mind_maps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Sin título',
  data JSONB NOT NULL DEFAULT '{"root":{"id":0,"text":"Centro","children":[]}}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mind_maps' AND column_name = 'name') THEN
    ALTER TABLE mind_maps ADD COLUMN name TEXT NOT NULL DEFAULT 'Sin título';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mind_maps' AND column_name = 'created_at') THEN
    ALTER TABLE mind_maps ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_mind_maps_updated_at ON mind_maps;
CREATE TRIGGER update_mind_maps_updated_at
  BEFORE UPDATE ON mind_maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on mind_maps" ON mind_maps;
CREATE POLICY "Allow all operations on mind_maps" ON mind_maps FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- opportunity_data (Opportunity: items JSONB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opportunity_data (
  id TEXT PRIMARY KEY DEFAULT 'default',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_opportunity_data_updated_at ON opportunity_data;
CREATE TRIGGER update_opportunity_data_updated_at
  BEFORE UPDATE ON opportunity_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE opportunity_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on opportunity_data" ON opportunity_data;
CREATE POLICY "Allow all operations on opportunity_data" ON opportunity_data FOR ALL USING (true) WITH CHECK (true);

INSERT INTO opportunity_data (id, items)
VALUES ('default', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
