describe('Eliminar una Venta por ID', () => {
  let ventaIdParaEliminar;

  before(() => {
    cy.request('POST', 'http://localhost:7050/api/ventas', {
      fecha: '2025-12-31',
      id_alimento: 5,
      cantidad: 99
    }).then(response => {
      ventaIdParaEliminar = response.body.id_venta;
    });
  });

  it('Debería seleccionar la opción de eliminar, ingresar el ID y eliminar la venta', () => {
    cy.visit('http://localhost:7050/');

    cy.get('#endpoint').select('DELETE');

    cy.get('#deleteId').type(ventaIdParaEliminar);

    cy.get('#apiQueryForm').submit();
  });
});