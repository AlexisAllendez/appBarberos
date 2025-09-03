/**
 * Configuración de Desarrollo para Sistema de Barbería
 * Maneja errores de SSL y optimiza logs para desarrollo
 */

module.exports = {
    // ========================================
    // CONFIGURACIÓN DE LOGS - OPTIMIZADA PARA DESARROLLO
    // ========================================
    
    logging: {
        // Habilitar logs detallados solo en desarrollo
        verbose: true,
        
        // Nivel de logs para desarrollo
        level: 'debug',
        
        // Filtrar logs de depuración del frontend
        filterFrontendLogs: true,
        
        // Logs específicos a mostrar
        showLogs: {
            api: true,
            database: true,
            errors: true,
            frontend: false, // Deshabilitar logs del frontend
            booking: false   // Deshabilitar logs específicos de booking
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE SSL/HTTPS - DESARROLLO
    // ========================================
    
    ssl: {
        // Manejar errores de SSL en desarrollo
        handleSSLErrors: true,
        
        // Redirigir HTTPS a HTTP en desarrollo
        redirectHTTPS: true,
        
        // Mensajes de error personalizados
        errorMessages: {
            sslError: 'Error de SSL detectado. Redirigiendo a HTTP...',
            protocolError: 'Error de protocolo. Verificando configuración...'
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DEL FRONTEND - DESARROLLO
    // ========================================
    
    frontend: {
        // Deshabilitar logs de depuración en el frontend
        disableDebugLogs: true,
        
        // Mensajes de error simplificados
        simplifiedErrors: true,
        
        // Timeout para operaciones del frontend
        timeout: 10000,
        
        // Reintentos automáticos
        autoRetry: {
            enabled: true,
            maxRetries: 3,
            delay: 1000
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE BOOKING - DESARROLLO
    // ========================================
    
    booking: {
        // Deshabilitar logs de depuración en booking
        disableDebugLogs: true,
        
        // Manejo de errores mejorado
        errorHandling: {
            showUserFriendlyErrors: true,
            logTechnicalErrors: false,
            autoRecover: true
        },
        
        // Validación de formularios
        validation: {
            strict: false,
            showDetailedErrors: false
        }
    },
    
    // ========================================
    // CONFIGURACIÓN DE DESARROLLO GENERAL
    // ========================================
    
    development: {
        // Modo de desarrollo
        mode: 'development',
        
        // Hot reload
        hotReload: true,
        
        // Debug mode
        debug: false,
        
        // Mostrar errores detallados
        showDetailedErrors: false,
        
        // Auto-refresh
        autoRefresh: true
    }
};
