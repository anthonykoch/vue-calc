import { shallowMount } from '@vue/test-utils'
import Calculator from '@/calculator.vue'

describe('calculator.vue', () => {
  it('at least does simple math', () => {
    const wrapper = shallowMount(Calculator)

    const expressions = ['5', '+', '7', '-', '45', '+', '3', '+', '177', '-'];
    const currentOperand = '147';

    expressions.concat([currentOperand]).forEach((input) => {
      input.split('').forEach((n) => wrapper.find(`[data-id="${n}"]`).trigger('click'))
    })
    expect(wrapper.find('[data-formula]').text()).toMatch(expressions.join(' '))
  })
})
