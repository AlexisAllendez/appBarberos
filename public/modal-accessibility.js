/**
 * Script para mejorar la accesibilidad de los modales
 * Soluciona el problema de aria-hidden con elementos con foco
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Función para manejar el foco en modales
    function handleModalFocus() {
        const modals = document.querySelectorAll('.modal');
        
        modals.forEach(modal => {
            // Cuando el modal se muestra
            modal.addEventListener('shown.bs.modal', function() {
                // Remover aria-hidden cuando el modal está visible
                this.removeAttribute('aria-hidden');
                
                // Enfocar el primer elemento interactivo
                const firstFocusable = this.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            });
            
            // Cuando el modal se oculta
            modal.addEventListener('hidden.bs.modal', function() {
                // Restaurar aria-hidden cuando el modal está oculto
                this.setAttribute('aria-hidden', 'true');
                
                // Remover el foco de cualquier elemento dentro del modal
                const focusedElement = this.querySelector(':focus');
                if (focusedElement) {
                    focusedElement.blur();
                }
            });
            
            // Manejar el foco dentro del modal (trap focus)
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    const focusableElements = this.querySelectorAll(
                        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );
                    
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey) {
                        // Shift + Tab
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        // Tab
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
                
                // Escape para cerrar modal
                if (e.key === 'Escape') {
                    const modalInstance = bootstrap.Modal.getInstance(this);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }
            });
        });
    }
    
    // Función para mejorar botones de cierre
    function improveCloseButtons() {
        const closeButtons = document.querySelectorAll('.btn-close');
        
        closeButtons.forEach(button => {
            // Asegurar que tenga aria-label
            if (!button.getAttribute('aria-label')) {
                button.setAttribute('aria-label', 'Cerrar');
            }
            
            // Mejorar el manejo del clic
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const modal = this.closest('.modal');
                if (modal) {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }
            });
        });
    }
    
    // Función para mejorar la accesibilidad de los modales dinámicos
    function handleDynamicModals() {
        // Observar cambios en el DOM para modales que se crean dinámicamente
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('modal')) {
                        // Nuevo modal agregado
                        handleModalFocus();
                        improveCloseButtons();
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Inicializar mejoras de accesibilidad
    handleModalFocus();
    improveCloseButtons();
    handleDynamicModals();
    
    // Mejorar el manejo de modales existentes
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                // Asegurar que el foco se maneje correctamente
                setTimeout(() => {
                    const focusedElement = modal.querySelector(':focus');
                    if (focusedElement) {
                        focusedElement.blur();
                    }
                }, 100);
            }
        }
    });
    
    // Mejorar el manejo de backdrop
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-backdrop')) {
            const modal = document.querySelector('.modal.show');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        }
    });
});

// Función global para crear modales con mejor accesibilidad
window.createAccessibleModal = function(id, title, content, options = {}) {
    const modalHtml = `
        <div class="modal fade" id="${id}" tabindex="-1" aria-labelledby="${id}Label" aria-hidden="true">
            <div class="modal-dialog ${options.size || 'modal-lg'}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${id}Label">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${options.footer ? `
                    <div class="modal-footer">
                        ${options.footer}
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const existingModal = document.getElementById(id);
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Crear instancia del modal
    const modal = new bootstrap.Modal(document.getElementById(id));
    
    // Configurar opciones adicionales
    if (options.backdrop !== undefined) {
        modal._config.backdrop = options.backdrop;
    }
    
    if (options.keyboard !== undefined) {
        modal._config.keyboard = options.keyboard;
    }
    
    return modal;
};
