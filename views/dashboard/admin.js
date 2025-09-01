// Panel de Administración
class AdminPanel {
    constructor() {
        // ✅ VALIDAR QUE EL USUARIO SEA ADMIN ANTES DE INICIALIZAR
        if (!this.isUserAdmin()) {
            console.warn('AdminPanel: Acceso denegado - Se requiere rol de administrador');
            throw new Error('Acceso denegado: Se requiere rol de administrador');
        }
        
        // Verificar que estamos en el contexto correcto
        if (typeof window.currentUser === 'undefined' || window.currentUser.rol !== 'admin') {
            console.warn('AdminPanel: Usuario no autorizado o no autenticado');
            throw new Error('Usuario no autorizado');
        }
        
        // Log de inicialización removido para consola limpia
        this.initializeEventListeners();
        this.loadAdminData();
    }

    // ✅ FUNCIÓN DE UTILIDAD PARA VERIFICAR ROL
    isUserAdmin() {
        // Verificar tanto localStorage como la variable global
        const userRole = localStorage.getItem('userRole');
        const globalUser = window.currentUser;
        
        // Verificar que el usuario esté autenticado y sea admin
        if (!globalUser || globalUser.rol !== 'admin') {
            return false;
        }
        
        // Verificar que coincida con localStorage
        if (userRole !== 'admin') {
            return false;
        }
        
        return true;
    }

    initializeEventListeners() {
        // Botón de actualizar empleados
        document.getElementById('refreshEmployeesBtn')?.addEventListener('click', () => {
            this.loadEmployees();
        });

        // Botones de copiar códigos
        document.getElementById('copyBarberCode')?.addEventListener('click', () => {
            this.copyToClipboard('barberCode', 'Código de barbero copiado');
        });

        document.getElementById('copyAdminCode')?.addEventListener('click', () => {
            this.copyToClipboard('adminCode', 'Código de administrador copiado');
        });

        // Botones de acciones del sistema
        document.getElementById('backupSystemBtn')?.addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('systemInfoBtn')?.addEventListener('click', () => {
            this.showSystemInfo();
        });
    }

    async loadAdminData() {
        // ✅ VERIFICAR ROL ANTES DE CARGAR DATOS
        if (!this.isUserAdmin()) {
            console.warn('AdminPanel: Acceso denegado a loadAdminData');
            return;
        }
        
        // Verificación adicional de seguridad
        if (typeof window.currentUser === 'undefined' || window.currentUser.rol !== 'admin') {
            console.warn('AdminPanel: Usuario no autorizado en loadAdminData');
            return;
        }

        try {
            // Cargar lista de barberos
            await this.loadEmployees();
            
            // Cargar códigos de registro
            this.loadRegistrationCodes();
            
        } catch (error) {
            console.error('Error cargando datos de administración:', error);
            this.showToast('Error cargando datos de administración', 'error');
        }
    }





    async loadEmployees() {
        // ✅ VERIFICAR ROL ANTES DE CARGAR EMPLEADOS
        if (!this.isUserAdmin()) {
            console.warn('AdminPanel: Acceso denegado a loadEmployees');
            return;
        }
        
        // Verificación adicional de seguridad
        if (typeof window.currentUser === 'undefined' || window.currentUser.rol !== 'admin') {
            console.warn('AdminPanel: Usuario no autorizado en loadEmployees');
            return;
        }

        try {
            const response = await fetch('/api/employees', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderEmployeesTable(data.employees);
            } else {
                throw new Error('Error al cargar empleados');
            }
        } catch (error) {
            console.error('Error cargando empleados:', error);
            this.showToast('Error cargando lista de barberos', 'error');
        }
    }

    renderEmployeesTable(employees) {
        const tbody = document.getElementById('employeesTableBody');
        
        if (!employees || employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay barberos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = employees.map(employee => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm me-2">
                            <i class="fas fa-user-circle fa-2x text-muted"></i>
                        </div>
                        <div>
                            <strong>${employee.nombre} ${employee.apellido}</strong>
                        </div>
                    </div>
                </td>
                <td>${employee.email}</td>
                <td>${employee.nombre_barberia || 'N/A'}</td>
                <td>
                    <span class="badge ${employee.rol === 'admin' ? 'bg-danger' : 'bg-primary'}">
                        ${employee.rol === 'admin' ? 'Administrador' : 'Barbero'}
                    </span>
                </td>
                <td>
                    <span class="badge ${employee.estado === 'activo' ? 'bg-success' : 'bg-warning'}">
                        ${employee.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${employee.ultimo_acceso ? new Date(employee.ultimo_acceso).toLocaleString() : 'Nunca'}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="adminPanel.toggleEmployeeStatus('${employee.id}')" title="Cambiar estado">
                            <i class="fas ${employee.estado === 'activo' ? 'fa-user-times' : 'fa-user-check'}"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="adminPanel.changeEmployeeRole('${employee.id}')" title="Cambiar rol">
                            <i class="fas fa-user-edit"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="adminPanel.viewEmployeeDetails('${employee.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async toggleEmployeeStatus(employeeId) {
        // ✅ VERIFICAR ROL ANTES DE CAMBIAR ESTADO
        if (!this.isUserAdmin()) {
            console.warn('AdminPanel: Acceso denegado a toggleEmployeeStatus');
            this.showToast('Acceso denegado: Se requiere rol de administrador', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/employees/${employeeId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showToast('Estado del barbero actualizado', 'success');
                await this.loadEmployees();
            } else {
                throw new Error('Error al actualizar estado');
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            this.showToast('Error al cambiar estado del barbero', 'error');
        }
    }

    async changeEmployeeRole(employeeId) {
        // ✅ VERIFICAR ROL ANTES DE CAMBIAR ROL
        if (!this.isUserAdmin()) {
            console.warn('AdminPanel: Acceso denegado a changeEmployeeRole');
            this.showToast('Acceso denegado: Se requiere rol de administrador', 'error');
            return;
        }

        const newRole = confirm('¿Cambiar rol del barbero?') ? 'admin' : 'barbero';
        
        try {
            const response = await fetch(`/api/employees/${employeeId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                this.showToast('Rol del barbero actualizado', 'success');
                await this.loadEmployees();
            } else {
                throw new Error('Error al actualizar rol');
            }
        } catch (error) {
            console.error('Error cambiando rol:', error);
            this.showToast('Error al cambiar rol del barbero', 'error');
        }
    }

    async viewEmployeeDetails(employeeId) {
        // ✅ VERIFICAR ROL ANTES DE VER DETALLES
        if (!this.isUserAdmin()) {
            console.warn('AdminPanel: Acceso denegado a viewEmployeeDetails');
            this.showToast('Acceso denegado: Se requiere rol de administrador', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/employees/${employeeId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.displayEmployeeDetails(data.employee);
                } else {
                    throw new Error('Error al cargar detalles del barbero');
                }
            } else {
                throw new Error('Error al cargar detalles del barbero');
            }
        } catch (error) {
            console.error('Error cargando detalles del barbero:', error);
            this.showToast('Error al cargar detalles del barbero', 'error');
        }
    }

    displayEmployeeDetails(employee) {
        const modalBody = document.getElementById('employeeDetailsModalBody');
        const modalTitle = document.getElementById('employeeDetailsModalLabel');
        
        modalTitle.textContent = `Detalles de ${employee.nombre || 'Empleado'}`;
        
        const detailsHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Información Personal</h6>
                    <ul class="list-unstyled">
                        <li><strong>Nombre:</strong> ${employee.nombre || 'N/A'}</li>
                        <li><strong>Apellido:</strong> ${employee.apellido || 'N/A'}</li>
                        <li><strong>Email:</strong> ${employee.email || 'N/A'}</li>
                        <li><strong>Teléfono:</strong> ${employee.telefono || 'N/A'}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>Información Laboral</h6>
                    <ul class="list-unstyled">
                        <li><strong>Rol:</strong> <span class="badge bg-${employee.rol === 'admin' ? 'danger' : 'primary'}">${employee.rol || 'N/A'}</span></li>
                        <li><strong>Estado:</strong> <span class="badge bg-${employee.estado === 'activo' ? 'success' : 'warning'}">${employee.estado || 'N/A'}</span></li>
                        <li><strong>Barbería:</strong> ${employee.barberia || 'N/A'}</li>
                        <li><strong>Fecha de Registro:</strong> ${employee.fecha_registro ? new Date(employee.fecha_registro).toLocaleDateString() : 'N/A'}</li>
                    </ul>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Estadísticas</h6>
                    <div class="row">
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-primary">${employee.total_turnos || 0}</div>
                                <small class="text-muted">Total Turnos</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-success">${employee.turnos_completados || 0}</div>
                                <small class="text-muted">Completados</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-warning">${employee.turnos_pendientes || 0}</div>
                                <small class="text-muted">Pendientes</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="h4 text-info">${employee.rating || 'N/A'}</div>
                                <small class="text-muted">Rating</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = detailsHtml;
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('employeeDetailsModal'));
        modal.show();
    }

    loadRegistrationCodes() {
        // Los códigos se cargan desde el backend
        document.getElementById('barberCode').value = 'ALEXIS2024';
        document.getElementById('adminCode').value = 'ADMIN2024';
    }

    copyToClipboard(elementId, message) {
        const element = document.getElementById(elementId);
        element.select();
        element.setSelectionRange(0, 99999); // Para dispositivos móviles
        
        try {
            document.execCommand('copy');
            this.showToast(message, 'success');
        } catch (err) {
            console.error('Error copiando al portapapeles:', err);
            this.showToast('Error al copiar código', 'error');
        }
    }

    async createBackup() {
        try {
            this.showToast('Creando backup del sistema...', 'info');
            
            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showToast('Backup creado exitosamente', 'success');
            } else {
                throw new Error('Error creando backup');
            }
        } catch (error) {
            console.error('Error creando backup:', error);
            this.showToast('Error al crear backup', 'error');
        }
    }

    async clearLogs() {
        if (!confirm('¿Estás seguro de que quieres limpiar los logs del sistema?')) {
            return;
        }

        try {
            this.showToast('Limpiando logs...', 'info');
            
            const response = await fetch('/api/admin/clear-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showToast('Logs limpiados exitosamente', 'success');
            } else {
                throw new Error('Error limpiando logs');
            }
        } catch (error) {
            console.error('Error limpiando logs:', error);
            this.showToast('Error al limpiar logs', 'error');
        }
    }

    async showSystemInfo() {
        try {
            const response = await fetch('/api/admin/system-info', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displaySystemInfo(data);
            } else {
                throw new Error('Error obteniendo información del sistema');
            }
        } catch (error) {
            console.error('Error obteniendo información del sistema:', error);
            this.showToast('Error al obtener información del sistema', 'error');
        }
    }

    displaySystemInfo(info) {
        const infoHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Información del Sistema</h6>
                    <ul class="list-unstyled">
                        <li><strong>Versión:</strong> ${info.version || '1.0.0'}</li>
                        <li><strong>Base de Datos:</strong> ${info.database || 'MySQL'}</li>
                        <li><strong>Node.js:</strong> ${info.nodeVersion || 'N/A'}</li>
                        <li><strong>Uptime:</strong> ${info.uptime || 'N/A'}</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>Estadísticas</h6>
                    <ul class="list-unstyled">
                        <li><strong>Usuarios:</strong> ${info.totalUsers || 0}</li>
                        <li><strong>Turnos:</strong> ${info.totalAppointments || 0}</li>
                        <li><strong>Servicios:</strong> ${info.totalServices || 0}</li>
                        <li><strong>Clientes:</strong> ${info.totalClients || 0}</li>
                    </ul>
                </div>
            </div>
        `;

        // Mostrar en modal
        const modal = new bootstrap.Modal(document.getElementById('systemInfoModal'));
        document.getElementById('systemInfoModalBody').innerHTML = infoHtml;
        modal.show();
    }

    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert">
                <div class="toast-header">
                    <i class="fas fa-info-circle text-${type} me-2"></i>
                    <strong class="me-auto">Administración</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();
        
        // Remover el toast después de que se oculte
        document.getElementById(toastId).addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
}

// Inicializar el panel de administración cuando se carga la página
let adminPanel;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario es admin desde localStorage
    const userRole = localStorage.getItem('userRole');
    
    if (userRole === 'admin') {
        // Mostrar el enlace de navegación de administración
        const adminNavItem = document.querySelector('.nav-item.admin-only');
        if (adminNavItem) {
            adminNavItem.style.display = 'block';
        }
        
        // ✅ SOLO INICIALIZAR EL PANEL SI ES ADMIN
        try {
            adminPanel = new AdminPanel();
            // Log de inicialización removido para consola limpia
        } catch (error) {
            console.error('❌ Error inicializando AdminPanel:', error);
            // Si hay error, ocultar la sección de admin
            const adminSection = document.getElementById('admin');
            if (adminSection) {
                adminSection.style.display = 'none';
            }
        }
    } else {
        // ✅ OCULTAR COMPLETAMENTE LA SECCIÓN DE ADMIN PARA NO-ADMINS
        const adminSection = document.getElementById('admin');
        if (adminSection) {
            adminSection.style.display = 'none';
        }
        
        // ✅ OCULTAR ENLACE DE NAVEGACIÓN
        const adminNavItem = document.querySelector('.nav-item.admin-only');
        if (adminNavItem) {
            adminNavItem.style.display = 'none';
        }
    }
});

// ✅ INICIALIZACIÓN SOLO PARA ADMINS AL CAMBIAR DE SECCIÓN
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('[data-section="admin"]');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // ✅ VERIFICAR ROL ANTES DE INICIALIZAR
            const userRole = localStorage.getItem('userRole');
            if (userRole === 'admin') {
                setTimeout(() => {
                    if (!adminPanel) {
                        try {
                            adminPanel = new AdminPanel();
                            // Log de inicialización removido para consola limpia
                        } catch (error) {
                            console.error('❌ Error inicializando AdminPanel por clic:', error);
                            // Si hay error, ocultar la sección de admin
                            const adminSection = document.getElementById('admin');
                            if (adminSection) {
                                adminSection.style.display = 'none';
                            }
                        }
                    }
                }, 100);
            } else {
                // ✅ PREVENIR ACCESO NO AUTORIZADO
                console.warn('Acceso denegado: Se requiere rol de administrador');
                // Opcional: mostrar mensaje de error
                alert('Acceso denegado: Se requiere rol de administrador');
                return false;
            }
        });
    });
});

// Hacer la clase AdminPanel disponible globalmente
window.AdminPanel = AdminPanel;
