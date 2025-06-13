describe('Obtener Ventas por Fecha', () => {
  it('Debería seleccionar la opción de buscar por fecha y obtener los resultados', () => {
    cy.visit('http://localhost:7050/');

    cy.get('#endpoint').select('GET_BY_DATE');

    cy.get('#getFecha').type('2025-07-15');

    cy.get('#apiQueryForm').submit();
  });
});