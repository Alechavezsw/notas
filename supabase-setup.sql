-- Script SQL para configurar las tablas en Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
  name TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT 'gray',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de notas
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Nueva Nota',
  category TEXT NOT NULL DEFAULT 'General',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en notes (idempotente si volvés a correr el script)
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
-- IMPORTANTE: Ajusta estas políticas según tus necesidades de seguridad

-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Política para proyectos: todos pueden leer y escribir (ajusta según necesites)
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
CREATE POLICY "Allow all operations on projects" ON projects
    FOR ALL USING (true) WITH CHECK (true);

-- Política para notas: todos pueden leer y escribir (ajusta según necesites)
DROP POLICY IF EXISTS "Allow all operations on notes" ON notes;
CREATE POLICY "Allow all operations on notes" ON notes
    FOR ALL USING (true) WITH CHECK (true);

-- Si quieres que solo usuarios autenticados puedan acceder, descomenta estas líneas:
-- CREATE POLICY "Authenticated users can read projects" ON projects
--     FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can insert projects" ON projects
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can update projects" ON projects
--     FOR UPDATE USING (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can delete projects" ON projects
--     FOR DELETE USING (auth.role() = 'authenticated');

-- Realtime deshabilitado para evitar problemas de sincronización
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Migración: Agregar columna tags si la tabla ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'tags'
    ) THEN
        ALTER TABLE projects ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Migración: Agregar columna pinned si la tabla ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'pinned'
    ) THEN
        ALTER TABLE notes ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Migración: Agregar columna tags a notes (etiquetas por nota)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'tags'
    ) THEN
        ALTER TABLE notes ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Migración: Agregar columna stages a projects (etapas + checklist por etapa)
-- stages = [{ id, name, order, tasks: [{ id, text, done }] }]
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'stages'
    ) THEN
        ALTER TABLE projects ADD COLUMN stages JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Migración: descripción y objetivos del proyecto (objetivos = [{ id, text, done }])
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'description'
    ) THEN
        ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'objectives'
    ) THEN
        ALTER TABLE projects ADD COLUMN objectives JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Tabla billetera (una fila por defecto: id = 'default')
-- dinero_actual y a_cobrar: array de { id, concepto, monto?, fecha? }
CREATE TABLE IF NOT EXISTS billetera (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cantidades JSONB NOT NULL DEFAULT '{}'::jsonb,
  dinero_actual JSONB NOT NULL DEFAULT '[]'::jsonb,
  a_cobrar JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para actualizar updated_at en billetera
DROP TRIGGER IF EXISTS update_billetera_updated_at ON billetera;
CREATE TRIGGER update_billetera_updated_at BEFORE UPDATE ON billetera
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE billetera ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on billetera" ON billetera;
CREATE POLICY "Allow all operations on billetera" ON billetera
    FOR ALL USING (true) WITH CHECK (true);

-- Migración: agregar columna dinero_actual si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'billetera' AND column_name = 'dinero_actual'
    ) THEN
        ALTER TABLE billetera ADD COLUMN dinero_actual JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Insertar fila por defecto si no existe
INSERT INTO billetera (id, cantidades, dinero_actual, a_cobrar)
VALUES ('default', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Migración: columna gastos (tabla de gastos en billetera)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'billetera' AND column_name = 'gastos'
    ) THEN
        ALTER TABLE billetera ADD COLUMN gastos JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Migración: deudas (lo que debés) y deudores (quienes te deben)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'billetera' AND column_name = 'deudas'
    ) THEN
        ALTER TABLE billetera ADD COLUMN deudas JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'billetera' AND column_name = 'deudores'
    ) THEN
        ALTER TABLE billetera ADD COLUMN deudores JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Migración: objetivos de compra (metas de ahorro para compras)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'billetera' AND column_name = 'objetivos_compra'
    ) THEN
        ALTER TABLE billetera ADD COLUMN objetivos_compra JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Tabla salud: una fila id='default', todo el historial en JSONB (no hace falta migrar columnas al agregar campos).
-- registros: objeto con clave fecha 'YYYY-MM-DD' y valor por día, por ejemplo:
--   peso (number), vasosAgua (number), horasSueno (number), animo (1-5),
--   pasosSalud (object): higado, colesterol, corazon, peso, dentadura, acne, vista, estres → boolean,
--   pasosSaludOtros (string): texto libre (tiroides, medicación, etc.)
CREATE TABLE IF NOT EXISTS salud (
  id TEXT PRIMARY KEY DEFAULT 'default',
  registros JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_salud_updated_at ON salud;
CREATE TRIGGER update_salud_updated_at BEFORE UPDATE ON salud
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE salud ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on salud" ON salud;
CREATE POLICY "Allow all operations on salud" ON salud
    FOR ALL USING (true) WITH CHECK (true);

INSERT INTO salud (id, registros)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Tabla mind_maps (varios mapas: id uuid, name, data con root)
CREATE TABLE IF NOT EXISTS mind_maps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Sin título',
  data JSONB NOT NULL DEFAULT '{"root":{"id":0,"text":"Centro","children":[]}}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_mind_maps_updated_at ON mind_maps;
CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on mind_maps" ON mind_maps;
CREATE POLICY "Allow all operations on mind_maps" ON mind_maps
    FOR ALL USING (true) WITH CHECK (true);

-- Migración: agregar name y created_at si no existen (proyectos existentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mind_maps' AND column_name = 'name') THEN
        ALTER TABLE mind_maps ADD COLUMN name TEXT NOT NULL DEFAULT 'Sin título';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mind_maps' AND column_name = 'created_at') THEN
        ALTER TABLE mind_maps ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Opportunity: una fila id='default', items = array de oportunidades (trabajo/negocio, etapas, notas, próximos pasos)
CREATE TABLE IF NOT EXISTS opportunity_data (
  id TEXT PRIMARY KEY DEFAULT 'default',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_opportunity_data_updated_at ON opportunity_data;
CREATE TRIGGER update_opportunity_data_updated_at BEFORE UPDATE ON opportunity_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE opportunity_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on opportunity_data" ON opportunity_data;
CREATE POLICY "Allow all operations on opportunity_data" ON opportunity_data
    FOR ALL USING (true) WITH CHECK (true);

INSERT INTO opportunity_data (id, items)
VALUES ('default', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Mis empresas: ficha ampliada por empresa (JSONB items)
CREATE TABLE IF NOT EXISTS mis_empresas_data (
  id TEXT PRIMARY KEY DEFAULT 'default',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_mis_empresas_data_updated_at ON mis_empresas_data;
CREATE TRIGGER update_mis_empresas_data_updated_at BEFORE UPDATE ON mis_empresas_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE mis_empresas_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on mis_empresas_data" ON mis_empresas_data;
CREATE POLICY "Allow all operations on mis_empresas_data" ON mis_empresas_data
    FOR ALL USING (true) WITH CHECK (true);

INSERT INTO mis_empresas_data (id, items)
VALUES ('default', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Entradas: kanban de ingresos por unidad (JSONB cards)
CREATE TABLE IF NOT EXISTS entradas_data (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entradas_data' AND column_name = 'columns') THEN
    ALTER TABLE entradas_data ADD COLUMN columns JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_entradas_data_updated_at ON entradas_data;
CREATE TRIGGER update_entradas_data_updated_at BEFORE UPDATE ON entradas_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE entradas_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on entradas_data" ON entradas_data;
CREATE POLICY "Allow all operations on entradas_data" ON entradas_data
    FOR ALL USING (true) WITH CHECK (true);

INSERT INTO entradas_data (id, cards, columns)
VALUES ('default', '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
