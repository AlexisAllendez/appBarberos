const { query } = require('../config/db');

// Cache simple en memoria para optimizar consultas
const appointmentCache = {
    lastUpdate: null,
    pendingCount: 0,
    cacheDuration: 60 * 60 * 1000, // 1 hora
    data: null
};

class AppointmentService {
    /**
     * Marcar turnos como completados automáticamente - OPTIMIZADO
     * Esta función se ejecuta para turnos que han pasado su hora de fin
     * y no han sido marcados manualmente como completados
     */
    static async autoCompleteAppointments() {
        try {
    
            
            // Verificar cache primero
            if (this.shouldUseCache()) {
        
                return {
                    success: true,
                    message: 'No hay turnos pendientes para actualizar (cache)',
                    updatedCount: 0,
                    appointments: [],
                    fromCache: true
                };
            }
            
            // Obtener turnos que han pasado su hora de fin y están en estado pendiente
            const currentDate = new Date();
            const currentTime = currentDate.toTimeString().slice(0, 8); // HH:MM:SS
            const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // CONSULTA OPTIMIZADA: Solo obtener IDs y datos esenciales
            const sql = `
                SELECT 
                    t.id,
                    t.fecha,
                    t.hora_fin,
                    t.estado
                FROM turnos t
                WHERE t.fecha <= ?
                AND t.hora_fin < ?
                AND t.estado IN ('reservado', 'confirmado', 'en_proceso')
                ORDER BY t.fecha ASC, t.hora_fin ASC
                LIMIT 50
            `;
            
            const appointments = await query(sql, [currentDateStr, currentTime]);
            
            if (appointments.length === 0) {
                // Actualizar cache cuando no hay turnos pendientes
                this.updateCache(0);
        
                return {
                    success: true,
                    message: 'No hay turnos pendientes para actualizar',
                    updatedCount: 0,
                    appointments: []
                };
            }
            
    
            
            // ACTUALIZACIÓN EN LOTE: Usar una sola consulta UPDATE para múltiples turnos
            const appointmentIds = appointments.map(a => a.id);
            const updateSql = `
                UPDATE turnos 
                SET estado = 'completado', 
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id IN (${appointmentIds.map(() => '?').join(',')})
            `;
            
            // Ejecutar actualización en lote
            await query(updateSql, appointmentIds);
            
            // Actualizar cache
            this.updateCache(0);
            
    
            
            return {
                success: true,
                message: `Se marcaron ${appointments.length} turnos como completados automáticamente`,
                updatedCount: appointments.length,
                appointments: appointments.map(a => ({
                    id: a.id,
                    fecha: a.fecha,
                    hora_fin: a.hora_fin,
                    estado_anterior: a.estado,
                    estado_nuevo: 'completado'
                }))
            };
            
        } catch (error) {
            console.error('❌ Error en autoCompleteAppointments:', error);
            throw new Error('Error al actualizar turnos automáticamente');
        }
    }

    /**
     * Verificar si se debe usar el cache
     */
    static shouldUseCache() {
        if (!appointmentCache.lastUpdate) return false;
        
        const now = Date.now();
        const timeSinceLastUpdate = now - appointmentCache.lastUpdate;
        
        // Usar cache si:
        // 1. Ha pasado menos de 1 hora desde la última actualización
        // 2. No hay turnos pendientes en cache
        return timeSinceLastUpdate < appointmentCache.cacheDuration && 
               appointmentCache.pendingCount === 0;
    }

    /**
     * Actualizar el cache
     */
    static updateCache(pendingCount) {
        appointmentCache.lastUpdate = Date.now();
        appointmentCache.pendingCount = pendingCount;
        appointmentCache.data = null;
    }

    /**
     * Verificar si hay turnos pendientes de forma eficiente
     */
    static async checkPendingAppointments() {
        try {
            const currentDate = new Date();
            const currentTime = currentDate.toTimeString().slice(0, 8);
            const currentDateStr = currentDate.toISOString().split('T')[0];
            
            // CONSULTA LIGERA: Solo contar turnos pendientes
            const sql = `
                SELECT COUNT(*) as count
                FROM turnos 
                WHERE fecha <= ? 
                AND hora_fin < ? 
                AND estado IN ('reservado', 'confirmado', 'en_proceso')
                LIMIT 1
            `;
            
            const [result] = await query(sql, [currentDateStr, currentTime]);
            const pendingCount = result.count;
            
            // Actualizar cache
            this.updateCache(pendingCount);
            
            return pendingCount;
            
        } catch (error) {
            console.error('Error verificando turnos pendientes:', error);
            return 0;
        }
    }

    /**
     * Marcar TODOS los turnos confirmados como completados - OPTIMIZADO
     * Esta función se ejecuta manualmente para marcar turnos confirmados sin importar la hora
     */
    static async completeAllConfirmedAppointments() {
        try {
    
            
            // CONSULTA OPTIMIZADA: Solo obtener IDs
            const selectSql = `
                SELECT id 
                FROM turnos 
                WHERE estado = 'confirmado'
                ORDER BY fecha ASC, hora_inicio ASC
            `;
            
            const appointments = await query(selectSql);
            
            if (appointments.length === 0) {
        
                return {
                    success: true,
                    message: 'No hay turnos confirmados para completar',
                    updatedCount: 0,
                    appointments: []
                };
            }
            
    
            
            // ACTUALIZACIÓN EN LOTE
            const appointmentIds = appointments.map(a => a.id);
            const updateSql = `
                UPDATE turnos 
                SET estado = 'completado', 
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id IN (${appointmentIds.map(() => '?').join(',')})
            `;
            
            await query(updateSql, appointmentIds);
            
            // Actualizar cache
            this.updateCache(0);
            
    
            
            return {
                success: true,
                message: `Se marcaron ${appointments.length} turnos confirmados como completados`,
                updatedCount: appointments.length,
                appointments: appointments.map(a => ({
                    id: a.id,
                    estado_anterior: 'confirmado',
                    estado_nuevo: 'completado'
                }))
            };
            
        } catch (error) {
            console.error('❌ Error en completeAllConfirmedAppointments:', error);
            throw new Error('Error al completar turnos confirmados');
        }
    }

    /**
     * Obtener estadísticas del auto-completado - OPTIMIZADO
     */
    static async getAutoCompleteStats() {
        try {
            // Usar cache si está disponible y es reciente
            if (this.shouldUseCache()) {
                return {
                    lastUpdate: appointmentCache.lastUpdate,
                    pendingCount: appointmentCache.pendingCount,
                    fromCache: true
                };
            }
            
            // Verificar turnos pendientes
            const pendingCount = await this.checkPendingAppointments();
            
            return {
                lastUpdate: appointmentCache.lastUpdate,
                pendingCount: pendingCount,
                fromCache: false
            };
            
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                lastUpdate: null,
                pendingCount: 0,
                fromCache: false,
                error: error.message
            };
        }
    }
    
    /**
     * Verificar si un turno específico debería ser marcado como completado - OPTIMIZADO
     */
    static async shouldAutoComplete(appointmentId) {
        try {
            const sql = `
                SELECT 
                    fecha, 
                    hora_fin, 
                    estado
                FROM turnos 
                WHERE id = ?
            `;
            
            const [appointment] = await query(sql, [appointmentId]);
            
            if (!appointment) {
                return { shouldComplete: false, reason: 'Turno no encontrado' };
            }
            
            const currentDate = new Date();
            const currentTime = currentDate.toTimeString().slice(0, 8);
            const currentDateStr = currentDate.toISOString().split('T')[0];
            
            const shouldComplete = 
                appointment.fecha <= currentDateStr &&
                appointment.hora_fin < currentTime &&
                ['reservado', 'confirmado', 'en_proceso'].includes(appointment.estado);
            
            return {
                shouldComplete,
                reason: shouldComplete 
                    ? 'Turno ha pasado su hora de fin y está en estado pendiente'
                    : 'Turno no cumple condiciones para auto-completado',
                appointment,
                currentTime,
                currentDate: currentDateStr
            };
            
        } catch (error) {
            console.error('Error verificando auto-completado:', error);
            throw error;
        }
    }
}

module.exports = AppointmentService;
