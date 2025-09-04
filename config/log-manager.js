/**
 * Configuración de Logs para Producción
 * Deshabilita logs de depuración en producción para mejorar el rendimiento
 */

const isProduction = process.env.NODE_ENV === 'production';

// Función para log condicional
function conditionalLog(level, message, ...args) {
    if (!isProduction) {
        // En desarrollo, mostrar todos los logs
        switch (level) {
            case 'log':
                console.log(message, ...args);
                break;
            case 'warn':
                console.warn(message, ...args);
                break;
            case 'error':
                console.error(message, ...args);
                break;
            case 'info':
                console.info(message, ...args);
                break;
        }
    } else {
        // En producción, solo mostrar errores críticos
        if (level === 'error') {
            console.error(message, ...args);
        }
    }
}

// Sobrescribir console.log para filtrar logs de depuración
if (isProduction) {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    console.log = function(...args) {
        const message = args.join(' ');
        
        // Filtrar logs de depuración específicos
        if (message.includes('🔍') || 
            message.includes('🔄') || 
            message.includes('✅') || 
            message.includes('🆕') ||
            message.includes('generateSmartSlots') ||
            message.includes('getAvailableSlots') ||
            message.includes('Configuración del barbero') ||
            message.includes('Intervalo configurado') ||
            message.includes('Slot actual') ||
            message.includes('Avanzando de') ||
            message.includes('Total de slots generados') ||
            message.includes('Slots:') ||
            message.includes('Próximos turnos encontrados') ||
            message.includes('Turno ID:') ||
            message.includes('Buscando cliente por teléfono') ||
            message.includes('Cliente encontrado') ||
            message.includes('Actualizando información del cliente') ||
            message.includes('Creando nuevo cliente') ||
            message.includes('Buscando clientes por nombre') ||
            message.includes('Fecha original') ||
            message.includes('Fecha formateada')) {
            return; // No mostrar estos logs en producción
        }
        
        originalLog.apply(console, args);
    };
    
    console.warn = function(...args) {
        const message = args.join(' ');
        
        // Filtrar warnings de depuración
        if (message.includes('⚠️') && 
            (message.includes('servicio_id') || 
             message.includes('duración por defecto') ||
             message.includes('generateAvailableSlots está deprecada'))) {
            return; // No mostrar estos warnings en producción
        }
        
        originalWarn.apply(console, args);
    };
    
    console.info = function(...args) {
        const message = args.join(' ');
        
        // Filtrar info de depuración
        if (message.includes('🔍') || message.includes('🔄')) {
            return; // No mostrar info de depuración en producción
        }
        
        originalInfo.apply(console, args);
    };
}

module.exports = {
    conditionalLog,
    isProduction
};
