-- ========================================
-- OPTIMIZACIÓN DE BASE DE DATOS PARA TURNOS
-- ========================================
-- Este archivo contiene índices y optimizaciones para mejorar
-- el rendimiento de las consultas automáticas de turnos

-- Índice compuesto para la consulta principal de auto-completado
-- Optimiza: WHERE fecha <= ? AND hora_fin < ? AND estado IN (...)
CREATE INDEX IF NOT EXISTS idx_turnos_estado_fecha_hora 
ON turnos(estado, fecha, hora_fin);

-- Índice para consultas por estado
CREATE INDEX IF NOT EXISTS idx_turnos_estado 
ON turnos(estado);

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS idx_turnos_fecha 
ON turnos(fecha);

-- Índice para consultas por hora_fin
CREATE INDEX IF NOT EXISTS idx_turnos_hora_fin 
ON turnos(hora_fin);

-- Índice para consultas de actualización
CREATE INDEX IF NOT EXISTS idx_turnos_id_estado 
ON turnos(id, estado);

-- Índice para consultas de estadísticas
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_estado 
ON turnos(fecha, estado);

-- Índice para consultas de turnos confirmados
CREATE INDEX IF NOT EXISTS idx_turnos_estado_confirmado 
ON turnos(estado, fecha, hora_inicio) 
WHERE estado = 'confirmado';

-- Índice para consultas de turnos pendientes
CREATE INDEX IF NOT EXISTS idx_turnos_pendientes 
ON turnos(fecha, hora_fin, estado) 
WHERE estado IN ('reservado', 'confirmado', 'en_proceso');

-- ========================================
-- ESTADÍSTICAS DE LA BASE DE DATOS
-- ========================================
-- Ejecutar después de crear los índices para optimizar el plan de consultas

-- Actualizar estadísticas de la tabla turnos
ANALYZE turnos;

-- Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'turnos'
ORDER BY indexname;

-- ========================================
-- CONSULTAS DE PRUEBA OPTIMIZADAS
-- ========================================

-- Consulta optimizada para auto-completado (usar EXPLAIN ANALYZE)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    t.id,
    t.fecha,
    t.hora_fin,
    t.estado
FROM turnos t
WHERE t.fecha <= CURRENT_DATE
AND t.hora_fin < CURRENT_TIME
AND t.estado IN ('reservado', 'confirmado', 'en_proceso')
ORDER BY t.fecha ASC, t.hora_fin ASC
LIMIT 50;

-- Consulta optimizada para contar turnos pendientes
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) as count
FROM turnos 
WHERE fecha <= CURRENT_DATE 
AND hora_fin < CURRENT_TIME 
AND estado IN ('reservado', 'confirmado', 'en_proceso');

-- ========================================
-- MONITOREO DE RENDIMIENTO
-- ========================================

-- Verificar el tamaño de los índices
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes 
WHERE tablename = 'turnos'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verificar el uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename = 'turnos'
ORDER BY idx_scan DESC;

