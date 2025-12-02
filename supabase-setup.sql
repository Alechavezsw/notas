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

-- Trigger para actualizar updated_at en notes
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
-- IMPORTANTE: Ajusta estas políticas según tus necesidades de seguridad

-- Habilitar RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Política para proyectos: todos pueden leer y escribir (ajusta según necesites)
CREATE POLICY "Allow all operations on projects" ON projects
    FOR ALL USING (true) WITH CHECK (true);

-- Política para notas: todos pueden leer y escribir (ajusta según necesites)
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

-- Habilitar Realtime para sincronización en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Migración: Agregar columna tags si la tabla ya existe (para proyectos existentes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'tags'
    ) THEN
        ALTER TABLE projects ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;


