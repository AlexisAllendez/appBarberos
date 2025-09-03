/**
 * Middleware para manejo de errores de SSL y filtrado de logs en desarrollo
 */

const developmentConfig = require('../config/development');

// Middleware para manejar errores de SSL
function handleSSLErrors(req, res, next) {
    // Detectar si la solicitud viene de HTTPS pero el servidor está en HTTP
    if (req.headers['x-forwarded-proto'] === 'https' && req.protocol === 'http') {
        // Redirigir a HTTP en desarrollo
        const httpUrl = `http://${req.get('host')}${req.url}`;
        return res.redirect(httpUrl);
    }
    
    next();
}

// Middleware para filtrar logs del frontend
function filterFrontendLogs(req, res, next) {
    // Interceptar logs del frontend y filtrarlos según la configuración
    const originalLog = console.log;
    const originalError = console.error;
    
    if (developmentConfig.logging.filterFrontendLogs) {
        console.log = function(...args) {
            const message = args.join(' ');
            
            // Filtrar logs específicos del frontend
            if (message.includes('🔍') || 
                message.includes('🔄') || 
                message.includes('✅') || 
                message.includes('🧹') ||
                message.includes('loadAvailableSlots') ||
                message.includes('selectedBarberId') ||
                message.includes('Servicio seleccionado') ||
                message.includes('Barbero seleccionado')) {
                return; // No mostrar estos logs
            }
            
            originalLog.apply(console, args);
        };
        
        console.error = function(...args) {
            const message = args.join(' ');
            
            // Filtrar errores específicos del frontend que no son críticos
            if (message.includes('parentElement') && message.includes('null')) {
                return; // No mostrar errores de parentElement null
            }
            
            originalError.apply(console, args);
        };
    }
    
    next();
}

// Middleware para manejo de errores de protocolo
function handleProtocolErrors(err, req, res, next) {
    if (err.code === 'ECONNRESET' || err.code === 'ERR_SSL_PROTOCOL_ERROR') {
        // Error de SSL/protocolo detectado
        console.log(`[SSL Error] ${developmentConfig.ssl.errorMessages.sslError}`);
        
        // Redirigir a HTTP si es necesario
        if (developmentConfig.ssl.redirectHTTPS) {
            const httpUrl = `http://${req.get('host')}${req.url}`;
            return res.redirect(httpUrl);
        }
    }
    
    next(err);
}

// Middleware para simplificar errores del frontend
function simplifyFrontendErrors(req, res, next) {
    if (developmentConfig.frontend.simplifiedErrors) {
        // Interceptar respuestas de error y simplificarlas
        const originalJson = res.json;
        
        res.json = function(data) {
            if (data && data.success === false) {
                // Simplificar mensajes de error para el frontend
                if (data.message && data.message.includes('parentElement')) {
                    data.message = 'Error de configuración. Recargando página...';
                }
            }
            
            return originalJson.call(this, data);
        };
    }
    
    next();
}

module.exports = {
    handleSSLErrors,
    filterFrontendLogs,
    handleProtocolErrors,
    simplifyFrontendErrors
};
