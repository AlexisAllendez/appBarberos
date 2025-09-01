-- =====================================================
-- CORRECCIÓN DE CONFIGURACIÓN DE INTERVALO DE TURNOS
-- =====================================================

-- Este script corrige la configuración del intervalo de turnos
-- para que los slots se generen correctamente según la duración del servicio

-- Actualizar configuración existente para cambiar intervalo_turnos de 30 a 5 minutos
UPDATE configuracion_barbero 
SET intervalo_turnos = 5 
WHERE intervalo_turnos = 30;

-- Verificar la configuración actualizada
SELECT 
    id_usuario,
    intervalo_turnos,
    'Configuración actualizada' as estado
FROM configuracion_barbero 
WHERE intervalo_turnos = 5;

-- Mostrar mensaje de confirmación
SELECT 'Configuración corregida: intervalo_turnos cambiado de 30 a 5 minutos' as mensaje;

