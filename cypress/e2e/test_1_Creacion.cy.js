describe('Creación de una Venta', () => {
  it('Debería seleccionar la opción, completar el formulario y crear una nueva venta', () => {
    cy.visit('http://localhost:7050/');

    cy.get('#endpoint').select('POST');

    cy.get('#addFecha').type('2025-07-15');
    
    cy.get('#addAlimento').select('Carnes'); 

    cy.get('#addCantidad').type('150');

    cy.get('#apiQueryForm').submit();
  });
});