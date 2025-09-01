/**
 * Time Slots Grid Manager
 * Maneja la nueva interfaz de horarios en cuadrícula
 * Compatible con el sistema existente
 */

class TimeSlotsGrid {
    constructor() {
        this.gridContainer = document.getElementById('timeSlotsGrid');
        this.loadingElement = document.getElementById('timeSlotsLoading');
        this.emptyElement = document.getElementById('timeSlotsEmpty');
        this.hiddenInput = document.getElementById('hora');
        this.selectedSlot = null;
        
        this.init();
    }
    
    init() {
        // Ocultar elementos inicialmente
        this.showLoading();
        
        // Escuchar cambios en la fecha para cargar horarios
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            fechaInput.addEventListener('change', () => {
                this.loadTimeSlots();
            });
        }
    }
    
    showLoading() {
        this.gridContainer.style.display = 'none';
        this.emptyElement.style.display = 'none';
        this.loadingElement.style.display = 'block';
    }
    
    showEmpty(message = 'No hay horarios disponibles para esta fecha') {
        this.gridContainer.style.display = 'none';
        this.loadingElement.style.display = 'none';
        this.emptyElement.style.display = 'block';
        
        const emptyText = this.emptyElement.querySelector('p');
        if (emptyText) {
            emptyText.textContent = message;
        }
    }
    
    showGrid() {
        this.loadingElement.style.display = 'none';
        this.emptyElement.style.display = 'none';
        this.gridContainer.style.display = 'grid';
    }
    
    async loadTimeSlots() {
        const fechaInput = document.getElementById('fecha');
        const barberoSelect = document.getElementById('barbero');
        const serviceSelect = document.getElementById('servicio');
        
        if (!fechaInput || !fechaInput.value) {
            this.showEmpty('Selecciona una fecha primero');
            return;
        }
        
        if (!barberoSelect || !barberoSelect.value) {
            this.showEmpty('Selecciona un barbero primero');
            return;
        }
        
        this.showLoading();
        
        try {
            const params = new URLSearchParams({
                fecha: fechaInput.value,
                barbero_id: barberoSelect.value
            });
            
            if (serviceSelect && serviceSelect.value) {
                params.append('servicio_id', serviceSelect.value);
            }
            
            const response = await fetch(`/api/booking/slots?${params}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                this.renderTimeSlots(result.data);
                this.showGrid();
            } else {
                const message = result.message || 'No hay horarios disponibles para esta fecha';
                this.showEmpty(message);
            }
        } catch (error) {
            console.error('Error al cargar horarios:', error);
            this.showEmpty('Error al cargar horarios. Intenta de nuevo.');
        }
    }
    
    renderTimeSlots(slots) {
        this.gridContainer.innerHTML = '';
        
        slots.forEach((slot, index) => {
            const button = this.createTimeSlotButton(slot, index);
            this.gridContainer.appendChild(button);
        });
    }
    
    createTimeSlotButton(slot, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot-btn available';
        button.setAttribute('data-time', slot.hora_inicio);
        button.setAttribute('data-end-time', slot.hora_fin);
        button.setAttribute('data-duration', slot.duracion || 30);
        
        // Calcular duración en texto
        const duration = slot.duracion || 30;
        const durationText = this.formatDuration(duration);
        
        button.innerHTML = `
            <div class="time-slot-status"></div>
            <div class="time-slot-info">
                <div class="time-slot-main">${slot.hora_inicio}</div>
                <div class="time-slot-duration">${durationText}</div>
            </div>
        `;
        
        // Agregar evento de clic
        button.addEventListener('click', () => {
            this.selectTimeSlot(button, slot);
        });
        
        // Agregar animación de entrada con delay
        button.style.animationDelay = `${index * 0.1}s`;
        
        return button;
    }
    
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        } else if (minutes === 60) {
            return '1 hora';
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes === 0) {
                return `${hours} hora${hours > 1 ? 's' : ''}`;
            } else {
                return `${hours}h ${remainingMinutes}m`;
            }
        }
    }
    
    selectTimeSlot(button, slot) {
        // Remover selección anterior
        const previousSelected = this.gridContainer.querySelector('.time-slot-btn.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
            previousSelected.classList.add('available');
        }
        
        // Seleccionar nuevo horario
        button.classList.remove('available');
        button.classList.add('selected');
        
        // Actualizar input oculto para mantener compatibilidad
        this.hiddenInput.value = slot.hora_inicio;
        
        // Disparar evento change para mantener compatibilidad con el código existente
        const event = new Event('change', { bubbles: true });
        this.hiddenInput.dispatchEvent(event);
        
        this.selectedSlot = slot;
        
        // Mostrar feedback visual
        this.showSelectionFeedback(button, slot);
    }
    
    showSelectionFeedback(button, slot) {
        // Efecto de confirmación visual
        button.style.transform = 'scale(1.05)';
        setTimeout(() => {
            button.style.transform = '';
        }, 200);
        
        // Mostrar mensaje de confirmación
        this.showAvailabilityMessage(`Horario seleccionado: ${slot.hora_inicio} - ${slot.hora_fin}`, 'success');
    }
    
    showAvailabilityMessage(message, type = 'success') {
        // Remover mensajes anteriores
        const existingMessages = document.querySelectorAll('.availability-message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `availability-message alert alert-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'success'} mt-2`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'info-circle' : type === 'info' ? 'info-circle' : 'check-circle'} me-2"></i>
            ${message}
        `;
        
        // Insertar después de la sección de horarios
        const timeSlotsSection = document.querySelector('.time-slots-section');
        if (timeSlotsSection) {
            timeSlotsSection.appendChild(messageDiv);
        }
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
    
    // Método para limpiar selección
    clearSelection() {
        const selectedButton = this.gridContainer.querySelector('.time-slot-btn.selected');
        if (selectedButton) {
            selectedButton.classList.remove('selected');
            selectedButton.classList.add('available');
        }
        
        this.hiddenInput.value = '';
        this.selectedSlot = null;
    }
    
    // Método para obtener el horario seleccionado
    getSelectedTime() {
        return this.selectedSlot ? this.selectedSlot.hora_inicio : '';
    }
    
    // Método para verificar si hay un horario seleccionado
    hasSelection() {
        return this.selectedSlot !== null;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Crear instancia del gestor de horarios
    window.timeSlotsGrid = new TimeSlotsGrid();
    
    // Integrar con el código existente
    const originalLoadAvailableSlots = window.loadAvailableSlots;
    
    if (typeof originalLoadAvailableSlots === 'function') {
        // Sobrescribir la función original para usar la nueva interfaz
        window.loadAvailableSlots = function(fecha, servicioId = null) {
            // Usar la nueva interfaz de cuadrícula
            if (window.timeSlotsGrid) {
                window.timeSlotsGrid.loadTimeSlots();
            }
        };
    }
    
    // Escuchar cambios en barbero y servicio para recargar horarios
    const barberoSelect = document.getElementById('barbero');
    const serviceSelect = document.getElementById('servicio');
    
    if (barberoSelect) {
        barberoSelect.addEventListener('change', () => {
            if (window.timeSlotsGrid) {
                window.timeSlotsGrid.loadTimeSlots();
            }
        });
    }
    
    if (serviceSelect) {
        serviceSelect.addEventListener('change', () => {
            if (window.timeSlotsGrid) {
                window.timeSlotsGrid.loadTimeSlots();
            }
        });
    }
});

// Exportar para uso global
window.TimeSlotsGrid = TimeSlotsGrid;
