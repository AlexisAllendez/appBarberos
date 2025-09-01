// Auto-Complete System JavaScript
class AutoCompleteManager {
    constructor() {
        this.lastExecution = null;
        this.nextExecution = null;
        this.activityLog = [];
        this.isInitialized = false;
    }

    /**
     * Inicializar la página de auto-completado
     */
    async initializeAutoCompletePage() {
        if (this.isInitialized) return;
        

        
        try {
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
            // Configurar actualizaciones automáticas
            this.setupAutoRefresh();
            
            this.isInitialized = true;
    
            
        } catch (error) {
            console.error('❌ Error inicializando página de auto-completado:', error);
            this.showError('Error al inicializar la página');
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botón para ejecutar auto-completado manualmente
        const runAutoCompleteBtn = document.getElementById('runAutoCompleteBtn');
        if (runAutoCompleteBtn) {
            runAutoCompleteBtn.addEventListener('click', () => this.runAutoComplete());
        }

        // Botón para actualizar estadísticas
        const refreshStatsBtn = document.getElementById('refreshStatsBtn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.refreshStats());
        }

        // Botón para actualizar turnos pendientes
        const refreshPendingBtn = document.getElementById('refreshPendingBtn');
        if (refreshPendingBtn) {
            refreshPendingBtn.addEventListener('click', () => this.loadPendingAppointments());
        }
    }

    /**
     * Cargar datos iniciales
     */
    async loadInitialData() {
        try {
            // Cargar estadísticas
            await this.loadStats();
            
            // Cargar turnos pendientes
            await this.loadPendingAppointments();
            
            // Actualizar timestamps
            this.updateTimestamps();
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            throw error;
        }
    }

    /**
     * Configurar actualizaciones automáticas - OPTIMIZADO PARA PRODUCCIÓN
     */
    setupAutoRefresh() {
        // Actualizar estadísticas cada 10 minutos (en lugar de 2)
        setInterval(() => {
            this.loadStats();
        }, 10 * 60 * 1000);

        // Actualizar turnos pendientes cada 15 minutos (en lugar de 5)
        setInterval(() => {
            this.loadPendingAppointments();
        }, 15 * 60 * 1000);

        // Actualizar timestamps cada 5 minutos (en lugar de 1)
        setInterval(() => {
            this.updateTimestamps();
        }, 5 * 60 * 1000);
        

    }

    /**
     * Cargar estadísticas del sistema
     */
    async loadStats() {
        try {
            const response = await fetch('/api/appointments/auto-complete/stats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.updateStatsDisplay(result.data);
            } else {
                throw new Error(result.message || 'Error al cargar estadísticas');
            }

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showError('Error al cargar estadísticas');
        }
    }

    /**
     * Actualizar display de estadísticas
     */
    updateStatsDisplay(stats) {
        // Actualizar métricas
        const pendingAutoComplete = document.getElementById('pendingAutoComplete');
        const completedToday = document.getElementById('completedToday');
        const autoCompletedToday = document.getElementById('autoCompletedToday');

        if (pendingAutoComplete) pendingAutoComplete.textContent = stats.pendingForAutoComplete || 0;
        if (completedToday) completedToday.textContent = stats.completedToday || 0;
        if (autoCompletedToday) autoCompletedToday.textContent = stats.autoCompletedToday || 0;

        // Actualizar timestamps
        this.lastExecution = new Date();
        this.updateTimestamps();
    }

    /**
     * Actualizar timestamps de ejecución - DESHABILITADO PARA MODO MANUAL
     */
    updateTimestamps() {
        // ⚠️ FUNCIÓN DESHABILITADA - Los timestamps ya no se muestran en la UI
        // El auto-completado funciona en modo manual, no hay próxima ejecución automática
        

        
        // CÓDIGO ORIGINAL COMENTADO:
        // const lastExecutionEl = document.getElementById('lastExecution');
        // const nextExecutionEl = document.getElementById('nextExecution');
        // 
        // if (lastExecutionEl && this.lastExecution) {
        //     lastExecutionEl.textContent = this.lastExecution.toLocaleTimeString('es-AR');
        // }
        // 
        // if (nextExecutionEl) {
        //     const now = new Date();
        //     const nextExec = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos
        //     nextExecutionEl.textContent = nextExec.toLocaleTimeString('es-AR');
        // }
    }

    /**
     * Ejecutar auto-completado manualmente
     */
    async runAutoComplete() {
        const button = document.getElementById('runAutoCompleteBtn');
        if (!button) return;

        try {
            // Deshabilitar botón y mostrar loading
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Ejecutando...';

            const response = await fetch('/api/appointments/auto-complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                
                // Agregar al log de actividad
                this.addActivityLog('Ejecución manual', result.message, 'success');
                
                // Actualizar datos
                await this.loadStats();
                await this.loadPendingAppointments();
                
            } else {
                throw new Error(result.message || 'Error al ejecutar auto-completado');
            }

        } catch (error) {
            console.error('Error ejecutando auto-completado:', error);
            this.showError('Error al ejecutar auto-completado: ' + error.message);
            
            // Agregar al log de actividad
            this.addActivityLog('Error en ejecución', error.message, 'error');
        } finally {
            // Restaurar botón
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-play me-2"></i>Ejecutar Auto-Completado Ahora';
        }
    }

    /**
     * Actualizar estadísticas
     */
    async refreshStats() {
        const button = document.getElementById('refreshStatsBtn');
        if (!button) return;

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Actualizando...';

            await this.loadStats();
            this.showSuccess('Estadísticas actualizadas correctamente');

        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
            this.showError('Error al actualizar estadísticas');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Actualizar Estadísticas';
        }
    }

    /**
     * Cargar turnos pendientes de auto-completado
     */
    async loadPendingAppointments() {
        try {
            const response = await fetch('/api/appointments/auto-complete/pending', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.renderPendingAppointments(result.data);
            } else {
                throw new Error(result.message || 'Error al cargar turnos pendientes');
            }

        } catch (error) {
            console.error('Error cargando turnos pendientes:', error);
            this.showError('Error al cargar turnos pendientes');
        }
    }

    /**
     * Renderizar turnos pendientes
     */
    renderPendingAppointments(data) {
        const container = document.getElementById('pendingAppointmentsContainer');
        if (!container) return;

        if (!data.appointments || data.appointments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-check-circle fa-2x text-success mb-3"></i>
                    <p class="text-muted">No hay turnos pendientes de auto-completado</p>
                    <small class="text-muted">Todos los turnos están al día</small>
                </div>
            `;
            return;
        }

        const appointmentsHtml = data.appointments.map(appointment => `
            <div class="appointment-item border rounded p-3 mb-3">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            <div class="status-badge ${this.getStatusBadgeClass(appointment.estado)} me-2">
                                ${this.getStatusText(appointment.estado)}
                            </div>
                            <div>
                                <strong>#${appointment.id}</strong>
                                <br>
                                <small class="text-muted">${appointment.fecha}</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div>
                            <strong>${appointment.cliente_nombre} ${appointment.cliente_apellido}</strong>
                            <br>
                            <small class="text-muted">${appointment.cliente_telefono || 'Sin teléfono'}</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div>
                            <strong>${appointment.servicio_nombre}</strong>
                            <br>
                            <small class="text-muted">${formatPrice(appointment.precio_final)}</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-end">
                            <div class="text-danger">
                                <i class="fas fa-clock me-1"></i>
                                ${appointment.hora_inicio} - ${appointment.hora_fin}
                            </div>
                            <small class="text-muted">Vencido</small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="mb-3">
                <span class="badge bg-warning text-dark">
                    ${data.count} turno${data.count !== 1 ? 's' : ''} pendiente${data.count !== 1 ? 's' : ''}
                </span>
                <small class="text-muted ms-2">
                    Última actualización: ${new Date().toLocaleTimeString('es-AR')}
                </small>
            </div>
            ${appointmentsHtml}
        `;
    }

    /**
     * Obtener clase CSS para el badge de estado
     */
    getStatusBadgeClass(estado) {
        const statusClasses = {
            'reservado': 'bg-warning text-dark',
            'confirmado': 'bg-info text-white',
            'en_proceso': 'bg-primary text-white',
            'completado': 'bg-success text-white',
            'cancelado': 'bg-danger text-white',
            'no_show': 'bg-secondary text-white'
        };
        return statusClasses[estado] || 'bg-secondary text-white';
    }

    /**
     * Obtener texto del estado
     */
    getStatusText(estado) {
        const statusTexts = {
            'reservado': 'Reservado',
            'confirmado': 'Confirmado',
            'en_proceso': 'En Proceso',
            'completado': 'Completado',
            'cancelado': 'Cancelado',
            'no_show': 'No Show'
        };
        return statusTexts[estado] || estado;
    }

    /**
     * Agregar entrada al log de actividad
     */
    addActivityLog(action, message, type = 'info') {
        const logEntry = {
            timestamp: new Date(),
            action,
            message,
            type
        };

        this.activityLog.unshift(logEntry);
        
        // Mantener solo las últimas 50 entradas
        if (this.activityLog.length > 50) {
            this.activityLog = this.activityLog.slice(0, 50);
        }

        this.renderActivityLog();
    }

    /**
     * Renderizar log de actividad
     */
    renderActivityLog() {
        const container = document.getElementById('activityLogContainer');
        if (!container) return;

        if (this.activityLog.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-info-circle fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No hay actividad reciente</p>
                </div>
            `;
            return;
        }

        const logHtml = this.activityLog.map(entry => `
            <div class="log-entry border-bottom py-2 ${entry.type === 'error' ? 'border-danger' : entry.type === 'success' ? 'border-success' : 'border-light'}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center">
                            <span class="badge ${this.getLogBadgeClass(entry.type)} me-2">
                                ${entry.action}
                            </span>
                            <span class="text-muted">${entry.message}</span>
                        </div>
                    </div>
                    <small class="text-muted">
                        ${entry.timestamp.toLocaleTimeString('es-AR')}
                    </small>
                </div>
            </div>
        `).join('');

        container.innerHTML = logHtml;
    }

    /**
     * Obtener clase CSS para el badge del log
     */
    getLogBadgeClass(type) {
        const logClasses = {
            'success': 'bg-success text-white',
            'error': 'bg-danger text-white',
            'warning': 'bg-warning text-dark',
            'info': 'bg-info text-white'
        };
        return logClasses[type] || 'bg-secondary text-white';
    }

    /**
     * Mostrar mensaje de éxito
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Mostrar mensaje de error
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Mostrar toast notification
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div class="toast" id="${toastId}" role="alert">
                <div class="toast-header ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : 'bg-info text-white'}">
                    <i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} me-2"></i>
                    <strong class="me-auto">Auto-Completado</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        // Remover toast después de que se oculte
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la página de auto-completado
    const autoCompleteSection = document.getElementById('auto-complete');
    if (autoCompleteSection) {
        const autoCompleteManager = new AutoCompleteManager();
        autoCompleteManager.initializeAutoCompletePage();
        
        // Hacer disponible globalmente para debugging
        window.autoCompleteManager = autoCompleteManager;
    }
});

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoCompleteManager;
}
