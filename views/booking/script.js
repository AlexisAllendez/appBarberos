// Booking Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const bookingForm = document.getElementById('bookingForm');
    const barberoSelect = document.getElementById('barbero');
    const serviceSelect = document.getElementById('servicio');
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    
    // Variables globales para servicios y precios
    let servicesData = {};
    let servicePrices = {};
    let serviceNames = {};
    let barberosData = {};
    let serviciosPorBarbero = {};
    let selectedBarberId = null;
    
    // Configurar fecha mínima (hoy)
    const today = new Date().toISOString().split('T')[0];
    fechaInput.min = today;
    
    // Configurar fecha por defecto (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    fechaInput.value = tomorrow.toISOString().split('T')[0];
    
    // Cargar servicios y barberos desde la API
    async function loadServices() {
        try {
            const response = await fetch('/api/booking/services');
            const result = await response.json();
            
            if (result.success) {
                // Guardar datos globales
                barberosData = result.barberos || [];
                serviciosPorBarbero = result.serviciosPorBarbero || {};
                
                // Cargar selector de barberos
                loadBarberSelector();
                
                if (barberosData.length > 0) {
                    // selectedBarberId = barberosData[0].id; // Comentado para evitar selección automática
                    // loadServicesForBarber(selectedBarberId); // Comentado para evitar carga automática
                }
                
                showAvailabilityMessage(`${result.total_barberos} barberos disponibles con ${result.total_servicios} servicios`, 'success');
            } else {
                console.error('Error al cargar servicios:', result.message);
                showAvailabilityMessage('Error al cargar servicios', 'error');
                loadFallbackServices();
            }
        } catch (error) {
            console.error('Error al cargar servicios:', error);
            showAvailabilityMessage('Error al cargar servicios', 'error');
            loadFallbackServices();
        }
    }

    // Función para cargar servicios de respaldo cuando no hay barberos disponibles
    function loadFallbackServices() {
        // Mostrar mensaje informativo
        showAvailabilityMessage('Cargando servicios de respaldo...', 'info');
        
        // Limpiar selectores
        barberoSelect.innerHTML = '<option value="">No hay barberos disponibles</option>';
        serviceSelect.innerHTML = '<option value="">No hay servicios disponibles</option>';
        
        // Deshabilitar formulario
        document.getElementById('bookingForm').classList.add('disabled');
        
        // Mostrar mensaje de estado
        setTimeout(() => {
            showAvailabilityMessage('Por favor, contacta al administrador para configurar servicios', 'warning');
        }, 2000);
    }
    
    function loadBarberSelector() {
        barberoSelect.innerHTML = '<option value="">Selecciona un barbero</option>';
        
        barberosData.forEach(barbero => {
            const option = document.createElement('option');
            option.value = barbero.id;
            // Evitar mostrar 'undefined' en el nombre
            const nombreCompleto = `${barbero.nombre || ''} ${barbero.apellido || ''}`.trim();
            option.textContent = nombreCompleto || 'Barbero sin nombre';
            barberoSelect.appendChild(option);
        });
        
        barberoSelect.classList.add('service-select-transition');
    }
    
    function loadServicesForBarber(barberId) {
        if (!serviciosPorBarbero[barberId]) {
            serviceSelect.innerHTML = '<option value="">No hay servicios disponibles para este barbero</option>';
            serviceSelect.classList.add('no-services-message');
            return;
        }
        
        const servicios = serviciosPorBarbero[barberId].servicios;
        serviceSelect.innerHTML = '<option value="">Selecciona un servicio</option>';
        serviceSelect.classList.remove('no-services-message');
        
        servicios.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.nombre} - ${formatPrice(service.precio)}`;
            
            servicesData[service.id] = service;
            servicePrices[service.id] = service.precio;
            serviceNames[service.id] = service.nombre;
            
            serviceSelect.appendChild(option);
        });
        
        serviceSelect.value = '';
        updateServiceInfo();
        serviceSelect.classList.add('service-select-transition');
    }
    
    function updateServiceBarberInfo(barbero) {
        // Función simplificada - solo para compatibilidad
        // Los elementos de información del servicio han sido removidos
    }

    function cleanProfessionalInfo() {
        // Buscar y remover cualquier elemento que contenga información del profesional
        const summaryCard = document.querySelector('.summary-card');
        if (summaryCard) {
            // Buscar elementos que contengan "Profesional" o el emoji
            const professionalElements = summaryCard.querySelectorAll('*');
            professionalElements.forEach(element => {
                const text = element.textContent || element.innerText || '';
                if (text.includes('Profesional') || text.includes('👨‍💼') || text.includes('Establecimiento') || text.includes('🏪')) {
                    // Remover el elemento padre (summary-item)
                    const summaryItem = element.closest('.summary-item');
                    if (summaryItem) {
                        summaryItem.remove();
                    }
                }
            });
        }
    }

    function showAvailabilityMessage(message, type = 'success') {
        const existingMessages = document.querySelectorAll('.availability-message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `availability-message alert alert-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'success'} mt-2`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'info-circle' : type === 'info' ? 'info-circle' : 'check-circle'} me-2"></i>
            ${message}
        `;
        
        // Buscar el contenedor apropiado para insertar el mensaje
        let targetContainer = null;
        
        // Intentar encontrar la sección de horarios primero
        const timeSlotsSection = document.querySelector('.time-slots-section');
        if (timeSlotsSection) {
            targetContainer = timeSlotsSection;
        } else {
            // Fallback: buscar el contenedor del input de hora
            const horaInputGroup = horaSelect?.closest('.input-group');
            if (horaInputGroup && horaInputGroup.parentElement) {
                targetContainer = horaInputGroup.parentElement;
            } else {
                // Fallback: buscar el formulario
                targetContainer = document.querySelector('.booking-form') || document.getElementById('bookingForm');
            }
        }
        
        // Solo insertar si encontramos un contenedor válido
        if (targetContainer) {
            targetContainer.appendChild(messageDiv);
            
            const timeout = type === 'info' ? 8000 : 10000;
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, timeout);
        } else {
            // Si no encontramos contenedor, solo logear el mensaje sin error
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    function getMonthName(monthNumber) {
        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return months[monthNumber - 1];
    }
    
    function validateBarberSelection() {
        if (!selectedBarberId || selectedBarberId === '' || selectedBarberId === null) {
            return false;
        }
        
        const selectedBarber = barberosData.find(b => b.id == selectedBarberId);
        if (!selectedBarber) {
            return false;
        }
        
        return true;
    }

    function updateSummary() {
        // Limpiar cualquier elemento de "Profesional" que pueda haber aparecido dinámicamente
        cleanProfessionalInfo();
        
        const selectedService = serviceSelect.value;
        const selectedDate = fechaInput.value;
        // Obtener el horario seleccionado de la nueva interfaz o del input oculto
        let selectedTime = '';
        if (window.timeSlotsGrid && window.timeSlotsGrid.getSelectedTime) {
            selectedTime = window.timeSlotsGrid.getSelectedTime();
        } else if (horaSelect) {
            selectedTime = horaSelect.value;
        }
        
        // Actualizar resumen de servicio
        const summaryServicio = document.getElementById('summaryServicio');
        if (selectedService && serviceNames[selectedService]) {
            summaryServicio.textContent = serviceNames[selectedService];
        } else {
            summaryServicio.textContent = '-';
        }
        
        // Actualizar resumen de fecha
        const summaryFecha = document.getElementById('summaryFecha');
        if (selectedDate) {
            const [year, month, day] = selectedDate.split('-').map(Number);
            const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            const dayOfWeek = days[utcDate.getUTCDay()];
            const fechaOriginal = `${day} de ${getMonthName(month)} de ${year}`;
            summaryFecha.textContent = `${dayOfWeek}, ${fechaOriginal}`;
        } else {
            summaryFecha.textContent = '-';
        }
        
        // Actualizar resumen de hora
        const summaryHora = document.getElementById('summaryHora');
        if (selectedTime) {
            summaryHora.textContent = selectedTime;
        } else {
            summaryHora.textContent = '-';
        }
        
        // Actualizar resumen de precio
        const summaryPrecio = document.getElementById('summaryPrecio');
        if (selectedService && servicePrices[selectedService]) {
            const serviceData = servicesData[selectedService];
            let priceText = `${formatPrice(servicePrices[selectedService])}`;
            
            if (serviceData && serviceData.precio_anterior && serviceData.precio_anterior > serviceData.precio) {
                const discount = serviceData.precio_anterior - serviceData.precio;
                priceText += ` <span class="text-success">(Ahorras ${formatPrice(discount)})</span>`;
            }
            
            summaryPrecio.innerHTML = priceText;
        } else {
            summaryPrecio.textContent = '-';
        }
        
        // Información del barbero removida del resumen
    }
    
    // Event listeners para actualizar resumen
    serviceSelect.addEventListener('change', function() {
        updateSummary();
        updateServiceInfo();
    });
    fechaInput.addEventListener('change', updateSummary);
    // Solo agregar event listener si horaSelect existe (compatibilidad con nueva interfaz)
    if (horaSelect) {
        horaSelect.addEventListener('change', updateSummary);
    }
    
    // Event listener para cargar horarios cuando cambie la fecha
    fechaInput.addEventListener('change', function() {
        if (!validateBarberSelection()) {
            showAvailabilityMessage('Por favor, selecciona un barbero antes de elegir fecha', 'warning');
            fechaInput.value = '';
            return;
        }
        
        const selectedService = serviceSelect.value;
        loadAvailableSlots(fechaInput.value, selectedService);
    });
    
    // Event listener para recargar horarios cuando cambie el servicio
    serviceSelect.addEventListener('change', function() {
        if (fechaInput.value) {
            if (!validateBarberSelection()) {
                showAvailabilityMessage('Por favor, selecciona un barbero antes de elegir servicio', 'warning');
                return;
            }
            
            loadAvailableSlots(fechaInput.value, serviceSelect.value);
        }
    });
    
    // Event listener para cambio de barbero
    barberoSelect.addEventListener('change', function() {
        const newSelectedBarberId = this.value;
        selectedBarberId = newSelectedBarberId;
        
        serviceSelect.classList.add('loading-services');
        
        if (selectedBarberId && selectedBarberId !== '') {
            setTimeout(() => {
                loadServicesForBarber(selectedBarberId);
                
                fechaInput.value = '';
                if (horaSelect) {
                    horaSelect.innerHTML = '<option value="">Selecciona fecha primero</option>';
                }
                
                serviceSelect.classList.remove('loading-services');
                
                const selectedBarber = barberosData.find(b => b.id == selectedBarberId);
                if (selectedBarber) {
                    const nombreCompleto = `${selectedBarber.nombre || ''} ${selectedBarber.apellido || ''}`.trim();
                    showAvailabilityMessage(`Barbero seleccionado: ${nombreCompleto}`, 'success');
                    // Actualizar el resumen con la información del barbero
                    updateSummary();
                }
            }, 300);
        } else {
            serviceSelect.innerHTML = '<option value="">Selecciona un barbero primero</option>';
            serviceSelect.classList.remove('loading-services');
            // Limpiar el resumen cuando no hay barbero seleccionado
            updateSummary();
        }
    });
    
    async function loadAvailableSlots(fecha, servicioId = null) {
        try {
            // Verificar si estamos usando la nueva interfaz de cuadrícula
            if (window.timeSlotsGrid && typeof window.timeSlotsGrid.loadTimeSlots === 'function') {
                // Usar la nueva interfaz de cuadrícula
                window.timeSlotsGrid.loadTimeSlots();
                return;
            }
            
            // Código original para la interfaz de dropdown (fallback)
            // Usar la función de validación global
            if (!validateBarberSelection()) {
                showAvailabilityMessage('Por favor, selecciona un barbero válido primero', 'warning');
                if (horaSelect) {
                    horaSelect.innerHTML = '<option value="">Selecciona un barbero primero</option>';
                }
                return;
            }
            
            const selectedBarber = barberosData.find(b => b.id == selectedBarberId);
            const nombreCompleto = `${selectedBarber.nombre || ''} ${selectedBarber.apellido || ''}`.trim();
            
            const params = new URLSearchParams({ fecha });
            
            // Agregar el ID del barbero seleccionado
            params.append('barbero_id', selectedBarberId);
            
            if (servicioId) {
                params.append('servicio_id', servicioId);
            }
            
            const response = await fetch(`/api/booking/slots?${params}`);
            const result = await response.json();
            
            if (result.success) {
                if (horaSelect) {
                    horaSelect.innerHTML = '<option value="">Selecciona hora</option>';
                    
                    if (result.data.length > 0) {
                        if (result.barbero) {
                            updateServiceBarberInfo(result.barbero);
                        }
                        
                        result.data.forEach((slot, index) => {
                            const option = document.createElement('option');
                            option.value = slot.hora_inicio;
                            option.textContent = slot.hora_inicio;
                            option.setAttribute('data-end-time', slot.hora_fin);
                            horaSelect.appendChild(option);
                        });
                        
                        showAvailabilityMessage(`${result.data.length} horarios disponibles`);
                    } else {
                        const message = result.message || 'No hay horarios disponibles para esta fecha';
                        showAvailabilityMessage(message, 'warning');
                        horaSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
                        
                        if (result.barbero) {
                            updateServiceBarberInfo(result.barbero);
                        }
                    }
                }
            } else {
                console.error('Error al cargar horarios:', result.message);
                showAvailabilityMessage(result.message || 'Error al cargar horarios', 'error');
                if (horaSelect) {
                    horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
                }
            }
        } catch (error) {
            console.error('Error al cargar horarios:', error);
            showAvailabilityMessage('Error de conexión al cargar horarios', 'error');
            if (horaSelect) {
                horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
            }
        }
    }
    
    function loadDefaultTimeSlots() {
        horaSelect.innerHTML = `
            <option value="">Selecciona hora</option>
            <option value="09:00">09:00</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="12:00">12:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
            <option value="16:00">16:00</option>
            <option value="17:00">17:00</option>
        `;
    }
    
    function updateServiceInfo() {
        // Función simplificada - solo para compatibilidad
        // Los elementos de información del servicio han sido removidos
    }
    
    function validateForm() {
        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const barbero = barberoSelect.value;
        const servicio = serviceSelect.value;
        const fecha = fechaInput.value;
        // Obtener el horario seleccionado de la nueva interfaz o del input oculto
        let hora = '';
        if (window.timeSlotsGrid && window.timeSlotsGrid.getSelectedTime) {
            hora = window.timeSlotsGrid.getSelectedTime();
        } else if (horaSelect) {
            hora = horaSelect.value;
        }
        
        if (!nombre) {
            showError('Por favor ingresa tu nombre');
            return false;
        }
        
        if (!apellido) {
            showError('Por favor ingresa tu apellido');
            return false;
        }
        
        if (!email) {
            showError('Por favor ingresa tu correo electrónico');
            return false;
        }
        
        if (!isValidEmail(email)) {
            showError('Por favor ingresa un correo electrónico válido');
            return false;
        }
        
        if (!telefono) {
            showError('Por favor ingresa tu teléfono');
            return false;
        }
        
        if (!barbero) {
            showError('Por favor selecciona un barbero');
            return false;
        }
        
        if (!servicio) {
            showError('Por favor selecciona un servicio');
            return false;
        }
        
        if (!fecha) {
            showError('Por favor selecciona una fecha');
            return false;
        }
        
        if (!hora) {
            showError('Por favor selecciona una hora');
            return false;
        }
        
        return true;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showError(message) {
        const existingError = document.querySelector('.alert-danger');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        `;
        
        bookingForm.appendChild(errorDiv);
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success mt-3';
        successDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
        `;
        
        bookingForm.appendChild(successDiv);
        successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Enviar formulario
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        const bookingButton = document.querySelector('.btn-booking');
        const originalText = bookingButton.innerHTML;
        
        // Mostrar estado de carga
        bookingButton.classList.add('loading');
        bookingButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando reserva...';
        
        try {
            // Recopilar datos del formulario
            const formData = {
                nombre: document.getElementById('nombre').value.trim(),
                apellido: document.getElementById('apellido').value.trim(),
                email: document.getElementById('email').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                barbero: barberoSelect.value, // Agregar el barbero seleccionado
                servicio: serviceSelect.value,
                fecha: fechaInput.value,
                // Obtener el horario seleccionado de la nueva interfaz o del input oculto
                hora: window.timeSlotsGrid && window.timeSlotsGrid.getSelectedTime ? 
                      window.timeSlotsGrid.getSelectedTime() : 
                      (horaSelect ? horaSelect.value : ''),
                comentarios: document.getElementById('comentarios').value.trim()
            };
            
            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess(`¡Reserva confirmada! Tu código de confirmación es: ${result.data.confirmationCode}`);
                
                bookingForm.reset();
                fechaInput.value = tomorrow.toISOString().split('T')[0];
                loadAvailableSlots(fechaInput.value, serviceSelect.value);
                updateSummary();
                
                setTimeout(() => {
                    showAvailabilityMessage('Los horarios disponibles se han actualizado automáticamente', 'info');
                }, 1000);
            } else {
                showError(result.message || 'Hubo un error al procesar tu reserva');
            }
            
        } catch (error) {
            console.error('Error al procesar la reserva:', error);
            showError('Hubo un error al procesar tu reserva. Por favor intenta de nuevo.');
        } finally {
            bookingButton.classList.remove('loading');
            bookingButton.innerHTML = originalText;
        }
    });
    
    const telefonoInput = document.getElementById('telefono');
    telefonoInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            if (value.length <= 3) {
                value = value;
            } else if (value.length <= 6) {
                value = value.slice(0, 3) + '-' + value.slice(3);
            } else {
                value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
            }
        }
        
        e.target.value = value;
    });
    
    loadServices();
    loadAvailableSlots(fechaInput.value);
    updateSummary();
    
    // Limpiar información innecesaria que pueda existir
    setTimeout(cleanProfessionalInfo, 500);
    
    const formSections = document.querySelectorAll('.form-section');
    formSections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.6s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 200 + (index * 100));
    });
});

const style = document.createElement('style');
style.textContent = `
    .alert {
        border-radius: 15px;
        border: none;
        padding: 1rem 1.5rem;
        margin-top: 1rem;
        font-weight: 500;
    }
    
    .alert-danger {
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
        border-left: 4px solid #dc3545;
    }
    
    .alert-success {
        background: rgba(40, 167, 69, 0.1);
        color: #28a745;
        border-left: 4px solid #28a745;
    }
    
    .alert-warning {
        background: rgba(255, 193, 7, 0.1);
        color: #ffc107;
        border-left: 4px solid #ffc107;
    }
    
    .alert i {
        font-size: 1.1rem;
    }
    
         .availability-message {
         font-size: 0.9rem;
         padding: 0.75rem 1rem;
         margin-top: 0.5rem;
         border-radius: 10px;
         position: relative;
         z-index: 1;
     }
    
    .form-select option {
        padding: 0.5rem;
    }
    
         .form-select option:hover {
         background-color: #f8f9fa;
     }
     
     .input-group .form-control,
     .input-group .form-select {
         position: relative;
         z-index: 10;
     }
     
     .input-group .form-select:focus {
         z-index: 11;
     }
`;
document.head.appendChild(style); 