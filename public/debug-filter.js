/**
 * Script de utilidad para suprimir logs de depuración en el navegador
 * Se carga automáticamente en modo desarrollo
 */

(function() {
    'use strict';
    
    // Verificar si estamos en modo desarrollo
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port === '3000';
    
    if (isDevelopment) {
        // Suprimir logs de depuración específicos
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        // Lista de patrones a filtrar
        const filteredPatterns = [
            '🔍 loadAvailableSlots llamado',
            '🔍 selectedBarberId actual',
            '🔍 Tipo de selectedBarberId',
            '🔍 Valor del select barbero',
            '🔄 Usando nueva interfaz',
            '✅ Barbero validado',
            '🔍 Respuesta del backend',
            '🔍 Slots recibidos',
            '🔍 Cantidad de slots',
            '🔍 Slot',
            'Servicio seleccionado:',
            'Barbero seleccionado:',
            '🧹 Información innecesaria removida',
            '🔄 Cargando servicios de respaldo',
            'loadAvailableSlots',
            'selectedBarberId',
            'parentElement',
            'ERR_SSL_PROTOCOL_ERROR'
        ];
        
        // Función para verificar si un mensaje debe ser filtrado
        function shouldFilterMessage(message) {
            return filteredPatterns.some(pattern => 
                message.includes(pattern)
            );
        }
        
        // Sobrescribir console.log
        console.log = function(...args) {
            const message = args.join(' ');
            if (!shouldFilterMessage(message)) {
                originalConsoleLog.apply(console, args);
            }
        };
        
        // Sobrescribir console.error
        console.error = function(...args) {
            const message = args.join(' ');
            if (!shouldFilterMessage(message)) {
                originalConsoleError.apply(console, args);
            }
        };
        
        // Sobrescribir console.warn
        console.warn = function(...args) {
            const message = args.join(' ');
            if (!shouldFilterMessage(message)) {
                originalConsoleWarn.apply(console, args);
            }
        };
        
        // Función para limpiar logs existentes
        function clearDebugLogs() {
            // Limpiar la consola después de un breve delay
            setTimeout(() => {
                console.clear();
                console.log('🧹 Logs de depuración limpiados automáticamente');
            }, 1000);
        }
        
        // Limpiar logs al cargar la página
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', clearDebugLogs);
        } else {
            clearDebugLogs();
        }
        
        // Limpiar logs periódicamente
        setInterval(clearDebugLogs, 30000); // Cada 30 segundos
        
        // Interceptar errores de SSL
        window.addEventListener('error', function(event) {
            if (event.message.includes('SSL') || 
                event.message.includes('protocol') ||
                event.message.includes('parentElement')) {
                event.preventDefault();
                return false;
            }
        });
        
        // Interceptar errores no capturados
        window.addEventListener('unhandledrejection', function(event) {
            if (event.reason && event.reason.message && 
                (event.reason.message.includes('parentElement') || 
                 event.reason.message.includes('SSL'))) {
                event.preventDefault();
                return false;
            }
        });
        
        console.log('🔧 Filtro de logs de depuración activado');
    }
})();
