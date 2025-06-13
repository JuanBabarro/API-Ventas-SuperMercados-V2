document.addEventListener('DOMContentLoaded', () => {
    const queryForm = document.getElementById('apiQueryForm');
    const endpointSelect = document.getElementById('endpoint');
    const resultContainer = document.getElementById('apiResult');

    // Contenedores de parametros
    const paramsDivs = {
        getFechaParams: document.getElementById('getFechaParams'),
        rangoFechaParams: document.getElementById('rangoFechaParams'),
        addVentaParams: document.getElementById('addVentaParams'),
        updateVentaParams: document.getElementById('updateVentaParams'),
        deleteVentaParams: document.getElementById('deleteVentaParams')
    };

    // Funcion para mostrar solo el div de parametros necesario
    function showParams(divId) {
        Object.values(paramsDivs).forEach(div => div.classList.add('hidden'));
        if (divId && paramsDivs[divId]) {
            paramsDivs[divId].classList.remove('hidden');
        }
    }

    // Cargar productos en el select del formulario de agregar
    async function cargarProductos() {
        try {
            const response = await fetch('/api/alimentos');
            const data = await response.json();
            const selectAlimento = document.getElementById('addAlimento');
            selectAlimento.innerHTML = '<option value="">Cargando...</option>';
            if (response.ok) {
                selectAlimento.innerHTML = '<option value="">Selecciona un producto</option>';
                data.data.forEach(alimento => {
                    selectAlimento.innerHTML += `<option value="${alimento.id_alimento}">${alimento.nombre}</option>`;
                });
            } else {
                selectAlimento.innerHTML = '<option value="">Error al cargar</option>';
            }
        } catch (error) {
            console.error("Error cargando productos", error);
        }
    }
    cargarProductos();


    // Event listener para el cambio en el selector de endpoints
    endpointSelect.addEventListener('change', () => {
        const selected = endpointSelect.value;
        switch (selected) {
            case 'GET_BY_DATE':
                showParams('getFechaParams');
                break;
            case 'GET_BY_RANGE':
                showParams('rangoFechaParams');
                break;
            case 'POST':
                showParams('addVentaParams');
                break;
            case 'PUT':
                showParams('updateVentaParams');
                break;
            case 'DELETE':
                showParams('deleteVentaParams');
                break;
            default:
                showParams(null);
                break;
        }
    });

    // Event listener para el envio del formulario
    queryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resultContainer.textContent = 'Procesando...';

        const selected = endpointSelect.value;
        let url = '';
        let options = {};

        try {
            switch (selected) {
                case 'GET_ALL':
                    url = '/api/ventas';
                    break;
                
                case 'GET_BY_DATE':
                    const fecha = document.getElementById('getFecha').value;
                    if (!fecha) { throw new Error('La fecha es requerida.'); }
                    url = `/api/ventas/fecha/${fecha}`;
                    break;

                case 'GET_BY_RANGE':
                    const desde = document.getElementById('fechaDesde').value;
                    const hasta = document.getElementById('fechaHasta').value;
                    if (!desde || !hasta) { throw new Error('Ambas fechas son requeridas.'); }
                    url = `/api/ventas/rango_fecha?desde=${desde}&hasta=${hasta}`;
                    break;
                
                case 'POST':
                    url = '/api/ventas';
                    options = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fecha: document.getElementById('addFecha').value,
                            id_alimento: document.getElementById('addAlimento').value,
                            cantidad: parseInt(document.getElementById('addCantidad').value, 10)
                        })
                    };
                    break;
                
                case 'PUT':
                    const updateId = document.getElementById('updateId').value;
                    if (!updateId) { throw new Error('El ID de la venta es requerido.'); }
                    url = `/api/ventas/${updateId}`;
                    options = {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            cantidad: parseInt(document.getElementById('updateCantidad').value, 10)
                        })
                    };
                    break;
                
                case 'DELETE':
                    const deleteId = document.getElementById('deleteId').value;
                    if (!deleteId) { throw new Error('El ID de la venta es requerido.'); }
                    url = `/api/ventas/${deleteId}`;
                    options = { method: 'DELETE' };
                    break;

                default:
                    throw new Error('Por favor, selecciona una acción válida.');
            }

            const response = await fetch(url, options);
            const data = await response.json();
            resultContainer.textContent = JSON.stringify(data, null, 2);

        } catch (error) {
            resultContainer.textContent = `Error: ${error.message}`;
        }
    });
});