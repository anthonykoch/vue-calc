import { shallowMount } from '@vue/test-utils'
import HelloWorld from '@/calculator.vue'

describe('calculator.vue', () => {
  it('renders without crashing', () => {
    const msg = 'new message'
    const wrapper = shallowMount(HelloWorld)
  })

  it('at least does simple math', () => {
    const msg = 'new message'
    const wrapper = shallowMount(HelloWorld)
    // expect(wrapper.text()).toMatch(msg)
  })

  it('cleasr on clear button click', () => {
    const msg = 'new message'
    const wrapper = shallowMount(HelloWorld)
    // expect(wrapper.text()).toMatch(msg)
  })
})
