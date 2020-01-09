import { mount, shallowMount } from '@vue/test-utils'
import Calculator from '@/calculator.vue'

describe('calculator.vue', () => {
  it('at least does simple math', () => {
    const wrapper = shallowMount(Calculator)

    const expressions = ['5', '+', '7', '-', '45', '+', '3', '+', '177', '-']
    const currentOperand = '147'

    expressions.concat([currentOperand]).forEach(input => {
      input
        .split('')
        .forEach(n => wrapper.find(`[data-id="${n}"]`).trigger('click'))
    })

    expect(wrapper.find('[data-formula]').text()).toMatch(expressions.join(' '))
  })

  it('accepts number keydown commands', () => {
    const wrapper = mount(Calculator, {
      attachToDocument: true,
    })

    for (let i = 1; i < 10; i++) {
      wrapper.trigger('keydown', {
        key: i.toString(),
      })
    }

    wrapper.trigger('keydown', {
      key: '0',
    })

    expect(wrapper.find('[data-total]').text()).toMatch('1234567890')
  })

  it('accepts number keydown commands', () => {
    const wrapper = mount(Calculator, {
      attachToDocument: true,
    })

    for (let i = 1; i < 10; i++) {
      wrapper.trigger('keydown', {
        key: i.toString(),
      })
    }

    wrapper.trigger('keydown', {
      key: '0',
    })

    expect(wrapper.find('[data-total]').text()).toMatch('1234567890')
  })

  it('accepts operator keydown commands', () => {
    const wrapper = mount(Calculator, {
      attachToDocument: true,
    })

    wrapper.trigger('keydown', {
      key: '1',
    })

    ['+', '-', '*', '/'].forEach((key) => {
      wrapper.trigger('keydown', {
        key: key,
      })

      expect(wrapper.find('[data-formula]').text()).toMatch(`1 ${key}`)
    })

    expect(wrapper.find('[data-total]').text()).toMatch('')
  })

  it('resets on Escape keydown', () => {
    const wrapper = mount(Calculator, {
      attachToDocument: true,
    })

    wrapper.trigger('keydown', {
      key: '1',
    })
    wrapper.trigger('keydown', {
      key: '*',
    })
    wrapper.trigger('keydown', {
      key: '2',
    })

    wrapper.trigger('keydown.esc')

    expect(wrapper.find('[data-formula]').text()).toMatch('')
    expect(wrapper.find('[data-total]').text()).toMatch('0')
  })

  it('erases character on backspace', () => {
    const wrapper = mount(Calculator, {
      attachToDocument: true,
    })

    wrapper.trigger('keydown', {
      key: '1',
    })
    wrapper.trigger('keydown', {
      key: '*',
    })
    wrapper.trigger('keydown', {
      key: '2',
    })

    wrapper.trigger('keydown', {
      key: '0',
    })

    wrapper.trigger('keydown', {
      key: 'Backspace',
    })

    expect(wrapper.find('[data-formula]').text()).toMatch('')
    expect(wrapper.find('[data-total]').text()).toMatch('2')

    wrapper.trigger('keydown', {
      key: 'Backspace',
    })

    expect(wrapper.find('[data-total]').text()).toMatch('')
  })
})
