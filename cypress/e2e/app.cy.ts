describe('emoji app', () => {
  beforeEach(() => {
    cy.visit('localhost:8080');
  });

  it('search box is focused after the page load', () => {
    cy.get('input[type=search]').should('be.focused');
  });

  it('should filter emojis', () => {
    cy.get('input[type=search]').type('poo');
    cy.contains('💩').should('be.visible');
    cy.contains('😀').should('not.be.visible');
  });

  it('should copy emoji into clipboard', () => {
    cy.contains('💩').click();
    cy.get('.flash').should('be.visible').should('have.text', '💩 copied');
  });
});
