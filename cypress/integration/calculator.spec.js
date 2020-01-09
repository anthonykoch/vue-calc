// import { mount, shallowMount } from '@vue/test-utils'
// import Calculator from '@/calculator.vue'

context('calculator.vue', () => {
  beforeEach(() => {
    console.log('FUCK')
    cy.visit('http://127.0.0.1:8080')
  })

  it('at least does simple math', () => {
    const expressions = ['5', '+', '7', '-', '45', '+', '3', '+', '177', '-']

    expressions.forEach(input => {
      input.split('').forEach(n => {
        cy.get(`[data-key="${n}"]`).trigger('click')
      })
    })

    cy.get('[data-formula]')
      .invoke('text')
      .should('match', /5 \+ 7 \- 45 \+ 3 \+ 177 \-/)
  })

  it('buttons append to operand', () => {
    for (let i = 0; i < 10; i++) {
      cy.get(`[data-key="${i}"]`).trigger('click')
    }

    cy.get('[data-total]')
      .invoke('text')
      .should('match', /0123456789/)
  })

  it('operator buttons append to operand', () => {
    cy.get(`[data-key="1"]`).trigger('click')
    cy.get('[data-total]')
      .invoke('text')
      .should('match', /1/)

    cy.get('.Calculator').trigger('keydown', {
      key: '+',
    })
    cy.get('[data-formula]')
      .invoke('text')
      .should('match', /1 \+/)

    cy.get('.Calculator').trigger('keydown', {
      key: '-',
    })
    cy.get('[data-formula]')
      .invoke('text')
      .should('match', /1 \-/)

    cy.get('.Calculator').trigger('keydown', {
      key: '*',
    })
    cy.get('[data-formula]')
      .invoke('text')
      .should('match', /1 \*/)

    cy.get('.Calculator').trigger('keydown', {
      key: '/',
    })
    cy.get('[data-formula]')
      .invoke('text')
      .should('match', /1 \//)
  })

  it('resets on Escape keydown', () => {
    cy.get(`[data-key="1"]`).trigger('click')
    cy.get(`[data-key="*"]`).trigger('click')
    cy.get(`[data-key="2"]`).trigger('click')

    cy.get('[data-formula]')
      .invoke('text')
      .should('match', /1 \*/)

    cy.get('[data-total]')
      .invoke('text')
      .should('match', /2/)

    cy.get('.Calculator').trigger('keydown', {
      key: 'Escape',
    })

    cy.get('[data-formula]')
      .then(el => {
        expect(el.text().trim()).to.equal('')
      })

    cy.get('[data-total]')
      .then(el => {
        expect(el.text().trim()).to.equal('0')
      })
  })

  it('erases character on backspace', () => {})
})
