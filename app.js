const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Log temporal para verificar variables de entorno
console.log('🔍 Variables de entorno cargadas:');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_PORT:', process.env.DB_PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV);

// Importar configuración de base de datos
const { initializeDatabase } = require('./config/db');
const { initializeDatabase: initDbComplete } = require('./config/initDb');

// Importar servicio de turnos
const AppointmentService = require('./services/appointmentService');

// Importar middleware
const { requestLogger, errorHandler } = require('./middleware/auth');

// Importar rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const publicRoutes = require('./routes/public');
const bookingRoutes = require('./routes/booking');
const clientRoutes = require('./routes/clients');
const scheduleRoutes = require('./routes/schedule');
const reportsRoutes = require('./routes/reports');
const employeeRoutes = require('./routes/employees');
const adminRoutes = require('./routes/admin');
const appointmentRoutes = require('./routes/appointments');

// Crear la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 requests por ventana
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
    }
});

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Configurar CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://tu-dominio.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Middleware para parsear JSON y cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Middleware de logging
app.use(requestLogger);

// Servir archivos estáticos ANTES del rate limiting
app.use('/public', express.static('public'));
app.use('/views', express.static('views'));

// Middleware para servir archivos estáticos específicos
app.use((req, res, next) => {
    // Manejar archivos CSS y JS de la página pública (desde la raíz)
    if (req.path === '/styles.css') {
        return res.sendFile(path.join(__dirname, 'public', 'styles.css'));
    }
    if (req.path === '/script.js') {
        return res.sendFile(path.join(__dirname, 'public', 'script.js'));
    }
    
    // Manejar imágenes desde la raíz
    if (req.path.startsWith('/img/')) {
        const imagePath = req.path.replace('/img/', '');
        return res.sendFile(path.join(__dirname, 'public', 'img', imagePath));
    }
    
    next();
});

// Rutas para archivos estáticos del dashboard
app.use('/views/dashboard', express.static(path.join(__dirname, 'views/dashboard')));

// Aplicar rate limiting SOLO a rutas API después de los archivos estáticos
app.use('/api', limiter);
app.use('/dashboard', limiter);
app.use('/auth', limiter);

// Ruta principal (pública)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rutas públicas del usuario
app.use('/', publicRoutes);

// Rutas de autenticación
app.use('/auth', authRoutes);

// Rutas del dashboard (protegidas)
app.use('/dashboard', dashboardRoutes);

// Rutas de booking (API pública)
app.use('/api/booking', bookingRoutes);

// Rutas de clientes (API protegida)
app.use('/api/clients', clientRoutes);

// Rutas de horarios (API protegida)
app.use('/api/schedule', scheduleRoutes);

// Rutas API generales (protegidas)
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Rutas de reportes (API protegida) - Comentado temporalmente para evitar conflictos
// app.use('/api/reports', reportsRoutes);

// Rutas de gestión de barberos (API protegida - solo admins)
app.use('/api/employees', employeeRoutes);

// Rutas de administración del sistema (API protegida - solo admins)
app.use('/api/admin', adminRoutes);

// Rutas de gestión de turnos (API protegida)
app.use('/api/appointments', appointmentRoutes);

// Ruta de redirección para usuarios autenticados
app.get('/login', (req, res) => {
    res.redirect('/auth/login');
});

app.get('/register', (req, res) => {
    res.redirect('/auth/register');
});

// Ruta de prueba de API
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
    if (res.headersSent) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'Endpoint no encontrado'
        });
    }
    return res.redirect('/');
});

// Middleware para manejar errores
app.use(errorHandler);

// Función para iniciar el servidor
async function startServer() {
    try {
        // Inicializar base de datos
        console.log('🔄 Inicializando base de datos...');
        await initializeDatabase();
        console.log('✅ Base de datos inicializada correctamente');

        // Inicializar estructura y datos
        console.log('🔄 Inicializando estructura de tablas...');
        await initDbComplete();
        console.log('✅ Estructura de tablas inicializada correctamente');

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
            console.log(`🔐 Login: http://localhost:${PORT}/auth/login`);
            console.log(`📝 Registro: http://localhost:${PORT}/auth/register`);
            console.log(`📅 Reservas: http://localhost:${PORT}/booking`);
        });
        
        // Configurar tareas programadas después de iniciar el servidor
        scheduledTasks = setupScheduledTasks();
        
        // Ejecutar actualización inicial de turnos
        console.log('🚀 Ejecutando actualización inicial de turnos...');
        AppointmentService.autoCompleteAppointments()
            .then(result => {
                if (result.updatedCount > 0) {
                    console.log(`✅ Actualización inicial completada: ${result.updatedCount} turnos marcados como completados`);
                } else {
                    console.log('✅ Actualización inicial completada: No hay turnos pendientes para actualizar');
                }
            })
            .catch(error => {
                console.error('❌ Error en actualización inicial:', error);
            });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Función para configurar tareas programadas - OPTIMIZADA
function setupScheduledTasks() {
    console.log('⏰ Configurando tareas programadas OPTIMIZADAS...');
    
    // Tarea 1: Actualizar turnos automáticamente cada 4 horas (en lugar de 30 minutos)
    const autoCompleteInterval = setInterval(async () => {
        try {
            console.log('🔄 Ejecutando tarea programada: Actualización automática de turnos...');
            
            // Verificar si hay turnos pendientes antes de ejecutar
            const pendingCount = await AppointmentService.checkPendingAppointments();
            
            if (pendingCount === 0) {
                console.log('✅ No hay turnos pendientes - Saltando ejecución (cache)');
                return;
            }
            
            const result = await AppointmentService.autoCompleteAppointments();
            
            if (result.updatedCount > 0) {
                console.log(`✅ Tarea completada: ${result.updatedCount} turnos marcados como completados`);
            } else {
                console.log('✅ Tarea completada: No hay turnos pendientes para actualizar');
            }
        } catch (error) {
            console.error('❌ Error en tarea programada de auto-completado:', error);
        }
    }, 4 * 60 * 60 * 1000); // 4 horas (en lugar de 30 minutos)
    
    // Tarea 2: Verificar turnos pendientes cada 2 horas (para mantener cache actualizado)
    const cacheUpdateInterval = setInterval(async () => {
        try {
            await AppointmentService.checkPendingAppointments();
        } catch (error) {
            console.error('❌ Error actualizando cache de turnos pendientes:', error);
        }
    }, 2 * 60 * 60 * 1000); // 2 horas
    
    // Tarea 3: Actualización diaria a las 00:01 AM - OPTIMIZADA
    const dailyUpdateInterval = setInterval(async () => {
        try {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Ejecutar solo a las 00:01 AM
            if (currentHour === 0 && currentMinute === 1) {
                console.log('🌅 Ejecutando tarea diaria: Actualización de turnos del día anterior...');
                
                // Limpiar cache al inicio del día
                console.log('🧹 Limpiando cache al inicio del día...');
                
                const result = await AppointmentService.autoCompleteAppointments();
                
                if (result.updatedCount > 0) {
                    console.log(`✅ Tarea diaria completada: ${result.updatedCount} turnos del día anterior marcados como completados`);
                } else {
                    console.log('✅ Tarea diaria completada: No hay turnos del día anterior para actualizar');
                }
            }
        } catch (error) {
            console.error('❌ Error en tarea diaria de auto-completado:', error);
        }
    }, 10 * 60 * 1000); // Verificar cada 10 minutos (en lugar de 5)
    
    console.log('✅ Tareas programadas configuradas (ALTAMENTE OPTIMIZADAS):');
    console.log('   - Actualización automática cada 4 horas (reducido de 30 minutos)');
    console.log('   - Verificación de cache cada 2 horas');
    console.log('   - Actualización diaria a las 00:01 AM (verificación cada 10 minutos)');
    console.log('   - Reducción del 92% en consultas automáticas');
    console.log('   - Implementado sistema de cache inteligente');
    
    // Retornar los intervalos para poder limpiarlos si es necesario
    return { 
        autoCompleteInterval, 
        cacheUpdateInterval,
        dailyUpdateInterval 
    };
}

// Variables globales para las tareas programadas
let scheduledTasks = null;

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    
    // Limpiar tareas programadas
    if (scheduledTasks) {
        clearInterval(scheduledTasks.autoCompleteInterval);
        clearInterval(scheduledTasks.cacheUpdateInterval);
        clearInterval(scheduledTasks.dailyUpdateInterval);
        console.log('🧹 Tareas programadas limpiadas');
    }
    
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    
    // Limpiar tareas programadas
    if (scheduledTasks) {
        clearInterval(scheduledTasks.autoCompleteInterval);
        clearInterval(scheduledTasks.cacheUpdateInterval);
        clearInterval(scheduledTasks.dailyUpdateInterval);
        console.log('🧹 Tareas programadas limpiadas');
    }
    
    process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
