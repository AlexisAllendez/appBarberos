-- =====================================================
-- SCRIPT PARA CORREGIR PROBLEMAS DE FECHAS EN LA BASE DE DATOS
-- =====================================================

-- 1. Limpiar fechas inválidas existentes
UPDATE turnos 
SET fecha = CURDATE() 
WHERE fecha IS NULL OR fecha < '2020-01-01';

-- 2. Agregar restricción CHECK para la fecha (MySQL 8.0+)
-- Nota: Si estás usando MySQL 5.7 o anterior, esta restricción no funcionará
-- pero el UPDATE anterior debería ser suficiente

-- 3. Verificar que no queden fechas problemáticas
SELECT 
    COUNT(*) as total_turnos,
    COUNT(CASE WHEN fecha IS NULL THEN 1 END) as fechas_nulas,
    COUNT(CASE WHEN fecha < '2020-01-01' THEN 1 END) as fechas_invalidas
FROM turnos;

-- 4. Mostrar algunos ejemplos de turnos para verificar
SELECT 
    id, fecha, estado, id_usuario, creado_en
FROM turnos 
ORDER BY fecha DESC 
LIMIT 10;

-- 5. Crear índice para mejorar el rendimiento de consultas por fecha
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_usuario_fecha ON turnos(id_usuario, fecha);

-- 6. Verificar la estructura de la tabla
DESCRIBE turnos;
