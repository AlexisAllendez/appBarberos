// Gestión de Turnos - Integrada en Dashboard
class TurnosManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {};
        this.turnos = [];
        this.clientes = [];
        this.servicios = [];
        this.editingCita = null;
        this.confirmCallback = null;
        
        // Configuración de ordenamiento
        this.sortConfig = {
            field: 'estado', // Campo por defecto: estado (más importante)
            direction: 'asc' // Dirección por defecto: ascendente
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        await this.loadTurnos();
        this.updateStats();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('btnNuevaCita')?.addEventListener('click', () => this.openModal());
        document.getElementById('btnRefresh')?.addEventListener('click', () => {
            this.loadTurnos();
        });
        document.getElementById('btnExportar')?.addEventListener('click', () => this.exportarCitas());
        document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => this.limpiarFiltros());

        // Filtros
        document.getElementById('filterEstado')?.addEventListener('change', (e) => {
            this.currentFilters.estado = e.target.value;
            this.currentPage = 1;
            this.loadTurnos();
        });

        document.getElementById('filterFecha')?.addEventListener('change', (e) => {
            this.currentFilters.fecha = e.target.value;
            this.currentPage = 1;
            this.loadTurnos();
        });

        document.getElementById('searchCliente')?.addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.currentPage = 1;
            this.debounce(() => this.loadTurnos(), 300);
        });

        // Modal
        document.getElementById('btnGuardarCita')?.addEventListener('click', () => this.guardarCita());

        // Modal de confirmación
        document.getElementById('btnConfirmarAccion')?.addEventListener('click', () => this.confirmarAccion());

        // Formulario
        document.getElementById('servicioSelect')?.addEventListener('change', (e) => this.onServicioChange(e));
        
        // Cargar slots cuando cambie la fecha
        document.getElementById('fechaCita')?.addEventListener('change', (e) => this.loadAvailableSlots(e.target.value));
        
        // Cargar slots cuando cambie el servicio
        document.getElementById('servicioSelect')?.addEventListener('change', (e) => {
            this.onServicioChange(e);
            const fecha = document.getElementById('fechaCita').value;
            if (fecha) {
                this.loadAvailableSlots(fecha);
            }
        });

        // Auto-Completado
        document.getElementById('btnAutoComplete')?.addEventListener('click', () => this.runAutoComplete());
        this.setupAutoCompleteSystem(); // Configuración en modo MANUAL (sin timer automático)
        
        // Configurar encabezados ordenables
        this.setupSortableHeaders();
        
        // Botón de resetear ordenamiento
        document.getElementById('btnResetSort')?.addEventListener('click', () => this.resetSorting());
    }

    // Configurar encabezados ordenables de la tabla
    setupSortableHeaders() {
        const fechaHeader = document.querySelector('[data-sort="fecha"]');
        const estadoHeader = document.querySelector('[data-sort="estado"]');
        
        if (fechaHeader) {
            fechaHeader.addEventListener('click', () => this.handleSort('fecha'));
        }
        
        if (estadoHeader) {
            estadoHeader.addEventListener('click', () => this.handleSort('estado'));
        }
        
        // Aplicar ordenamiento inicial
        this.updateSortIndicators();
    }

    // Manejar clic en encabezado ordenable
    handleSort(field) {
        console.log(`🔄 Ordenando por: ${field}`);
        
        if (this.sortConfig.field === field) {
            // Cambiar dirección si es el mismo campo
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Nuevo campo, resetear a ascendente
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }
        
        // Aplicar ordenamiento
        this.ordenarTurnos();
        this.renderTurnosTable();
        this.updateSortIndicators();
        
        // Log de ordenamiento removido para consola limpia
    }

    // Actualizar indicadores visuales de ordenamiento
    updateSortIndicators() {
        // Limpiar todos los indicadores
        const headers = document.querySelectorAll('.sortable-header');
        headers.forEach(header => {
            header.classList.remove('asc', 'desc', 'active');
        });
        
        // Aplicar indicador al campo activo
        const activeHeader = document.querySelector(`[data-sort="${this.sortConfig.field}"]`);
        if (activeHeader) {
            activeHeader.classList.add(this.sortConfig.direction, 'active');
        }
        
        // Mostrar información del ordenamiento actual
        this.showSortInfo();
    }

    // Mostrar información del ordenamiento actual
    showSortInfo() {
        const fieldNames = {
            'estado': 'Estado',
            'fecha': 'Fecha y Hora'
        };
        
        const directionNames = {
            'asc': 'ascendente',
            'desc': 'descendente'
        };
        
        // Log de ordenamiento actual removido para consola limpia
        
        // Mostrar notificación visual
        const notification = document.getElementById('sortNotification');
        const container = document.getElementById('sortNotificationContainer');
        
        if (notification && container) {
            notification.textContent = `Ordenado por: ${fieldNames[this.sortConfig.field]} (${directionNames[this.sortConfig.direction]})`;
            notification.className = 'alert alert-info alert-sm mb-0';
            
            // Mostrar la notificación
            container.style.display = 'block';
            
            // Ocultar después de 3 segundos
            setTimeout(() => {
                container.style.display = 'none';
            }, 3000);
        }
    }

    // Función para resetear el ordenamiento a la configuración por defecto
    resetSorting() {
        this.sortConfig.field = 'estado';
        this.sortConfig.direction = 'asc';
        
        console.log('🔄 Reseteando ordenamiento a configuración por defecto (Estado)');
        
        this.ordenarTurnos();
        this.renderTurnosTable();
        this.updateSortIndicators();
    }

    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // Cargar clientes y servicios en paralelo
            const [clientesRes, serviciosRes] = await Promise.all([
                fetch('/dashboard/clients'),
                fetch('/dashboard/services')
            ]);

            if (clientesRes.ok) {
                const clientesData = await clientesRes.json();
                this.clientes = clientesData.data || [];
                this.populateClientesSelect();
            }

            if (serviciosRes.ok) {
                const serviciosData = await serviciosRes.json();
                this.servicios = serviciosData.data || [];
                this.populateServiciosSelect();
            }
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showNotification('Error cargando datos iniciales', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadTurnos() {
        try {
            this.showLoading(true);
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.currentFilters
            });

            // Log de parámetros removido para consola limpia
            const response = await fetch(`/dashboard/appointments?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                // Log de API removido para consola limpia
                
                this.turnos = data.data || [];
                // Log de turnos cargados removido para consola limpia
                
                // Debug removido para consola limpia
                
                // Ordenar turnos: primero por fecha/hora, luego por prioridad de estado
                this.ordenarTurnos();
                
                this.renderTurnosTable();
                this.renderPagination(data.pagination);
                this.updateStats();
            } else {
                throw new Error('Error cargando citas');
            }
        } catch (error) {
            console.error('Error cargando citas:', error);
            this.showNotification('Error cargando citas', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Función para ordenar turnos por estado (PRINCIPAL) y fecha (SECUNDARIO)
    ordenarTurnos() {
        // Log de ordenamiento removido para consola limpia
        
        this.turnos.sort((a, b) => {
            let comparison = 0;
            
            // Ordenar según el campo seleccionado
            if (this.sortConfig.field === 'estado') {
                // Ordenar por prioridad de estado (más importante)
                const prioridadEstados = {
                    'reservado': 1,      // Prioridad más alta - PRIMERO
                    'confirmado': 2,     // Segunda prioridad - SEGUNDO
                    'en_proceso': 3,     // Tercera prioridad - TERCERO
                    'completado': 4,     // Cuarta prioridad
                    'cancelado': 5,      // Quinta prioridad
                    'no_show': 6         // Prioridad más baja - ÚLTIMO
                };
                
                const prioridadA = prioridadEstados[a.estado] || 999;
                const prioridadB = prioridadEstados[b.estado] || 999;
                comparison = prioridadA - prioridadB;
                
                // Si es el mismo estado, ordenar por fecha
                if (comparison === 0) {
                    const fechaA = new Date(a.fecha);
                    const fechaB = new Date(b.fecha);
                    comparison = fechaA.getTime() - fechaB.getTime();
                    
                    // Si es la misma fecha, ordenar por hora
                    if (comparison === 0) {
                        const horaA = this.parseTime(a.hora_inicio);
                        const horaB = this.parseTime(b.hora_inicio);
                        comparison = horaA - horaB;
                    }
                }
                
            } else if (this.sortConfig.field === 'fecha') {
                // Ordenar por fecha y hora (combinados)
                const fechaA = new Date(a.fecha);
                const fechaB = new Date(b.fecha);
                comparison = fechaA.getTime() - fechaB.getTime();
                
                // Si es la misma fecha, ordenar por hora
                if (comparison === 0) {
                    const horaA = this.parseTime(a.hora_inicio);
                    const horaB = this.parseTime(b.hora_inicio);
                    comparison = horaA - horaB;
                    
                    // Si es la misma hora, ordenar por prioridad de estado
                    if (comparison === 0) {
                        const prioridadEstados = {
                            'reservado': 1, 'confirmado': 2, 'en_proceso': 3,
                            'completado': 4, 'cancelado': 5, 'no_show': 6
                        };
                        const prioridadA = prioridadEstados[a.estado] || 999;
                        const prioridadB = prioridadEstados[b.estado] || 999;
                        comparison = prioridadA - prioridadB;
                    }
                }
            }
            
            // Aplicar dirección de ordenamiento
            return this.sortConfig.direction === 'asc' ? comparison : -comparison;
        });
        
        // Logs de ordenamiento removidos para consola limpia
    }

    // Función auxiliar para parsear tiempo a minutos desde medianoche
    parseTime(timeString) {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Función para probar el ordenamiento
    probarOrdenamiento() {
        // Crear datos de prueba
        const turnosPrueba = [
            { fecha: '2024-12-15', hora_inicio: '10:00', estado: 'completado' },
            { fecha: '2024-12-15', hora_inicio: '09:00', estado: 'reservado' },
            { fecha: '2024-12-15', hora_inicio: '09:30', estado: 'confirmado' },
            { fecha: '2024-12-15', hora_inicio: '10:30', estado: 'cancelado' },
            { fecha: '2024-12-15', hora_inicio: '11:00', estado: 'reservado' }
        ];
        
        // Guardar turnos originales
        const turnosOriginales = [...this.turnos];
        
        // Aplicar ordenamiento de prueba
        this.turnos = [...turnosPrueba];
        this.ordenarTurnos();
        
        // Restaurar turnos originales
        this.turnos = turnosOriginales;
    }

    // Función para forzar reordenamiento
    forzarReordenamiento() {
        this.ordenarTurnos();
        this.renderTurnosTable();
    }

    // Función para verificar el orden de los turnos
    verificarOrdenTurnos() {
        // Crear una copia para no modificar el original
        const turnosCopia = [...this.turnos];
        
        // Aplicar ordenamiento
        this.ordenarTurnos();
        
        // Verificar si el orden cambió
        const ordenCambio = turnosCopia.some((turno, index) => {
            const turnoOrdenado = this.turnos[index];
            return turno.fecha !== turnoOrdenado.fecha || 
                   turno.hora_inicio !== turnoOrdenado.hora_inicio || 
                   turno.estado !== turnoOrdenado.estado;
        });
        
        // Restaurar turnos originales
        this.turnos = turnosCopia;
        
        return ordenCambio;
    }

    renderTurnosTable() {
        const tbody = document.getElementById('turnosTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (this.turnos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p class="text-muted">No se encontraron citas</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.turnos.forEach((cita, index) => {
            // Debug removido para consola limpia
            
            // Debug removido para consola limpia
            
            const row = document.createElement('tr');
            row.className = this.getRowClass(cita.estado);
            row.innerHTML = `
                <td>
                    <div>
                        <strong>${cita.cliente_nombre || 'Sin nombre'} ${cita.cliente_apellido || ''}</strong>
                        <br>
                        <small class="text-muted">ID: ${cita.cliente_id || 'N/A'}</small>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${cita.servicio_nombre || 'Sin servicio'}</strong>
                        <br>
                        <small class="text-muted">${formatPrice(cita.servicio_precio || 0)}</small>
                    </div>
                </td>
                <td class="datetime-column">
                    <div>
                        <strong>${this.formatDate(cita.fecha)}</strong>
                        <br>
                        <small class="text-muted">${this.formatTime(cita.hora_inicio)}</small>
                    </div>
                </td>
                <td class="phone-column">
                    <div class="text-center">
                        <strong class="text-primary">${cita.cliente_telefono || cita.telefono || cita.telefono_cliente || 'Sin teléfono'}</strong>
                    </div>
                </td>
                <td>
                    <span class="badge ${this.getEstadoBadgeClass(cita.estado)}">
                        ${this.getEstadoText(cita.estado)}
                    </span>
                </td>
                <td>${formatPrice(cita.precio_final || 0)}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        ${cita.estado === 'reservado' ? `
                            <button class="btn btn-outline-success" onclick="turnosManager.confirmarTurno(${cita.id})" title="Confirmar turno">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${cita.estado === 'confirmado' || cita.estado === 'en_proceso' ? `
                            <button class="btn btn-outline-primary" onclick="turnosManager.completarTurno(${cita.id})" title="Marcar como completado">
                                <i class="fas fa-flag-checkered"></i>
                            </button>
                        ` : ''}
                        ${cita.estado !== 'cancelado' && cita.estado !== 'completado' ? `
                            <button class="btn btn-outline-danger" onclick="turnosManager.cancelarTurno(${cita.id})" title="Cancelar turno">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-info" onclick="turnosManager.verTurno(${cita.id})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Función para obtener clase CSS de la fila según el estado
    getRowClass(estado) {
        const classes = {
            'reservado': 'estado-reservado',
            'confirmado': 'estado-confirmado',
            'en_proceso': 'estado-en_proceso',
            'completado': 'estado-completado',
            'cancelado': 'estado-cancelado',
            'no_show': 'estado-no_show'
        };
        return classes[estado] || '';
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer || !pagination || pagination.pages <= 1) return;
        
        paginationContainer.innerHTML = '';

        // Botón anterior
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-outline-primary me-2';
        prevBtn.textContent = 'Anterior';
        prevBtn.disabled = pagination.page <= 1;
        prevBtn.addEventListener('click', () => {
            if (pagination.page > 1) {
                this.currentPage = pagination.page - 1;
                this.loadTurnos();
            }
        });
        paginationContainer.appendChild(prevBtn);

        // Números de página
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn me-2 ${i === pagination.page ? 'btn-primary' : 'btn-outline-primary'}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.loadTurnos();
            });
            paginationContainer.appendChild(pageBtn);
        }

        // Botón siguiente
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-outline-primary';
        nextBtn.textContent = 'Siguiente';
        nextBtn.disabled = pagination.page >= pagination.pages;
        nextBtn.addEventListener('click', () => {
            if (pagination.page < pagination.pages) {
                this.currentPage = pagination.page + 1;
                this.loadTurnos();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    updateStats() {
        const stats = {
            reservado: 0,
            confirmado: 0,
            completado: 0,
            cancelado: 0
        };

        this.turnos.forEach(cita => {
            if (stats.hasOwnProperty(cita.estado)) {
                stats[cita.estado]++;
            }
        });

        const totalReservadas = document.getElementById('totalReservadas');
        const totalConfirmadas = document.getElementById('totalConfirmadas');
        const totalCompletadas = document.getElementById('totalCompletadas');
        const totalCanceladas = document.getElementById('totalCanceladas');

        if (totalReservadas) totalReservadas.textContent = stats.reservado;
        if (totalConfirmadas) totalConfirmadas.textContent = stats.confirmado;
        if (totalCompletadas) totalCompletadas.textContent = stats.completado;
        if (totalCanceladas) totalCanceladas.textContent = stats.cancelado;
    }

    openModal(cita = null) {
        this.editingCita = cita;
        const modal = new bootstrap.Modal(document.getElementById('modalCita'));
        const title = document.getElementById('modalTitle');
        
        title.textContent = cita ? 'Editar Cita' : 'Nueva Cita';
        
        if (cita) {
            this.populateForm(cita);
        } else {
            this.clearForm();
        }
        
        modal.show();
    }

    populateForm(cita) {
        document.getElementById('clienteSelect').value = cita.cliente_id;
        document.getElementById('servicioSelect').value = cita.servicio_id;
        document.getElementById('fechaCita').value = cita.fecha;
        document.getElementById('estadoCita').value = cita.estado;
        document.getElementById('precioCita').value = cita.precio_final || '';
        document.getElementById('notasCita').value = cita.notas || '';
        
        // Cargar slots disponibles para la fecha y servicio
        this.loadAvailableSlots(cita.fecha).then(() => {
            // Después de cargar los slots, seleccionar la hora del turno
            const horaSelect = document.getElementById('horaCita');
            if (horaSelect) {
                horaSelect.value = cita.hora_inicio;
            }
        });
    }

    clearForm() {
        document.getElementById('formCita').reset();
        document.getElementById('precioCita').value = '';
        document.getElementById('notasCita').value = '';
        
        // Limpiar slots
        const horaSelect = document.getElementById('horaCita');
        const slotsMessage = document.getElementById('slotsMessage');
        if (horaSelect) {
            horaSelect.innerHTML = '<option value="">Selecciona una fecha primero...</option>';
        }
        if (slotsMessage) {
            slotsMessage.textContent = '';
        }
    }

    populateClientesSelect() {
        const select = document.getElementById('clienteSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar cliente...</option>';
        
        this.clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = `${cliente.nombre} ${cliente.apellido} - ${cliente.telefono}`;
            select.appendChild(option);
        });
    }

    populateServiciosSelect() {
        const select = document.getElementById('servicioSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar servicio...</option>';
        
        this.servicios.forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = `${servicio.nombre} - ${formatPrice(servicio.precio)}`;
            option.dataset.precio = servicio.precio;
            select.appendChild(option);
        });
    }

    onServicioChange(e) {
        const servicioId = e.target.value;
        const precioInput = document.getElementById('precioCita');
        
        if (servicioId) {
            const servicio = this.servicios.find(s => s.id == servicioId);
            if (servicio) {
                precioInput.value = servicio.precio;
            }
        } else {
            precioInput.value = '';
        }
    }

    async guardarCita() {
        const form = document.getElementById('formCita');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = {
            cliente_id: document.getElementById('clienteSelect').value,
            servicio_id: document.getElementById('servicioSelect').value,
            fecha: document.getElementById('fechaCita').value,
            hora_inicio: document.getElementById('horaCita').value,
            estado: document.getElementById('estadoCita').value,
            precio_final: document.getElementById('precioCita').value,
            notas: document.getElementById('notasCita').value
        };

        try {
            this.showLoading(true);
            
            const url = this.editingCita 
                ? `/dashboard/appointments/${this.editingCita.id}` 
                : '/dashboard/appointments';
            
            const method = this.editingCita ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalCita')).hide();
                await this.loadCitas();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error guardando cita');
            }
        } catch (error) {
            console.error('Error guardando cita:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async verTurno(id) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/dashboard/appointments/${id}`);
            
            if (response.ok) {
                const data = await response.json();
                this.mostrarDetallesTurno(data.data);
            } else {
                throw new Error('Error cargando detalles del turno');
            }
        } catch (error) {
            console.error('Error cargando turno:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    mostrarDetallesTurno(cita) {
        const modal = new bootstrap.Modal(document.getElementById('modalCita'));
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('formCita');
        
        title.textContent = 'Detalles del Turno';
        form.style.pointerEvents = 'none';
        
        this.populateForm(cita);
        modal.show();
        
        // Cambiar botones
        const btnGuardar = document.getElementById('btnGuardarCita');
        btnGuardar.textContent = 'Cerrar';
        btnGuardar.onclick = () => {
            modal.hide();
            form.style.pointerEvents = 'auto';
            btnGuardar.textContent = 'Guardar Turno';
            btnGuardar.onclick = () => this.guardarCita();
        };
    }

    async confirmarTurno(id) {
        this.showConfirmModal(
            '¿Estás seguro de que quieres confirmar este turno?',
            () => this.ejecutarConfirmarTurno(id)
        );
    }

    async ejecutarConfirmarTurno(id) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/dashboard/appointments/${id}/confirm`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'confirmado' })
            });

            if (response.ok) {
                this.showNotification('Turno confirmado exitosamente', 'success');
                await this.loadTurnos();
                this.updateStats();
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Error al confirmar el turno', 'error');
            }
        } catch (error) {
            console.error('Error al confirmar turno:', error);
            this.showNotification('Error al confirmar el turno', 'error');
        } finally {
            this.showLoading(false);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion')).hide();
        }
    }

    async cancelarTurno(id) {
        this.showConfirmModal(
            '¿Estás seguro de que quieres cancelar este turno?',
            () => this.ejecutarCancelarTurno(id)
        );
    }

    async ejecutarCancelarTurno(id) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/dashboard/appointments/${id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'cancelado' })
            });

            if (response.ok) {
                this.showNotification('Turno cancelado exitosamente', 'success');
                await this.loadTurnos();
                this.updateStats();
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Error al cancelar el turno', 'error');
            }
        } catch (error) {
            console.error('Error al cancelar turno:', error);
            this.showNotification('Error al cancelar el turno', 'error');
        } finally {
            this.showLoading(false);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion')).hide();
        }
    }

    async completarTurno(id) {
        this.showConfirmModal(
            '¿Estás seguro de que quieres marcar este turno como completado?',
            () => this.ejecutarCompletarTurno(id)
        );
    }

    async ejecutarCompletarTurno(id) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/dashboard/appointments/${id}/complete`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'completado' })
            });

            if (response.ok) {
                this.showNotification('Turno marcado como completado exitosamente', 'success');
                await this.loadTurnos();
                this.updateStats();
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Error al completar el turno', 'error');
            }
        } catch (error) {
            console.error('Error al completar turno:', error);
            this.showNotification('Error al completar el turno', 'error');
        } finally {
            this.showLoading(false);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion')).hide();
        }
    }

    async confirmarEliminarCita(id) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/dashboard/appointments/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                await this.loadCitas();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Error eliminando cita');
            }
        } catch (error) {
            console.error('Error eliminando cita:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.showLoading(false);
            bootstrap.Modal.getInstance(document.getElementById('modalConfirmacion')).hide();
        }
    }

    limpiarFiltros() {
        this.currentFilters = {};
        this.currentPage = 1;
        
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterFecha').value = '';
        document.getElementById('searchCliente').value = '';
        
        this.loadTurnos();
    }

    async exportarCitas() {
        try {
            this.showLoading(true);
            
            const params = new URLSearchParams({
                ...this.currentFilters,
                export: 'true'
            });

            const response = await fetch(`/dashboard/appointments?${params}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `citas_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error('Error exportando citas');
            }
        } catch (error) {
            console.error('Error exportando citas:', error);
            this.showNotification('Error exportando citas', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Utilidades
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(timeString) {
        return timeString.substring(0, 5);
    }

    getEstadoText(estado) {
        const estados = {
            'reservado': 'Reservado',
            'confirmado': 'Confirmado',
            'en_proceso': 'En Proceso',
            'completado': 'Completado',
            'cancelado': 'Cancelado',
            'no_show': 'No Show'
        };
        return estados[estado] || estado;
    }

    getEstadoBadgeClass(estado) {
        const classes = {
            'reservado': 'bg-warning text-dark',      // Amarillo - Pendiente de confirmar
            'confirmado': 'bg-success text-white',    // Verde - Confirmado y listo
            'en_proceso': 'bg-info text-white',       // Azul - En progreso
            'completado': 'bg-secondary text-white',  // Gris - Completado
            'cancelado': 'bg-danger text-white',      // Rojo - Cancelado
            'no_show': 'bg-dark text-white'           // Negro - No se presentó
        };
        return classes[estado] || 'bg-secondary text-white';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 3000;
            min-width: 300px;
        `;
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    showConfirmModal(message, onConfirm) {
        const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
        const mensaje = document.getElementById('mensajeConfirmacion');
        
        mensaje.textContent = message;
        this.confirmCallback = onConfirm;
        
        modal.show();
    }

    confirmarAccion() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    async loadAvailableSlots(fecha) {
        const horaSelect = document.getElementById('horaCita');
        const slotsMessage = document.getElementById('slotsMessage');
        const servicioId = document.getElementById('servicioSelect').value;

        if (!fecha) {
            horaSelect.innerHTML = '<option value="">Selecciona una fecha primero...</option>';
            slotsMessage.textContent = '';
            return;
        }

        try {
            // Mostrar loading
            horaSelect.innerHTML = '<option value="">Cargando horarios...</option>';
            slotsMessage.textContent = '';

            const params = new URLSearchParams({ fecha });
            if (servicioId) {
                params.append('servicio_id', servicioId);
            }

            // Si estamos editando un turno, excluirlo de los conflictos
            if (this.editingCita && this.editingCita.id) {
                params.append('exclude_id', this.editingCita.id);
            }

            const response = await fetch(`/api/booking/slots?${params}`);
            const result = await response.json();

            if (result.success) {
                if (result.data.length > 0) {
                    // Limpiar opciones existentes
                    horaSelect.innerHTML = '<option value="">Selecciona hora</option>';
                    
                    result.data.forEach(slot => {
                        const option = document.createElement('option');
                        option.value = slot.hora_inicio;
                        option.textContent = slot.hora_inicio;
                        option.setAttribute('data-end-time', slot.hora_fin);
                        horaSelect.appendChild(option);
                    });
                    
                    slotsMessage.textContent = `${result.data.length} horarios disponibles`;
                    slotsMessage.className = 'form-text mt-1 text-success';
                } else {
                    horaSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
                    slotsMessage.textContent = result.message || 'No hay horarios disponibles para esta fecha';
                    slotsMessage.className = 'form-text mt-1 text-warning';
                }
            } else {
                horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
                slotsMessage.textContent = 'Error al cargar horarios disponibles';
                slotsMessage.className = 'form-text mt-1 text-danger';
            }
        } catch (error) {
            console.error('Error al cargar horarios:', error);
            horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
            slotsMessage.textContent = 'Error al cargar horarios disponibles';
            slotsMessage.className = 'form-text mt-1 text-danger';
        }
    }

    // ===== SISTEMA DE AUTO-COMPLETADO =====
    
    setupAutoCompleteSystem() {
        // Log de configuración removido para consola limpia
        this.updateAutoCompleteStats(); // Solo cargar estadísticas iniciales
        // this.startAutoCompleteTimer(); // DESHABILITADO - Solo funciona manualmente
        // Logs de configuración removidos para consola limpia
    }

    async updateAutoCompleteStats() {
        try {
            const response = await fetch('/api/appointments/auto-complete/stats');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateAutoCompleteUI(data.data);
                }
            }
        } catch (error) {
            console.error('Error actualizando estadísticas de auto-completado:', error);
        }
    }

    updateAutoCompleteUI(stats) {
        // Actualizar contadores
        const pendingElement = document.getElementById('pendingAutoComplete');
        const autoCompletedElement = document.getElementById('autoCompletedToday');

        if (pendingElement) pendingElement.textContent = stats.pendingCount || 0;
        if (autoCompletedElement) autoCompletedElement.textContent = stats.autoCompletedToday || 0;
        
        // Mostrar/ocultar sección de turnos pendientes
        const pendingSection = document.getElementById('pendingAppointmentsSection');
        if (pendingSection) {
            pendingSection.style.display = stats.pendingCount > 0 ? 'block' : 'none';
        }

        // Cargar turnos pendientes si hay
        if (stats.pendingCount > 0) {
            this.loadPendingAppointments();
        }
        
        // Log de UI removido para consola limpia
    }

    async loadPendingAppointments() {
        try {
            const response = await fetch('/api/appointments/auto-complete/pending');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.displayPendingAppointments(data.data);
                }
            }
        } catch (error) {
            console.error('Error cargando turnos pendientes:', error);
        }
    }

    displayPendingAppointments(appointments) {
        const tbody = document.getElementById('pendingAppointmentsBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        if (appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No hay turnos pendientes de auto-completado
                    </td>
                </tr>
            `;
            return;
        }

        appointments.forEach(appointment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${appointment.cliente_nombre} ${appointment.cliente_apellido}</td>
                <td>${appointment.servicio_nombre}</td>
                <td>${this.formatDate(appointment.fecha)}</td>
                <td>${appointment.hora_fin}</td>
                <td>
                    <span class="badge bg-warning">${appointment.estado}</span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async runAutoComplete() {
        const button = document.getElementById('btnAutoComplete');
        if (!button) return;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Completando turnos confirmados...';
            
            console.log('🚀 Ejecutando completado automático de turnos confirmados...');
            console.log('📊 Total de turnos cargados:', this.turnos.length);
            console.log('🔍 Estados de turnos disponibles:', [...new Set(this.turnos.map(t => t.estado))]);
            
            // Obtener solo turnos confirmados
            const confirmedTurnos = this.turnos.filter(turno => turno.estado === 'confirmado');
            console.log('✅ Turnos confirmados encontrados:', confirmedTurnos.length);
            console.log('📋 Detalles de turnos confirmados:', confirmedTurnos.map(t => ({
                id: t.id,
                cliente: `${t.cliente_nombre} ${t.cliente_apellido}`,
                fecha: t.fecha,
                hora: t.hora_inicio,
                estado: t.estado
            })));
            
            if (confirmedTurnos.length === 0) {
                this.showNotification('ℹ️ No hay turnos confirmados para completar', 'info');
                button.innerHTML = '<i class="fas fa-check-double me-2"></i>Completar Turnos Confirmados';
                button.disabled = false;
                return;
            }
            
            const confirmMessage = `¿Estás seguro de que quieres marcar como COMPLETADOS todos los ${confirmedTurnos.length} turnos confirmados?\n\nEsta acción:\n• Marcará TODOS los turnos confirmados como completados\n• No se puede deshacer\n• Se aplicará independientemente de la hora del turno`;
            
            if (!confirm(confirmMessage)) {
                console.log('❌ Usuario canceló la operación');
                button.innerHTML = '<i class="fas fa-check-double me-2"></i>Completar Turnos Confirmados';
                button.disabled = false;
                return;
            }
            
            console.log('🔄 Usuario confirmó la operación, ejecutando completado automático...');
            
            // Ejecutar completado automático de TODOS los turnos confirmados
            const response = await fetch('/api/appointments/complete-all-confirmed', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' } 
            });
            
            const result = await response.json();
            console.log('📡 Respuesta de la API:', result);
            
            if (result.success) {
                const updatedCount = result.data.updatedCount || 0;
                
                // Mostrar notificación de éxito
                this.showNotification(`✅ ¡Completado exitoso! ${updatedCount} turnos confirmados marcados como completados`, 'success');
                console.log(`✅ Completado automático exitoso: ${updatedCount} turnos procesados`);
                
                // Mostrar detalles de los turnos completados
                if (confirmedTurnos.length > 0) {
                    const turnosInfo = confirmedTurnos.map(t => 
                        `• ${t.cliente_nombre} ${t.cliente_apellido} - ${t.servicio_nombre} (${t.fecha} ${t.hora_inicio})`
                    ).join('\n');
                    console.log('📋 Turnos confirmados completados:\n' + turnosInfo);
                }
                
                console.log('🔄 Actualizando datos y UI...');
                
                // Actualizar datos y UI
                await this.updateAutoCompleteStats();
                await this.loadTurnos();
                this.updateStats();
                
                console.log('🔄 Datos actualizados después de completado automático');
                console.log('📊 Nuevos estados de turnos:', [...new Set(this.turnos.map(t => t.estado))]);
                
                // Mostrar resumen después de 2 segundos
                setTimeout(() => {
                    this.showNotification(`📊 Resumen: ${confirmedTurnos.length} turnos confirmados procesados, ${updatedCount} actualizados`, 'info');
                }, 2000);
                
                // Cambiar el botón a estado "completado" temporalmente
                console.log('🎨 Cambiando botón a estado "completado"...');
                console.log('🔍 Estado anterior del botón:', button.className);
                
                button.innerHTML = '<i class="fas fa-check me-2"></i>¡Completado!';
                button.className = 'btn btn-success btn-lg w-100';
                
                // Aplicar estilos inline como respaldo
                button.style.backgroundColor = '#28a745';
                button.style.borderColor = '#28a745';
                button.style.color = 'white';
                button.style.transform = 'scale(1.05)';
                button.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                
                // Forzar reflow para asegurar que el cambio se aplique
                button.offsetHeight;
                
                console.log('🎨 Botón cambiado a estado "completado" (verde)');
                console.log('🔍 Clases del botón después del cambio:', button.className);
                console.log('🔍 HTML del botón después del cambio:', button.innerHTML);
                console.log('🎨 Estilos inline aplicados:', {
                    backgroundColor: button.style.backgroundColor,
                    borderColor: button.style.borderColor,
                    color: button.style.color
                });
                
                // Verificar que el cambio se aplicó
                setTimeout(() => {
                    console.log('🔍 Verificación después de 100ms - Clases:', button.className);
                    console.log('🔍 Verificación después de 100ms - HTML:', button.innerHTML);
                    console.log('🔍 Verificación después de 100ms - Estilos inline:', {
                        backgroundColor: button.style.backgroundColor,
                        borderColor: button.style.borderColor,
                        color: button.style.color
                    });
                }, 100);
                
                // Después de 3 segundos, restaurar el botón original
                setTimeout(() => {
                    console.log('🔄 Restaurando botón a estado original...');
                    console.log('🔍 Estado actual del botón antes de restaurar:', button.className);
                    
                    button.innerHTML = '<i class="fas fa-check-double me-2"></i>Completar Turnos Confirmados';
                    button.className = 'btn btn-warning btn-lg w-100';
                    
                    // Restaurar estilos inline
                    button.style.backgroundColor = '';
                    button.style.borderColor = '';
                    button.style.color = '';
                    button.style.transform = '';
                    button.style.boxShadow = '';
                    
                    button.disabled = false;
                    
                    // Forzar reflow para asegurar que el cambio se aplique
                    button.offsetHeight;
                    
                    console.log('🔄 Botón restaurado a estado original');
                    console.log('🔍 Clases del botón después de restaurar:', button.className);
                    console.log('🔍 HTML del botón después de restaurar:', button.innerHTML);
                }, 3000);
                
            } else {
                this.showNotification(`❌ Error en completado automático: ${result.message}`, 'error');
                console.error('❌ Error en completado automático:', result.message);
                
                // Restaurar botón en caso de error
                button.innerHTML = '<i class="fas fa-check-double me-2"></i>Completar Turnos Confirmados';
                button.disabled = false;
            }
            
        } catch (error) {
            console.error('Error ejecutando completado automático:', error);
            this.showNotification('❌ Error ejecutando completado automático', 'error');
            
            // Restaurar botón en caso de error
            button.innerHTML = '<i class="fas fa-check-double me-2"></i>Completar Turnos Confirmados';
            button.disabled = false;
        }
    }

    startAutoCompleteTimer() {
        // ⚠️ FUNCIÓN DESHABILITADA PARA PRODUCCIÓN
        // El auto-completado ahora solo funciona manualmente para evitar consumo innecesario de recursos
        
        console.log('🚫 Timer de auto-completado DESHABILITADO');
        console.log('💡 El auto-completado solo funciona cuando se presiona el botón manualmente');
        console.log('✅ Esto reduce el consumo de recursos en un 100% para esta funcionalidad');
        
        // CÓDIGO ORIGINAL COMENTADO:
        // setInterval(() => {
        //     this.updateAutoCompleteStats();
        // }, 5 * 60 * 1000); // 5 minutos
        
        // console.log('🔄 Timer de auto-completado configurado (OPTIMIZADO):');
        // console.log('   - Actualización de estadísticas: cada 5 minutos');
        // console.log('   - Reducción del 90% en consultas automáticas');
    }

    formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR');
    }
}

// Inicializar cuando el DOM esté listo y solo si estamos en la sección de turnos
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si estamos en la sección de turnos
    const turnosSection = document.getElementById('turnos');
    if (turnosSection && turnosSection.classList.contains('active')) {
        window.turnosManager = new TurnosManager();
    }
});

// Inicializar cuando se cambie a la sección de turnos
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('[data-section="turnos"]');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Inicializar después de un pequeño delay para asegurar que la sección esté visible
            setTimeout(() => {
                if (!window.turnosManager) {
                    window.turnosManager = new TurnosManager();
                }
            }, 100);
        });
    });
}); 