const { query } = require('../config/db');
const path = require('path');


// Renderizar dashboard
async function renderDashboard(req, res) {
    try {
        res.sendFile(path.join(__dirname, '..', 'views', 'dashboard', 'index.html'));
    } catch (error) {
        console.error('Error renderizando dashboard:', error);
        if (!res.headersSent) {
            res.status(500).send('Error interno del servidor');
        }
    }
}

// Obtener estadísticas del dashboard
async function getDashboardStats(req, res) {
    try {
        const userId = req.user.id;
        
        // Usar consistentemente funciones de MySQL para evitar problemas de zona horaria

        // Estadísticas de hoy
        const todayStats = await query(`
            SELECT 
                COUNT(*) as total_turnos,
                SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as turnos_completados,
                SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END) as turnos_confirmados,
                SUM(CASE WHEN estado = 'reservado' THEN 1 ELSE 0 END) as turnos_reservados,
                SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as turnos_cancelados,
                SUM(CASE WHEN estado = 'completado' THEN precio_final ELSE 0 END) as total_recaudado
            FROM turnos 
            WHERE id_usuario = ? AND fecha = CURDATE()
        `, [userId]);


        // Estadísticas de la semana
        const weekStats = await query(`
            SELECT 
                COUNT(*) as total_turnos,
                SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as turnos_completados,
                SUM(CASE WHEN estado = 'completado' THEN precio_final ELSE 0 END) as total_recaudado
            FROM turnos 
            WHERE id_usuario = ? 
            AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `, [userId]);

        // Estadísticas del mes
        const monthStats = await query(`
            SELECT 
                COUNT(*) as total_turnos,
                SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as turnos_completados,
                SUM(CASE WHEN estado = 'completado' THEN precio_final ELSE 0 END) as total_recaudado
            FROM turnos 
            WHERE id_usuario = ? 
            AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `, [userId]);

        // Próximos turnos
        const upcomingTurnos = await query(`
            SELECT 
                t.id,
                DATE_FORMAT(t.fecha, '%Y-%m-%d') as fecha,
                t.hora_inicio,
                t.hora_fin,
                t.estado,
                t.precio_final,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                s.nombre as servicio_nombre
            FROM turnos t
            JOIN clientes c ON t.id_cliente = c.id
            JOIN servicios s ON t.id_servicio = s.id
            WHERE t.id_usuario = ? 
            AND t.fecha >= CURDATE()
            AND t.estado IN ('reservado', 'confirmado')
            ORDER BY t.fecha ASC, t.hora_inicio ASC
            LIMIT 10
        `, [userId]);

        // Servicios más populares
        const popularServices = await query(`
            SELECT 
                s.nombre,
                s.precio,
                COUNT(*) as total_reservas,
                SUM(CASE WHEN t.estado = 'completado' THEN t.precio_final ELSE 0 END) as total_recaudado
            FROM servicios s
            LEFT JOIN turnos t ON s.id = t.id_servicio
            WHERE s.id_usuario = ?
            GROUP BY s.id, s.nombre, s.precio
            ORDER BY total_reservas DESC
            LIMIT 5
        `, [userId]);

        // Clientes más frecuentes
        const topClients = await query(`
            SELECT 
                c.nombre,
                c.apellido,
                c.telefono,
                COUNT(*) as total_visitas,
                SUM(CASE WHEN t.estado = 'completado' THEN t.precio_final ELSE 0 END) as total_gastado
            FROM clientes c
            JOIN turnos t ON c.id = t.id_cliente
            WHERE t.id_usuario = ?
            GROUP BY c.id, c.nombre, c.apellido, c.telefono
            ORDER BY total_visitas DESC
            LIMIT 5
        `, [userId]);




        if (!res.headersSent) {
            res.json({
                success: true,
                stats: {
                    today: todayStats[0] || {
                        total_turnos: 0,
                        turnos_completados: 0,
                        turnos_confirmados: 0,
                        turnos_reservados: 0,
                        turnos_cancelados: 0,
                        total_recaudado: 0
                    },
                    week: weekStats[0] || {
                        total_turnos: 0,
                        turnos_completados: 0,
                        total_recaudado: 0
                    },
                    month: monthStats[0] || {
                        total_turnos: 0,
                        turnos_completados: 0,
                        total_recaudado: 0
                    }
                },
                upcomingTurnos,
                popularServices,
                topClients
            });
        }

    } catch (error) {
        console.error('Error obteniendo estadísticas del dashboard:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Obtener configuración del barbero
async function getBarberConfig(req, res) {
    try {
        const userId = req.user.id;

        const config = await query(`
            SELECT * FROM configuracion_barbero 
            WHERE id_usuario = ?
        `, [userId]);

        if (config.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Configuración no encontrada'
                });
            }
            return;
        }

        if (!res.headersSent) {
            res.json({
                success: true,
                config: config[0]
            });
        }

    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Actualizar configuración del barbero
async function updateBarberConfig(req, res) {
    try {
        const userId = req.user.id;
        const {
            intervalo_turnos,
            anticipacion_reserva,
            max_reservas_dia,
            permitir_reservas_mismo_dia,
            mostrar_precios,
            notificaciones_email,
            notificaciones_sms,
            moneda,
            zona_horaria
        } = req.body;

        await query(`
            UPDATE configuracion_barbero 
            SET 
                intervalo_turnos = ?,
                anticipacion_reserva = ?,
                max_reservas_dia = ?,
                permitir_reservas_mismo_dia = ?,
                mostrar_precios = ?,
                notificaciones_email = ?,
                notificaciones_sms = ?,
                moneda = ?,
                zona_horaria = ?
            WHERE id_usuario = ?
        `, [
            intervalo_turnos || 30,
            anticipacion_reserva || 1440,
            max_reservas_dia || 20,
            permitir_reservas_mismo_dia !== undefined ? permitir_reservas_mismo_dia : true,
            mostrar_precios !== undefined ? mostrar_precios : true,
            notificaciones_email !== undefined ? notificaciones_email : true,
            notificaciones_sms !== undefined ? notificaciones_sms : false,
            moneda || 'ARS',
            zona_horaria || 'America/Argentina/Buenos_Aires',
            userId
        ]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Configuración actualizada exitosamente'
            });
        }

    } catch (error) {
        console.error('Error actualizando configuración:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Obtener todas las citas con filtros
async function getAllAppointments(req, res) {
    try {
        const userId = req.user.id;
        const { 
            fecha_inicio, 
            fecha_fin, 
            estado, 
            cliente_id, 
            servicio_id,
            page = 1,
            limit = 20
        } = req.query;

        let whereConditions = ['t.id_usuario = ?'];
        let params = [userId];
        let offset = (page - 1) * limit;

        if (fecha_inicio) {
            whereConditions.push('t.fecha >= ?');
            params.push(fecha_inicio);
        }

        if (fecha_fin) {
            whereConditions.push('t.fecha <= ?');
            params.push(fecha_fin);
        }

        if (estado) {
            whereConditions.push('t.estado = ?');
            params.push(estado);
        }

        if (cliente_id) {
            whereConditions.push('t.id_cliente = ?');
            params.push(cliente_id);
        }

        if (servicio_id) {
            whereConditions.push('t.id_servicio = ?');
            params.push(servicio_id);
        }

        const whereClause = whereConditions.join(' AND ');

        // Debug: Ver qué parámetros se están pasando

        
        // Debug: Mostrar la consulta SQL completa
        const debugSQL = `
            SELECT
                t.id,
                t.fecha,
                t.hora_inicio,
                t.hora_fin,
                t.estado,
                t.precio_final,
                t.notas,
                t.codigo_cancelacion,
                c.id as cliente_id,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                s.id as servicio_id,
                s.nombre as servicio_nombre,
                s.precio as servicio_precio
            FROM turnos t
            JOIN clientes c ON t.id_cliente = c.id
            JOIN servicios s ON t.id_servicio = s.id
            WHERE ${whereClause}
            ORDER BY 
                t.id DESC
            LIMIT ? OFFSET ?
        `;

        
        // Asegurar que limit y offset sean números
        const limitNum = parseInt(limit) || 20;
        const offsetNum = parseInt(offset) || 0;
        
        const finalParams = [...params, limitNum, offsetNum];


        // Obtener citas
        const appointments = await query(`
            SELECT 
                t.id,
                t.fecha,
                t.hora_inicio,
                t.hora_fin,
                t.estado,
                t.precio_final,
                t.notas,
                t.codigo_cancelacion,
                c.id as cliente_id,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                s.id as servicio_id,
                s.nombre as servicio_nombre,
                s.precio as servicio_precio
            FROM turnos t
            JOIN clientes c ON t.id_cliente = c.id
            JOIN servicios s ON t.id_servicio = s.id
            WHERE ${whereClause}
            ORDER BY 
                t.id DESC
            LIMIT ? OFFSET ?
        `, finalParams);

        // Debug: Mostrar los resultados ordenados

        


        // Obtener total de registros para paginación
        const totalResult = await query(`
            SELECT COUNT(*) as total
            FROM turnos t
            JOIN clientes c ON t.id_cliente = c.id
            JOIN servicios s ON t.id_servicio = s.id
            WHERE ${whereClause}
        `, params);

        const total = totalResult[0].total;

        if (!res.headersSent) {
            res.json({
                success: true,
                data: appointments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        }

    } catch (error) {
        console.error('Error obteniendo citas:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Obtener detalles de una cita específica
async function getAppointmentDetails(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const appointment = await query(`
            SELECT 
                t.id,
                t.fecha,
                t.hora_inicio,
                t.hora_fin,
                t.estado,
                t.precio_final,
                t.notas,
                t.codigo_cancelacion,
                c.id as cliente_id,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                c.notas as cliente_notas,
                s.id as servicio_id,
                s.nombre as servicio_nombre,
                s.descripcion as servicio_descripcion,
                s.precio as servicio_precio,
                'Configurado' as servicio_duracion
            FROM turnos t
            JOIN clientes c ON t.id_cliente = c.id
            JOIN servicios s ON t.id_servicio = s.id
            WHERE t.id = ? AND t.id_usuario = ?
        `, [id, userId]);

        if (appointment.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cita no encontrada'
                });
            }
            return;
        }

        if (!res.headersSent) {
            res.json({
                success: true,
                data: appointment[0]
            });
        }

    } catch (error) {
        console.error('Error obteniendo detalles de cita:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Actualizar estado de una cita
async function updateAppointmentStatus(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { estado, notas } = req.body;

        // Validar estado
        const validStates = ['reservado', 'confirmado', 'en_proceso', 'completado', 'cancelado', 'no_show'];
        if (!validStates.includes(estado)) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado no válido'
                });
            }
            return;
        }

        // Verificar que la cita pertenece al usuario
        const appointment = await query(`
            SELECT id FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (appointment.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cita no encontrada'
                });
            }
            return;
        }

        // Actualizar estado
        await query(`
            UPDATE turnos 
            SET estado = ?, notas = COALESCE(?, notas)
            WHERE id = ? AND id_usuario = ?
        `, [estado, notas, id, userId]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Estado de cita actualizado exitosamente'
            });
        }

    } catch (error) {
        console.error('Error actualizando estado de cita:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Eliminar una cita
async function deleteAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Verificar que la cita pertenece al usuario
        const appointment = await query(`
            SELECT id FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (appointment.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cita no encontrada'
                });
            }
            return;
        }

        // Eliminar cita
        await query(`
            DELETE FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Cita eliminada exitosamente'
            });
        }

    } catch (error) {
        console.error('Error eliminando cita:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Obtener todos los clientes con filtros
async function getAllClients(req, res) {
    try {
        const userId = req.user.id;
        
        const { 
            search, 
            page = 1,
            limit = 20
        } = req.query;

        let clients;
        let total;

        if (search) {
            // Usar el método del modelo para búsqueda
            const Client = require('../models/Client');
            clients = await Client.searchByName(userId, search, parseInt(limit));
            total = clients.length;
        } else {
            // Usar el método del modelo para obtener todos los clientes
            const Client = require('../models/Client');
            clients = await Client.findByBarber(userId, parseInt(limit), (page - 1) * limit);
            
            // Obtener total de clientes para paginación
            const totalResult = await Client.findByBarber(userId, 1000, 0);
            total = totalResult.length;
        }

        if (!res.headersSent) {
            res.json({
                success: true,
                data: {
                    clients: clients,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });
        }

            } catch (error) {
            console.error('Error obteniendo clientes:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor'
                });
            }
        }
    }

    // Función de prueba para diagnosticar problemas
    async function debugClientData(req, res) {
        try {
            const userId = req.user.id;
            
            // Verificar si hay turnos para este usuario
            const turnos = await query(`
                SELECT COUNT(*) as total_turnos 
                FROM turnos 
                WHERE id_usuario = ?
            `, [userId]);
            
            // Verificar si hay clientes en general
            const clientes = await query(`
                SELECT COUNT(*) as total_clientes 
                FROM clientes
            `);
            
            // Verificar clientes con turnos para este usuario
            const clientesConTurnos = await query(`
                SELECT COUNT(DISTINCT c.id) as clientes_con_turnos
                FROM clientes c
                INNER JOIN turnos t ON c.id = t.id_cliente AND t.id_usuario = ?
            `, [userId]);
            
            res.json({
                success: true,
                debug: {
                    userId,
                    totalTurnos: turnos[0].total_turnos,
                    totalClientes: clientes[0].total_clientes,
                    clientesConTurnos: clientesConTurnos[0].clientes_con_turnos
                }
            });
            
        } catch (error) {
            console.error('DEBUG Error:', error);
            res.status(500).json({
                success: false,
                message: 'Error en debug',
                error: error.message
            });
        }
    }

    // Obtener reporte general filtrado por usuario
    async function getGeneralReport(req, res) {
        try {
            const userId = req.user.id;
            const { period, startDate, endDate } = req.query;
            
            // Determinar fechas según el período
            const { start, end } = calculateDateRange(period, startDate, endDate);
            

            
            // Obtener métricas del período filtradas por usuario
            const metrics = await getMetricsForPeriod(userId, start, end);
            
            // Obtener datos para gráficos filtrados por usuario
            const charts = await getChartData(userId, start, end);
            
            // Obtener datos para tablas filtrados por usuario
            const tables = await getTableData(userId, start, end);
            
            res.json({
                success: true,
                data: {
                    period: { start, end, label: getPeriodLabel(period) },
                    metrics,
                    charts,
                    tables
                }
            });
            
        } catch (error) {
            console.error('Error generando reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Calcular rango de fechas según el período
    function calculateDateRange(period, startDate, endDate) {
        // SOLUCIÓN SIMPLE: Usar la fecha actual del sistema
        const now = new Date();
        
        let start, end;
        

        
        switch (period) {
            case 'today':
                // Hoy: solo la fecha, sin horas (evita problemas de zona horaria)
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
                
            case 'yesterday':
                // Ayer: solo la fecha, sin horas
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                break;
                
            case 'week':
                // Esta semana: desde lunes hasta domingo (solo fechas)
                const dayOfWeek = now.getDay();
                const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = domingo, 1 = lunes
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
                end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
                break;
                
            case 'month':
                // Este mes: desde el día 1 hasta el último día (solo fechas)
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
                
            case 'quarter':
                // Este trimestre: desde el primer mes del trimestre hasta el último (solo fechas)
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
                
            case 'year':
                // Este año: desde 1 de enero hasta 31 de diciembre (solo fechas)
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
                
            case 'custom':
                // Fechas personalizadas: solo fechas
                start = new Date(startDate);
                end = new Date(endDate);
                break;
                
            default:
                // Por defecto: este mes (solo fechas)
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        

        
        return { start, end };
    }

    // Obtener etiqueta del período
    function getPeriodLabel(period) {
        const labels = {
            today: 'Hoy',
            yesterday: 'Ayer',
            week: 'Esta Semana',
            month: 'Este Mes',
            quarter: 'Este Trimestre',
            year: 'Este Año',
            custom: 'Personalizado'
        };
        return labels[period] || 'Período';
    }

    // Obtener métricas para el período filtradas por usuario
    async function getMetricsForPeriod(userId, start, end) {
        try {
            // Formatear fechas para MySQL (YYYY-MM-DD HH:MM:SS)
            const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
            const endStr = end.toISOString().slice(0, 19).replace('T', ' ');
            
            
            
            // Consulta para métricas básicas filtrada por usuario
            const metricsResult = await query(`
                SELECT 
                    COUNT(CASE WHEN estado = 'completado' THEN 1 END) as totalTurnos,
                    SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completedTurnos,
                    SUM(CASE WHEN estado IN ('reservado', 'en_proceso') THEN 1 ELSE 0 END) as pendingTurnos,
                    SUM(CASE WHEN estado = 'completado' THEN precio_final ELSE 0 END) as totalRevenue,
                    COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as cancelledTurnos,
                    COUNT(CASE WHEN estado = 'no_show' THEN 1 END) as noShowTurnos
                FROM turnos 
                WHERE id_usuario = ? 
                AND fecha >= ? 
                AND fecha <= ?
                AND estado NOT IN ('cancelado', 'no_show')
            `, [userId, startStr.split(' ')[0], endStr.split(' ')[0]]);
            
            const metrics = metricsResult[0];
            

            
            // Calcular métricas derivadas
            const totalRevenue = parseFloat(metrics.totalRevenue) || 0;
            const completedTurnos = parseInt(metrics.completedTurnos) || 0;
            const pendingTurnos = parseInt(metrics.pendingTurnos) || 0;
            const cancelledTurnos = parseInt(metrics.cancelledTurnos) || 0;
            const noShowTurnos = parseInt(metrics.noShowTurnos) || 0;
            
            const promedioPorTurno = completedTurnos > 0 ? totalRevenue / completedTurnos : 0;
            const tasaCompletado = (completedTurnos + pendingTurnos) > 0 ? 
                (completedTurnos / (completedTurnos + pendingTurnos)) * 100 : 0;
            const tasaCancelacion = (completedTurnos + pendingTurnos + cancelledTurnos) > 0 ? 
                (cancelledTurnos / (completedTurnos + pendingTurnos + cancelledTurnos)) * 100 : 0;
            
            const horasTrabajadas = completedTurnos * 0.75;
            const ingresosPorHora = horasTrabajadas > 0 ? totalRevenue / horasTrabajadas : 0;
            
            return {
                totalTurnos: completedTurnos,
                completedTurnos: completedTurnos,
                pendingTurnos: pendingTurnos,
                totalRevenue: totalRevenue,
                promedioPorTurno: promedioPorTurno,
                ingresosPorHora: ingresosPorHora,
                tasaCompletado: Math.round(tasaCompletado * 100) / 100,
                tasaCancelacion: Math.round(tasaCancelacion * 100) / 100,
                turnosCancelados: cancelledTurnos,
                noShows: noShowTurnos
            };
            
        } catch (error) {
            console.error('Error obteniendo métricas:', error);
            return {
                totalTurnos: 0, completedTurnos: 0, pendingTurnos: 0, totalRevenue: 0,
                promedioPorTurno: 0, ingresosPorHora: 0, tasaCompletado: 0, tasaCancelacion: 0,
                turnosCancelados: 0, noShows: 0
            };
        }
    }

    // Obtener datos para gráficos filtrados por usuario
    async function getChartData(userId, start, end) {
        try {
            // Formatear fechas para MySQL
            const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
            const endStr = end.toISOString().slice(0, 19).replace('T', ' ');
            
            // Datos para gráfico de ingresos por período filtrados por usuario
            const revenueData = await query(`
                SELECT 
                    fecha,
                    SUM(CASE WHEN estado = 'completado' THEN precio_final ELSE 0 END) as ingresos,
                    COUNT(CASE WHEN estado = 'completado' THEN 1 END) as turnos
                FROM turnos 
                WHERE id_usuario = ? 
                AND fecha >= DATE(?) 
                AND fecha <= DATE(?)
                AND estado NOT IN ('cancelado', 'no_show')
                GROUP BY fecha
                ORDER BY fecha
            `, [userId, startStr, endStr]);
            
            return {
                revenueByPeriod: revenueData
            };
            
        } catch (error) {
            console.error('Error obteniendo datos de gráficos:', error);
            return { revenueByPeriod: [] };
        }
    }

    // Obtener datos para tablas filtrados por usuario
    async function getTableData(userId, start, end) {
        try {
            // Formatear fechas para MySQL
            const startStr = start.toISOString().slice(0, 19).replace('T', ' ');
            const endStr = end.toISOString().slice(0, 19).replace('T', ' ');
            
            // Top servicios del período filtrados por usuario
            const topServices = await query(`
                SELECT 
                    s.nombre as servicio,
                    COUNT(t.id) as total_turnos,
                    SUM(CASE WHEN t.estado = 'completado' THEN t.precio_final ELSE 0 END) as ingresos
                FROM servicios s
                INNER JOIN turnos t ON s.id = t.id_servicio
                WHERE t.id_usuario = ? 
                AND t.fecha >= DATE(?) 
                AND t.fecha <= DATE(?)
                AND t.estado NOT IN ('cancelado', 'no_show')
                GROUP BY s.id, s.nombre
                ORDER BY ingresos DESC
                LIMIT 5
            `, [userId, startStr, endStr]);
            
            return {
                topServices: topServices
            };
            
        } catch (error) {
            console.error('Error obteniendo datos de tablas:', error);
            return { topServices: [] };
        }
    }

    // Obtener estadísticas de clientes
    async function getClientStats(req, res) {
        try {
            const userId = req.user.id;
            
            // Usar el modelo Client para obtener estadísticas
            const Client = require('../models/Client');
            const stats = await Client.getStats(userId);
            
            res.json({
                success: true,
                data: {
                    total: stats.total_clientes || 0,
                    nuevos: stats.clientes_nuevos || 0,
                    frecuentes: stats.clientes_semana || 0,
                    activos: stats.clientes_hoy || 0
                }
            });
            
        } catch (error) {
            console.error('Error obteniendo estadísticas de clientes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas de clientes'
            });
        }
    }

// Obtener detalles de un cliente específico
async function getClientDetails(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Obtener información del cliente usando el modelo
        const Client = require('../models/Client');
        const client = await Client.findById(id);
        
        if (!client) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return;
        }

        // Verificar que el cliente tenga citas con este usuario
        const clientWithUser = await query(`
            SELECT 
                c.id,
                c.nombre,
                c.apellido,
                c.telefono,
                c.email,
                c.notas,
                COUNT(t.id) as total_citas,
                SUM(CASE WHEN t.estado = 'completado' THEN t.precio_final ELSE 0 END) as total_gastado,
                MAX(t.fecha) as ultima_cita
            FROM clientes c
            LEFT JOIN turnos t ON c.id = t.id_cliente AND t.id_usuario = ?
            WHERE c.id = ?
            GROUP BY c.id, c.nombre, c.apellido, c.telefono, c.email, c.notas
        `, [userId, id]);

        if (clientWithUser.length === 0 || clientWithUser[0].total_citas === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado o sin citas con este usuario'
                });
            }
            return;
        }

        // Obtener historial de citas del cliente con este usuario
        const appointments = await query(`
            SELECT 
                t.id,
                t.fecha,
                t.hora_inicio,
                t.hora_fin,
                t.estado,
                t.precio_final,
                t.notas,
                s.nombre as servicio_nombre,
                s.precio as servicio_precio
            FROM turnos t
            JOIN servicios s ON t.id_servicio = s.id
            WHERE t.id_cliente = ? AND t.id_usuario = ?
            ORDER BY 
                t.id DESC
            LIMIT 20
        `, [id, userId]);

        // Obtener estadísticas del cliente con este usuario
        const stats = await query(`
            SELECT 
                COUNT(*) as total_citas,
                SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as citas_completadas,
                SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as citas_canceladas,
                SUM(CASE WHEN estado = 'completado' THEN precio_final ELSE 0 END) as total_gastado,
                AVG(CASE WHEN estado = 'completado' THEN precio_final ELSE NULL END) as promedio_gasto
            FROM turnos 
            WHERE id_cliente = ? AND id_usuario = ?
        `, [id, userId]);

        if (!res.headersSent) {
            res.json({
                success: true,
                data: {
                    ...client,
                    ...clientWithUser[0],
                    appointments,
                    stats: stats[0]
                }
            });
        }

    } catch (error) {
        console.error('Error obteniendo detalles del cliente:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Actualizar cliente
async function updateClient(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { nombre, apellido, telefono, email, notas } = req.body;

        // Validar datos requeridos
        if (!nombre || !apellido || !telefono) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, apellido y teléfono son requeridos'
                });
            }
            return;
        }

        // Verificar que el cliente tiene turnos con este usuario
        const client = await query(`
            SELECT c.id FROM clientes c
            LEFT JOIN turnos t ON c.id = t.id_cliente AND t.id_usuario = ?
            WHERE c.id = ? AND t.id IS NOT NULL
            LIMIT 1
        `, [userId, id]);

        if (client.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return;
        }

        // Actualizar cliente
        await query(`
            UPDATE clientes 
            SET nombre = ?, apellido = ?, telefono = ?, email = ?, notas = ?
            WHERE id = ?
        `, [nombre.trim(), apellido.trim(), telefono.trim(), email ? email.trim() : null, notas ? notas.trim() : null, id]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Cliente actualizado exitosamente'
            });
        }

    } catch (error) {
        console.error('Error actualizando cliente:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Eliminar cliente
async function deleteClient(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Verificar que el cliente tiene turnos con este usuario
        const client = await query(`
            SELECT c.id FROM clientes c
            LEFT JOIN turnos t ON c.id = t.id_cliente AND t.id_usuario = ?
            WHERE c.id = ? AND t.id IS NOT NULL
            LIMIT 1
        `, [userId, id]);

        if (client.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return;
        }

        // Verificar si tiene citas asociadas con este usuario
        const appointments = await query(`
            SELECT COUNT(*) as total FROM turnos WHERE id_cliente = ? AND id_usuario = ?
        `, [id, userId]);

        if (appointments[0].total > 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar un cliente que tiene citas asociadas'
                });
            }
            return;
        }

        // Eliminar cliente (solo si no tiene citas con ningún usuario)
        const allAppointments = await query(`
            SELECT COUNT(*) as total FROM turnos WHERE id_cliente = ?
        `, [id]);

        if (allAppointments[0].total > 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar un cliente que tiene citas asociadas con otros barberos'
                });
            }
            return;
        }

        // Eliminar cliente
        await query(`
            DELETE FROM clientes WHERE id = ?
        `, [id]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Cliente eliminado exitosamente'
            });
        }

    } catch (error) {
        console.error('Error eliminando cliente:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Obtener detalles de un servicio específico
async function getServiceDetails(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Obtener servicio con estadísticas
        const service = await query(`
            SELECT 
                s.id,
                s.nombre,
                s.descripcion,
                s.precio,
                s.precio_anterior,
                s.estado,
                s.creado_en,
                s.actualizado_en,
                COUNT(t.id) as total_reservas,
                SUM(CASE WHEN t.estado = 'completado' THEN 1 ELSE 0 END) as reservas_completadas,
                SUM(CASE WHEN t.estado = 'completado' THEN t.precio_final ELSE 0 END) as total_recaudado,
                MAX(CASE WHEN t.estado = 'completado' THEN t.fecha ELSE NULL END) as ultima_reserva
            FROM servicios s
            LEFT JOIN turnos t ON s.id = t.id_servicio
            WHERE s.id = ? AND s.id_usuario = ?
            GROUP BY s.id, s.nombre, s.descripcion, s.precio, s.precio_anterior, s.estado, s.creado_en, s.actualizado_en
        `, [id, userId]);

        if (service.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            return;
        }

        // Obtener historial de precios
        const priceHistory = await query(`
            SELECT 
                precio_anterior,
                precio_nuevo,
                fecha_cambio,
                motivo
            FROM historial_precios 
            WHERE id_servicio = ?
            ORDER BY fecha_cambio DESC
            LIMIT 10
        `, [id]);

        const serviceData = service[0];
        serviceData.historial_precios = priceHistory;

        if (!res.headersSent) {
            res.json({
                success: true,
                data: serviceData
            });
        }

    } catch (error) {
        console.error('Error obteniendo detalles del servicio:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Obtener todos los servicios
async function getAllServices(req, res) {
    try {
        const userId = req.user.id;
        const { 
            estado = 'activo',
            page = 1,
            limit = 20
        } = req.query;

        let whereConditions = ['s.id_usuario = ?'];
        let params = [userId];
        let offset = (page - 1) * limit;

        if (estado) {
            whereConditions.push('s.estado = ?');
            params.push(estado);
        }

        const whereClause = whereConditions.join(' AND ');

        // Obtener servicios con estadísticas
        const services = await query(`
            SELECT 
                s.id,
                s.nombre,
                s.descripcion,
                s.precio,
                s.precio_anterior,
                s.estado,
                COUNT(t.id) as total_reservas,
                SUM(CASE WHEN t.estado = 'completado' THEN 1 ELSE 0 END) as reservas_completadas,
                SUM(CASE WHEN t.estado = 'completado' THEN t.precio_final ELSE 0 END) as total_recaudado
            FROM servicios s
            LEFT JOIN turnos t ON s.id = t.id_servicio
            WHERE ${whereClause}
            GROUP BY s.id, s.nombre, s.descripcion, s.precio, s.precio_anterior, s.estado
            ORDER BY s.nombre ASC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Obtener total de registros para paginación
        const totalResult = await query(`
            SELECT COUNT(*) as total
            FROM servicios s
            WHERE ${whereClause}
        `, params);

        const total = totalResult[0].total;

        if (!res.headersSent) {
            res.json({
                success: true,
                data: services,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        }

    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Crear nuevo servicio
async function createService(req, res) {
    try {
        const userId = req.user.id;
        const { nombre, descripcion, precio, precio_anterior, duracion } = req.body;

        // Validar datos requeridos
        if (!nombre || !precio || !duracion) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, precio y duración son requeridos'
                });
            }
            return;
        }

        // Validar que el precio sea un número positivo
        if (isNaN(precio) || precio <= 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'El precio debe ser un número positivo'
                });
            }
            return;
        }

        // Validar que la duración sea un número positivo
        if (isNaN(duracion) || duracion <= 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'La duración debe ser un número positivo'
                });
            }
            return;
        }

        // Crear servicio
        const result = await query(`
            INSERT INTO servicios (id_usuario, nombre, descripcion, precio, precio_anterior, duracion, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'activo')
        `, [userId, nombre.trim(), descripcion ? descripcion.trim() : null, precio, precio_anterior || null, duracion]);

        if (!res.headersSent) {
            res.status(201).json({
                success: true,
                message: 'Servicio creado exitosamente',
                data: {
                    id: result.insertId,
                    nombre: nombre.trim(),
                    descripcion: descripcion ? descripcion.trim() : null,
                    precio,
                    precio_anterior: precio_anterior || null,
                    estado: 'activo'
                }
            });
        }

    } catch (error) {
        console.error('Error creando servicio:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Actualizar servicio
async function updateService(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { nombre, descripcion, precio, precio_anterior, duracion, estado } = req.body;

        // Validar datos requeridos
        if (!nombre || !precio || !duracion) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, precio y duración son requeridos'
                });
            }
            return;
        }

        // Validar que el precio sea un número positivo
        if (isNaN(precio) || precio <= 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'El precio debe ser un número positivo'
                });
            }
            return;
        }

        // Verificar que el servicio pertenece al usuario
        const service = await query(`
            SELECT id FROM servicios WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (service.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            return;
        }

        // Obtener precio anterior para comparar
        const currentService = await query(`
            SELECT precio FROM servicios WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        const precioAnterior = currentService[0]?.precio;

        // Actualizar servicio
        await query(`
            UPDATE servicios 
            SET nombre = ?, descripcion = ?, precio = ?, precio_anterior = ?, duracion = ?, estado = ?
            WHERE id = ? AND id_usuario = ?
        `, [nombre.trim(), descripcion ? descripcion.trim() : null, precio, precio_anterior || null, duracion, estado || 'activo', id, userId]);

        // Si el precio cambió, registrar en el historial
        if (precioAnterior && parseFloat(precioAnterior) !== parseFloat(precio)) {
            await query(`
                INSERT INTO historial_precios (id_servicio, precio_anterior, precio_nuevo, motivo)
                VALUES (?, ?, ?, ?)
            `, [id, precioAnterior, precio, 'Actualización manual']);
        }

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Servicio actualizado exitosamente'
            });
        }

    } catch (error) {
        console.error('Error actualizando servicio:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Eliminar servicio
async function deleteService(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Verificar que el servicio pertenece al usuario
        const service = await query(`
            SELECT id FROM servicios WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (service.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            return;
        }

        // Verificar si tiene citas activas o futuras asociadas
        const activeAppointments = await query(`
            SELECT COUNT(*) as total FROM turnos 
            WHERE id_servicio = ? AND id_usuario = ? 
            AND estado IN ('reservado', 'confirmado', 'en_proceso')
            AND (fecha > CURDATE() OR (fecha = CURDATE() AND hora_fin > CURTIME()))
        `, [id, userId]);

        if (activeAppointments[0].total > 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede eliminar este servicio porque tiene ${activeAppointments[0].total} cita(s) activa(s) o futura(s). Solo se pueden eliminar servicios con citas históricas completadas.`
                });
            }
            return;
        }

        // Verificar citas históricas para mostrar información
        const historicalAppointments = await query(`
            SELECT COUNT(*) as total FROM turnos 
            WHERE id_servicio = ? AND id_usuario = ? 
            AND estado IN ('completado', 'cancelado', 'no_show')
        `, [id, userId]);

        if (historicalAppointments[0].total > 0) {
    
        }

        // Eliminar servicio
        await query(`
            DELETE FROM servicios WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Servicio eliminado exitosamente'
            });
        }

    } catch (error) {
        console.error('Error eliminando servicio:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Crear nueva cita
async function createAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { cliente_id, servicio_id, fecha, hora_inicio, estado, precio_final, notas } = req.body;

        // Validar datos requeridos
        if (!cliente_id || !servicio_id || !fecha || !hora_inicio) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Cliente, servicio, fecha y hora son requeridos'
                });
            }
            return;
        }

        // Verificar que el cliente existe
        const cliente = await query(`
            SELECT id FROM clientes WHERE id = ?
        `, [cliente_id]);

        if (cliente.length === 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return;
        }

        // Verificar que el servicio existe y pertenece al usuario
        const servicio = await query(`
            SELECT id, precio FROM servicios WHERE id = ? AND id_usuario = ?
        `, [servicio_id, userId]);

        if (servicio.length === 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            return;
        }

        // Calcular hora de fin basada en la duración del servicio
        const hora_fin = await calcularHoraFin(hora_inicio, servicio[0].precio);

        // Generar código de cancelación único
        const codigo_cancelacion = generarCodigoCancelacion();

        // Crear la cita
        const result = await query(`
            INSERT INTO turnos (
                fecha, hora_inicio, hora_fin, id_cliente, id_usuario, id_servicio,
                precio_final, codigo_cancelacion, estado, notas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            fecha, hora_inicio, hora_fin, cliente_id, userId, servicio_id,
            precio_final || servicio[0].precio, codigo_cancelacion, estado || 'reservado', notas
        ]);

        if (!res.headersSent) {
            res.status(201).json({
                success: true,
                message: 'Cita creada exitosamente',
                data: {
                    id: result.insertId,
                    codigo_cancelacion
                }
            });
        }

    } catch (error) {
        console.error('Error creando cita:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Actualizar cita
async function updateAppointment(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { cliente_id, servicio_id, fecha, hora_inicio, estado, precio_final, notas } = req.body;

        // Validar datos requeridos
        if (!cliente_id || !servicio_id || !fecha || !hora_inicio) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Cliente, servicio, fecha y hora son requeridos'
                });
            }
            return;
        }

        // Verificar que la cita pertenece al usuario
        const cita = await query(`
            SELECT id FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (cita.length === 0) {
            if (!res.headersSent) {
                return res.status(404).json({
                    success: false,
                    message: 'Cita no encontrada'
                });
            }
            return;
        }

        // Verificar que el cliente existe
        const cliente = await query(`
            SELECT id FROM clientes WHERE id = ?
        `, [cliente_id]);

        if (cliente.length === 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            return;
        }

        // Verificar que el servicio existe y pertenece al usuario
        const servicio = await query(`
            SELECT id, precio FROM servicios WHERE id = ? AND id_usuario = ?
        `, [servicio_id, userId]);

        if (servicio.length === 0) {
            if (!res.headersSent) {
                return res.status(400).json({
                    success: false,
                    message: 'Servicio no encontrado'
                });
            }
            return;
        }

        // Calcular hora de fin basada en la duración del servicio
        const hora_fin = await calcularHoraFin(hora_inicio, servicio[0].precio);

        // Actualizar la cita
        await query(`
            UPDATE turnos 
            SET fecha = ?, hora_inicio = ?, hora_fin = ?, id_cliente = ?, id_servicio = ?,
                precio_final = ?, estado = ?, notas = ?
            WHERE id = ? AND id_usuario = ?
        `, [
            fecha, hora_inicio, hora_fin, cliente_id, servicio_id,
            precio_final || servicio[0].precio, estado || 'reservado', notas, id, userId
        ]);

        if (!res.headersSent) {
            res.json({
                success: true,
                message: 'Cita actualizada exitosamente'
            });
        }

    } catch (error) {
        console.error('Error actualizando cita:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

// Función auxiliar para calcular hora de fin
async function calcularHoraFin(hora_inicio, duracion) {
    const [horas, minutos] = hora_inicio.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(horas, minutos + duracion, 0, 0);
    
    return fecha.toTimeString().substring(0, 5);
}

// Función auxiliar para generar código de cancelación
function generarCodigoCancelacion() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Confirmar turno
async function confirmAppointment(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el turno existe y pertenece al usuario
        const turno = await query(`
            SELECT id, estado FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (turno.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        if (turno[0].estado === 'confirmado') {
            return res.status(400).json({
                success: false,
                message: 'El turno ya está confirmado'
            });
        }

        // Actualizar estado a confirmado
        await query(`
            UPDATE turnos SET estado = 'confirmado' WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        res.json({
            success: true,
            message: 'Turno confirmado exitosamente'
        });

    } catch (error) {
        console.error('Error confirmando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// Cancelar turno
async function cancelAppointment(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el turno existe y pertenece al usuario
        const turno = await query(`
            SELECT id, estado FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (turno.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        if (turno[0].estado === 'cancelado') {
            return res.status(400).json({
                success: false,
                message: 'El turno ya está cancelado'
            });
        }

        if (turno[0].estado === 'completado') {
            return res.status(400).json({
                success: false,
                message: 'No se puede cancelar un turno completado'
            });
        }

        // Actualizar estado a cancelado
        await query(`
            UPDATE turnos SET estado = 'cancelado' WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        res.json({
            success: true,
            message: 'Turno cancelado exitosamente'
        });

    } catch (error) {
        console.error('Error cancelando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// Completar turno
async function completeAppointment(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que el turno existe y pertenece al usuario
        const turno = await query(`
            SELECT id, estado FROM turnos WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        if (turno.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        if (turno[0].estado === 'completado') {
            return res.status(400).json({
                success: false,
                message: 'El turno ya está completado'
            });
        }

        if (turno[0].estado === 'cancelado') {
            return res.status(400).json({
                success: false,
                message: 'No se puede completar un turno cancelado'
            });
        }

        // Actualizar estado a completado
        await query(`
            UPDATE turnos SET estado = 'completado' WHERE id = ? AND id_usuario = ?
        `, [id, userId]);

        res.json({
            success: true,
            message: 'Turno marcado como completado exitosamente'
        });

    } catch (error) {
        console.error('Error completando turno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

module.exports = {
    renderDashboard,
    getDashboardStats,
    getBarberConfig,
    updateBarberConfig,
    getAllAppointments,
    getAppointmentDetails,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    confirmAppointment,
    cancelAppointment,
    completeAppointment,
    deleteAppointment,
    getAllClients,
    getClientStats,
    getClientDetails,
    updateClient,
    deleteClient,
    debugClientData,
    getGeneralReport,
    getAllServices,
    getServiceDetails,
    createService,
    updateService,
    deleteService
};