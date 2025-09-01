/**
 * Configuración de Producción para Sistema de Barbería - OPTIMIZADA
 * Este archivo controla las tareas programadas y optimizaciones para producción
 */

module.exports = {
    // ========================================
    // CONFIGURACIÓN DE TAREAS PROGRAMADAS - OPTIMIZADA
    // ========================================
    
    // Habilitar/deshabilitar tareas automáticas del servidor
    serverTasks: {
        // Auto-completado de turnos - OPTIMIZADO
        autoComplete: {
            enabled: true,           // Habilitar en producción
            interval: 4 * 60 * 60 * 1000, // 4 horas (reducido de 30 minutos)
            description: 'Marcar turnos como completados automáticamente (OPTIMIZADO)'
        },
        
        // Verificación de cache - NUEVO
        cacheUpdate: {
            enabled: true,           // Habilitar en producción
            interval: 2 * 60 * 60 * 1000, // 2 horas
            description: 'Mantener cache de turnos pendientes actualizado'
        },
        
        // Actualización diaria - OPTIMIZADA
        dailyUpdate: {
            enabled: true,           // Habilitar en producción
            checkInterval: 10 * 60 * 1000, // Verificar cada 10 minutos (reducido de 5)
            description: 'Actualizar turnos del día anterior a las 00:01 AM (OPTIMIZADO)'
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DEL FRONTEND - OPTIMIZADA
    // ========================================
    
    // Tareas automáticas del dashboard
    dashboardTasks: {
        // Auto-refresh del dashboard principal - OPTIMIZADO
        mainRefresh: {
            enabled: true,           // Habilitar en producción
            interval: 20 * 60 * 1000, // 20 minutos (aumentado de 15)
            description: 'Actualización automática de datos del dashboard (OPTIMIZADO)'
        },
        
        // Auto-completado del frontend - OPTIMIZADO
        autoComplete: {
            enabled: true,           // Habilitar en producción
            interval: 10 * 60 * 1000, // 10 minutos (aumentado de 5)
            description: 'Actualización de estadísticas de auto-completado (OPTIMIZADO)'
        },
        
        // Estadísticas del sistema - OPTIMIZADO
        stats: {
            enabled: true,           // Habilitar en producción
            interval: 15 * 60 * 1000, // 15 minutos (aumentado de 10)
            description: 'Actualización de estadísticas del sistema (OPTIMIZADO)'
        },
        
        // Turnos pendientes - OPTIMIZADO
        pendingAppointments: {
            enabled: true,           // Habilitar en producción
            interval: 20 * 60 * 1000, // 20 minutos (aumentado de 15)
            description: 'Actualización de turnos pendientes (OPTIMIZADO)'
        },
        
        // Timestamps - OPTIMIZADO
        timestamps: {
            enabled: true,           // Habilitar en producción
            interval: 10 * 60 * 1000, // 10 minutos (aumentado de 5)
            description: 'Actualización de timestamps de ejecución (OPTIMIZADO)'
        }
    },
    
    // ========================================
    // OPTIMIZACIONES DE RENDIMIENTO - MEJORADAS
    // ========================================
    
    performance: {
        // Deshabilitar logs detallados en producción
        verboseLogging: false,
        
        // Habilitar compresión de respuestas
        compression: true,
        
        // Cache de respuestas estáticas
        staticCache: true,
        
        // Tiempo de vida del cache (en segundos) - AUMENTADO
        cacheTTL: 600, // 10 minutos (aumentado de 5)
        
        // Límite de conexiones simultáneas - OPTIMIZADO
        maxConnections: 50, // Reducido de 100 para mejor rendimiento
        
        // Timeout de consultas a base de datos - OPTIMIZADO
        dbQueryTimeout: 15000, // 15 segundos (reducido de 30)
        
        // Pool de conexiones a base de datos - OPTIMIZADO
        dbPool: {
            min: 3,  // Reducido de 5
            max: 15, // Reducido de 20
            acquire: 20000, // 20 segundos (reducido de 30)
            idle: 15000     // 15 segundos (aumentado de 10)
        },
        
        // ========================================
        // NUEVAS OPTIMIZACIONES IMPLEMENTADAS
        // ========================================
        
        // Sistema de cache para turnos
        appointmentCache: {
            enabled: true,
            duration: 60 * 60 * 1000, // 1 hora
            maxSize: 1000, // Máximo 1000 entradas en cache
            cleanupInterval: 30 * 60 * 1000 // Limpiar cada 30 minutos
        },
        
        // Optimización de consultas SQL
        sqlOptimization: {
            useBatchUpdates: true,    // Usar actualizaciones en lote
            limitResults: 50,         // Limitar resultados a 50
            useIndexes: true,         // Forzar uso de índices
            queryTimeout: 10000       // Timeout de 10 segundos por consulta
        },
        
        // Monitoreo de rendimiento
        monitoring: {
            enabled: true,
            logSlowQueries: true,     // Log de consultas lentas
            slowQueryThreshold: 1000, // 1 segundo
            logCacheHits: true,       // Log de hits de cache
            logResourceUsage: true    // Log de uso de recursos
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE BASE DE DATOS - OPTIMIZADA
    // ========================================
    
    database: {
        // Configuración de conexión
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'barberia',
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.DB_SSL === 'true'
        },
        
        // Configuración de pool optimizada
        pool: {
            min: 3,
            max: 15,
            acquire: 20000,
            idle: 15000,
            evict: 30000
        },
        
        // Configuración de consultas
        queries: {
            timeout: 15000,
            retryAttempts: 3,
            retryDelay: 1000
        },
        
        // Configuración de índices
        indexes: {
            autoCreate: true,         // Crear índices automáticamente
            optimizeOnStartup: true,  // Optimizar al iniciar
            analyzeTables: true       // Analizar tablas para estadísticas
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE LOGGING - OPTIMIZADA
    // ========================================
    
    logging: {
        level: 'info',                // Solo logs importantes en producción
        enableConsole: true,
        enableFile: true,
        filePath: './logs/production.log',
        maxSize: '10m',               // Máximo 10MB por archivo
        maxFiles: 5,                  // Máximo 5 archivos de log
        compress: true,               // Comprimir logs antiguos
        
        // Filtros para reducir logs innecesarios
        filters: {
            excludeHealthChecks: true,    // Excluir health checks
            excludeCacheHits: false,      // Incluir hits de cache
            excludeSlowQueries: false,    // Incluir consultas lentas
            excludeResourceUsage: false   // Incluir uso de recursos
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE SEGURIDAD - MEJORADA
    // ========================================
    
    security: {
        // Headers de seguridad
        headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        },
        
        // Rate limiting
        rateLimit: {
            enabled: true,
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100,                  // Máximo 100 requests por ventana
            message: 'Demasiadas requests desde esta IP'
        },
        
        // CORS
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    }
};
