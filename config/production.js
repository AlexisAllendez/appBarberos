/**
 * Configuración de Producción para Sistema de Barbería
 * Este archivo controla las tareas programadas y optimizaciones para producción
 */

module.exports = {
    // ========================================
    // CONFIGURACIÓN DE TAREAS PROGRAMADAS
    // ========================================
    
    // Habilitar/deshabilitar tareas automáticas del servidor
    serverTasks: {
        // Auto-completado de turnos
        autoComplete: {
            enabled: true,           // Habilitar en producción
            interval: 30 * 60 * 1000, // 30 minutos (en lugar de 5)
            description: 'Marcar turnos como completados automáticamente'
        },
        
        // Actualización diaria
        dailyUpdate: {
            enabled: true,           // Habilitar en producción
            checkInterval: 5 * 60 * 1000, // Verificar cada 5 minutos
            description: 'Actualizar turnos del día anterior a las 00:01 AM'
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DEL FRONTEND
    // ========================================
    
    // Tareas automáticas del dashboard
    dashboardTasks: {
        // Auto-refresh del dashboard principal
        mainRefresh: {
            enabled: true,           // Habilitar en producción
            interval: 15 * 60 * 1000, // 15 minutos
            description: 'Actualización automática de datos del dashboard'
        },
        
        // Auto-completado del frontend
        autoComplete: {
            enabled: true,           // Habilitar en producción
            interval: 5 * 60 * 1000, // 5 minutos
            description: 'Actualización de estadísticas de auto-completado'
        },
        
        // Estadísticas del sistema
        stats: {
            enabled: true,           // Habilitar en producción
            interval: 10 * 60 * 1000, // 10 minutos
            description: 'Actualización de estadísticas del sistema'
        },
        
        // Turnos pendientes
        pendingAppointments: {
            enabled: true,           // Habilitar en producción
            interval: 15 * 60 * 1000, // 15 minutos
            description: 'Actualización de turnos pendientes'
        },
        
        // Timestamps
        timestamps: {
            enabled: true,           // Habilitar en producción
            interval: 5 * 60 * 1000, // 5 minutos
            description: 'Actualización de timestamps de ejecución'
        }
    },
    
    // ========================================
    // OPTIMIZACIONES DE RENDIMIENTO
    // ========================================
    
    performance: {
        // Deshabilitar logs detallados en producción
        verboseLogging: false,
        
        // Habilitar compresión de respuestas
        compression: true,
        
        // Cache de respuestas estáticas
        staticCache: true,
        
        // Tiempo de vida del cache (en segundos)
        cacheTTL: 300, // 5 minutos
        
        // Límite de conexiones simultáneas
        maxConnections: 100,
        
        // Timeout de consultas a base de datos
        dbQueryTimeout: 30000, // 30 segundos
        
        // Pool de conexiones a base de datos
        dbPool: {
            min: 5,
            max: 20,
            acquire: 30000,
            idle: 10000
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE MONITOREO
    // ========================================
    
    monitoring: {
        // Habilitar métricas de rendimiento
        enabled: true,
        
        // Intervalo de recolección de métricas
        interval: 60 * 1000, // 1 minuto
        
        // Métricas a recolectar
        metrics: [
            'cpu_usage',
            'memory_usage',
            'active_connections',
            'database_queries',
            'response_times'
        ]
    },
    
    // ========================================
    // CONFIGURACIÓN DE MANTENIMIENTO
    // ========================================
    
    maintenance: {
        // Limpieza automática de logs antiguos
        logCleanup: {
            enabled: true,
            interval: 24 * 60 * 60 * 1000, // 24 horas
            retentionDays: 30
        },
        
        // Limpieza de sesiones expiradas
        sessionCleanup: {
            enabled: true,
            interval: 60 * 60 * 1000, // 1 hora
            retentionHours: 24
        },
        
        // Optimización de base de datos
        dbOptimization: {
            enabled: true,
            interval: 7 * 24 * 60 * 60 * 1000, // 7 días
            analyzeTables: true,
            optimizeTables: true
        }
    }
};
