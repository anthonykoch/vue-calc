<template>
  <div class="CalculatorBackground">
    <noscript>
      <link
        href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400&display=swap"
        rel="stylesheet"
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </noscript>
    <div class="Calculator">
      <header class="Calculator-header">
        <div class="Calculator-formula" data-formula>
          <span class="Calculator-formulaOverflow"></span
          ><span class="Calculator-formulaList">{{ formula }}</span>
        </div>
        <div class="Calculator-operands">
          <span
            class="Calculator-currentOperand"
            data-total
            :class="{ 'has-error': error }"
            :style="{
              'font-size': font.size,
              'font-weight': font.weight,
            }"
          >
            <span v-if="error">Error</span>
            <span v-else-if="mode & MODE_SHOW_TOTAL">{{ total }}</span>
            <span v-else>{{ currentOperand }}</span>
          </span>
        </div>
      </header>
      <div class="Calculator-body">
        <div class="Calculator-buttonsContainer">
          <button
            v-for="button in buttons"
            class="Calculator-button"
            :key="button.id"
            :data-id="button.id"
            :class="button.className"
            @click="exec(button.action, button.args)"
          >
            <span v-html="button.text" />
          </button>
        </div>
      </div>
      <button
        title="equals"
        class="Calculator-equals"
        @click="onExplicitEquals"
      >
        <div class="Calculator-equalsLine"></div>
        <div class="Calculator-equalsLine"></div>
      </button>
    </div>
  </div>
</template>

<script>
import evalmath, { isOperator } from './math'

const keyboardNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const keyboardOperators = ['*', '+', '-', '/']

const ACTION_CLEAR = 'clear'
const ACTION_CLEAR_ENTRY = 'clearEntry'
const ACTION_NEGATE = 'negate'
const ACTION_UPDATE_OPERATOR = 'updateOperator'
const ACTION_APPEND_OPERAND = 'appendOperand'
const ACTION_ADD_PAREN = 'addParen'
const ACTION_BACKSPACE = 'backspace'
const ACTION_SHOW_TOTAL = 'showTotal'

const buttons = [
  {
    id: 'C',
    text: 'C',
    className: 'is-clear',
    action: ACTION_CLEAR,
  },

  {
    id: 'CE',
    text: 'CE',
    className: 'is-clearEntry',
    action: ACTION_CLEAR_ENTRY,
  },
  {
    id: 'negate',
    text: '+/-',
    className: 'is-negation',
    action: ACTION_NEGATE,
  },
  {
    id: 'modulo',
    text: '%',
    className: 'is-modulo',
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: '%',
    },
  },
  // {
  //   id: 4,
  //   text: '√',
  //   className: 'is-square',
  //   action: ACTION_UPDATE_OPERATOR,
  //   args: {
  //     operator: '√',
  //   },
  // },

  {
    id: '7',
    text: '7',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '7',
    },
  },
  {
    id: '8',
    text: '8',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '8',
    },
  },
  {
    id: '9',
    text: '9',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '9',
    },
  },
  {
    id: '/',
    text: '/',
    className: 'is-division',
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: '/',
    },
  },

  {
    id: '4',
    text: '4',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '4',
    },
  },
  {
    id: '5',
    text: '5',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '5',
    },
  },
  {
    id: '6',
    text: '6',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '6',
    },
  },
  {
    id: '*',
    className: 'is-multiplication',
    text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="rgba(255,255,255,.9)" stroke="rgba(255,255,255,.9)" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144"/><path fill="none" stroke="rgba(255,255,255,.9)" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 144L144 368"/></svg>`,
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: '*',
    },
  },

  {
    id: '1',
    text: '1',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '1',
    },
  },
  {
    id: '2',
    text: '2',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '2',
    },
  },
  {
    id: '3',
    text: '3',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '3',
    },
  },
  {
    id: '-',
    className: 'is-subtraction',
    text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>ionicons-v5-e</title><line x1="400" y1="256" x2="112" y2="256" style="fill:rgba(255,255,255,0.9);stroke:rgba(255,255,255,0.9);stroke-linecap:round;stroke-linejoin:round;stroke-width:32px"/></svg>`,
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: '-',
    },
  },

  {
    id: '0',
    text: '0',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '0',
    },
  },
  {
    id: '(',
    text: '(',
    className: ['is-paren', 'is-open-paren'],
    action: ACTION_ADD_PAREN,
    args: {
      operator: '(',
    },
  },
  {
    id: ')',
    text: ')',
    className: ['is-paren', 'is-close-paren'],
    action: ACTION_ADD_PAREN,
    args: {
      operator: ')',
    },
  },

  {
    id: '.',
    text: '.',
    action: ACTION_APPEND_OPERAND,
    args: {
      value: '.',
    },
  },
  {
    id: '+',
    text: '',
    className: 'is-addition',
    text: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path style="fill: rgba(255,255,255,0.9);stroke: rgba(255,255,255,0.9)" d="M368.5 240H272v-96.5c0-8.8-7.2-16-16-16s-16 7.2-16 16V240h-96.5c-8.8 0-16 7.2-16 16 0 4.4 1.8 8.4 4.7 11.3 2.9 2.9 6.9 4.7 11.3 4.7H240v96.5c0 4.4 1.8 8.4 4.7 11.3 2.9 2.9 6.9 4.7 11.3 4.7 8.8 0 16-7.2 16-16V272h96.5c8.8 0 16-7.2 16-16s-7.2-16-16-16z"/></svg>`,
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: '+',
    },
  },
]

// Mode show total causes the total to be displayed in the current operand display
const MODE_SHOW_TOTAL = 1 << 1
// Mode insert operand causes the current operand to be overwritten. After the first character has been written, the mode should go to mode append operand
const MODE_INSERT_OPERAND = 1 << 2
// Mode append operand causes any operand parts to be appended to the current operand
const MODE_APPEND_OPERAND = 1 << 3

// The maximum number of digits the current operand may be
const MAX_NUMBER_LENGTH = Number.MAX_SAFE_INTEGER.toString().length

function isNumberPart(str) {
  return /^[0-9.]/.test(str)
}

// Debug function for flags
function getFlags(flags) {
  let arr = []

  if (flags & MODE_SHOW_TOTAL) {
    arr.push('MODE_SHOW_TOTAL')
  }
  if (flags & MODE_INSERT_OPERAND) {
    arr.push('MODE_INSERT_OPERAND')
  }

  if (flags & MODE_APPEND_OPERAND) {
    arr.push('MODE_APPEND_OPERAND')
  }

  return arr.join('|')
}

const defaultCommands = [
  {
    match: {
      key: 'Enter',
    },
    action: ACTION_SHOW_TOTAL,
  },
  {
    match: {
      key: 'Backspace',
    },
    action: ACTION_BACKSPACE,
  },
  {
    match: {
      key: 'Escape',
    },
    action: ACTION_CLEAR,
  },
  {
    match: {
      key: 'Delete',
    },
    action: ACTION_CLEAR_ENTRY,
  },
  ...keyboardNumbers.map(n => ({
    match: {
      key: n,
    },
    action: ACTION_APPEND_OPERAND,
    args: {
      value: n,
    },
  })),
  ...keyboardOperators.map(n => ({
    match: {
      key: n,
    },
    action: ACTION_UPDATE_OPERATOR,
    args: {
      value: n,
    },
  })),
]

export default {
  props: {
    commands: {
      type: Array,
      default: () => defaultCommands,
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onKeyDown)
  },
  data() {
    return {
      MODE_SHOW_TOTAL,
      MODE_INSERT_OPERAND,
      MODE_APPEND_OPERAND,
      activeButtons: [],
      buttons,
      expressions: ['5', '+', '7', '-', '45', '+', '3', '+', '177', '-'],
      currentOperand: '147',
      currentOperator: '-',
      mode: MODE_SHOW_TOTAL | MODE_INSERT_OPERAND,
      openParenStack: 0,
      error: null,
      total: 147,
    }
  },
  computed: {
    formula() {
      return this.expressions
        .map((str, index, array) => {
          const s = str.trim()

          if (array[index - 1] === '(') {
            return s
          } else if (s === ')') {
            return s
          } else if (s[0] === '-' && isNumberPart(s[1])) {
            return ' ' + str
          } else {
            return ' ' + s
          }

          return str
        })
        .join('')
    },
    font() {
      // TODO: Change this to be some equation
      let length

      if (this.mode & MODE_SHOW_TOTAL) {
        length = this.total.toString().length
      } else {
        length = this.currentOperand.toString().length
      }

      let size
      let weight

      if (length < 8) {
        size = '60px'
        weight = '200'
      } else if (length <= MAX_NUMBER_LENGTH) {
        size = '28px'
        weight = '300'
      } else if (length >= MAX_NUMBER_LENGTH) {
        size = '24px'
        weight = '300'
      }

      return { size, weight }
    },
  },
  methods: {
    onKeyDown(e) {
      if (event.defaultPrevented) {
        return
      }

      this.commands.forEach(command => {
        Object.keys(command.match).map(key => {
          const value = command.match[key]

          if (e[key] === value) {
            this.exec(command.action, command.args)
            this.$emit('keypress')
          }
        })
      })
    },
    onExplicitEquals() {
      this.showTotal({ explicit: true })
    },
    exec(action, args) {
      console.log(action)

      switch (action) {
        case ACTION_BACKSPACE: {
          this.backspace(args)
          this.$emit('backspace')
          break
        }
        case ACTION_CLEAR: {
          this.clear(args)
          this.$emit('clear')
          break
        }
        case ACTION_CLEAR_ENTRY: {
          this.clearEntry(args)
          this.$emit('clear-entry')
          break
        }
        case ACTION_NEGATE: {
          this.negate(args)
          this.$emit('negate')
          break
        }
        case ACTION_UPDATE_OPERATOR: {
          this.updateOperator(args)
          this.$emit('operator.update')
          break
        }
        case ACTION_APPEND_OPERAND: {
          this.appendOperand(args)
          this.$emit('operand.append')
          break
        }
        case ACTION_ADD_PAREN: {
          this.addParen(args)
          this.$emit('paren.add')
          break
        }
        default: {
          console.error(`action not found: "${action}"`)
        }
      }

      this.showTotal()
    },
    clear() {
      this.expressions = []
      this.currentOperand = '0'
      this.currentOperator = ''
      this.openParenStack = 0
      this.mode = MODE_SHOW_TOTAL | MODE_INSERT_OPERAND
      this.error = null
      this.total = 0
    },

    backspace() {
      let operand = this.currentOperand.slice(0, -1)

      if (operand.length === 0) {
        operand = '0'
      }

      this.currentOperand = operand
    },

    clearEntry() {
      this.currentOperand = '0'
    },

    negate() {
      // Only add negative sign if not zero
      if (this.currentOperand !== 0) {
        this.currentOperand = (-this.currentOperand).toString()
      }

      // console.log(this.currentOperand)
    },

    updateOperator({ operator }) {
      const length = this.expressions.length
      const last = this.expressions[length - 1] || ''
      const { mode, currentOperand } = this

      if (mode & MODE_INSERT_OPERAND) {
        // console.log('MODE_INSERT_OPERAND')

        if (length === 0) {
          this.expressions.push(currentOperand, operator)
        } else if (isOperator(last)) {
          // console.log('isoplast');                            // APPEND_OP LOG
          this.expressions.pop()
          this.expressions.push(operator)
        } else if (last === ')') {
          // console.log('nope');                                // APPEND_OP LOG
          this.expressions.push(operator)
        } else if (last === '(') {
          this.expressions.push(currentOperand, operator)
        }
      } else if (mode & MODE_APPEND_OPERAND) {
        // console.log('MODE_APPEND_OPERAND')

        if (length === 0) {
          this.expressions.push(currentOperand, operator)
        } else if (isOperator(last)) {
          this.expressions.push(currentOperand, operator)
        } else if (last === ')') {
          this.expressions.push(operator)
        } else if (last === '(') {
          this.expressions.push(currentOperand, operator)
        }
      }

      this.currentOperator = operator
      this.mode = MODE_INSERT_OPERAND | MODE_SHOW_TOTAL

      console.log('UPDATE_OPERATOR:', this.expressions)
    },

    addParen({ operator }) {
      const last = this.expressions[this.expressions.length - 1] || ''
      const { currentOperand, openParenStack } = this

      // console.log('ADD_PAREN:', {last, operator});

      if (operator === ')' && openParenStack === 0) {
        // No need to add closing paren if there is no open paren
        return
      } else if (operator === '(' && last === ')') {
        // FIXME: Look at real calculator for semantics
        return
      }

      if (last === '(' && operator === ')') {
        // Handle immediate closed parens
        this.expressions.push(currentOperand, operator)
      } else if (isOperator(last) && operator === ')') {
        // Automatically append current operand when expressions
        // is "(5 *" so result is "(5 * 5)"
        this.expressions.push(currentOperand, operator)
      } else if ((isOperator(last) || length === 0) && operator === '(') {
        // Handle "5 *" where the result is "5 * (" and "(" is the beginning
        // of a new group expression
        this.expressions.push(operator)
      }

      if (operator === '(') {
        this.openParenStack++
      } else if (operator === ')') {
        this.openParenStack--
      }
    },

    appendOperand({ value, operator }) {
      const currentOperand = this.currentOperand
      let newOperand = currentOperand
      let newMode

      // Don't append 0 to 0
      if (value === '0' && currentOperand[0] === '0') {
        return
      } else if (value === '.' && currentOperand.includes('.')) {
        // Avoid appending multiple decimals
        return
      }

      // Switch modes from showing the total to the current operand
      if (this.mode & MODE_SHOW_TOTAL) {
        newMode = MODE_INSERT_OPERAND
      }

      if (this.mode & MODE_INSERT_OPERAND) {
        // console.log('INSERT');
        newOperand = value.toString()
        this.mode = MODE_APPEND_OPERAND
      } else {
        // console.log('APPEND');
        newOperand += value.toString()
      }

      // TODO: Update font size, actually should do that in the vm
      this.currentOperand = newOperand.substring(0, MAX_NUMBER_LENGTH)
    },

    showTotal({ explicit } = {}) {
      const last = this.expressions[this.expressions.length - 1] || ''
      const expressions = this.expressions.slice(0)
      const currentOperand = this.currentOperand
      const mode = this.mode
      const currentTotal = this.total
      const openParenStack = this.openParenStack
      const isFirstNumber = typeof Number(expressions[0]) === 'number'
      const isSecondOperator = isOperator(expressions[1] || '')
      const length = expressions.length
      let times = openParenStack
      let total

      if (expressions.length === 0) {
        return
      } else if (
        explicit &&
        isFirstNumber &&
        isSecondOperator &&
        length === 2
      ) {
        // Handle case where expressions is 5 *

        // console.log('explicit && isFirstNumber && isSecondOperator');
        expressions.push(currentOperand)
      } else if (explicit && isOperator(last)) {
        // Handle case where expressions is ['5', '*', '4', '+'] and
        // the total is being explicitly being requested

        // console.log('explicit && isOperator(last)', isOperator(last), last);
        if (mode & MODE_INSERT_OPERAND) {
          expressions.push(currentTotal)
        } else if (mode & MODE_APPEND_OPERAND) {
          expressions.push(currentOperand)
        }
      } else if (isOperator(last)) {
        // Handle case where expressions is ['5', '*', '4', '+']
        expressions.pop()
      }

      if (explicit) {
        // Automatically close parens when explicitly requesting
        // the total
        let times = openParenStack

        while (times-- > 0) {
          expressions.push(')')
        }
      } else if (!explicit && openParenStack === 1) {
        // Auto close if there is only one missing paren
        expressions.push(')')
      }

      try {
        total = evalmath(expressions.join(' '))

        if (explicit) {
          this.clear()
        }

        this.total = total
      } catch (err) {
        if (explicit) {
          this.clear()
          this.error = err
          console.log(err)
        }
      }

      console.log(
        'SHOW_TOTAL; Expressions: "%s"; Total: %s; Explicit: %s',
        expressions.join(' '),
        total,
        !!explicit
      )

      if (explicit) {
        this.$emit('update:total.explicit')
      } else {
        this.$emit('update:total')
      }

      return total
    },
  },
}
</script>

<style>
/* // */
/* // -> Design credit goes to Jaroslav Getman */
/* // -> https://dribbble.com/shots/2334270-004-Calculator */
/* // */

/* @import url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css') */

html {
  --foreground--dark: #151515;

  --background-gradient-1: #b6b2ab;
  --background-gradient-2: #b3afa7;

  --background-gradient-3: #b8b5af;
  --background-gradient-4: #78736b;

  --background-gradient-5: #6f6862;
  --background-gradient-6: #58504b;

  --background-gradient-7: #5f574e;
  --background-gradient-8: #625a51;

  /* // I don't know how to get the colors closer here, would need the actual hsla */
  --gradient-blue-1: hsla(226, 12%, 40%, 0.76);
  --gradient-blue-2: hsla(222, 12%, 13%, 0.8);

  --gradient-orange-1: #ff8d4b;
  --gradient-orange-2: #ff542e;

  --calculator-width: 260px;
  --header-padding-left: 20px;
  --something-height: 22px;
}

.Calculator,
.Calculator *,
.Calculator *:before,
.Calculator *:after {
  box-sizing: inherit;
}

.CalculatorBackground {
  background-size: cover;
  background-repeat: no-repeat;
  background-image: linear-gradient(
    135deg,
    #b6b2ab 0%,
    #b3afa7 25%,
    #b8b5af 25%,
    #78736b 50%,
    #6f6862 50%,
    #58504b 75%,
    #5f574e 75%,
    #625a51 100%
  );
  min-height: 100vh;
}

.Calculator {
  box-shadow: 12px 18px 45px 0 rgba(0, 0, 0, 0.25);
  cursor: default;
  font-family: Source Sans Pro;
  line-height: 1.5;
  margin: 0 auto;
  position: relative;
  user-select: none;
  width: var(--calculator-width);
  z-index: 1;
}

.Calculator-header {
  background: white;
  overflow: hidden;
  padding: 20px var(--header-padding-left);
  position: relative;
  text-align: right;
}

.Calculator-formula {
  color: rgba(158, 158, 158, 0.76);
  display: block;
  float: right;
  font-size: 15px;
  line-height: var(--something-height);
  min-height: var(--something-height);
  position: relative;
  white-space: nowrap;
  width: 100%;
  word-wrap: normal;
}

.Calculator-formulaList {
  display: block;
  float: right;
}

/* // 	Not sure how to represent that there are more expressions to the left */
.Calculator__expressionsOverflow {
  /* $width: 2px */
  color: #333;
  box-shadow: 5px 0 20px 4px rgba(0, 0, 0, 0.3);
  font-weight: 700;
  opacity: 0;
  padding-right: 0px;
  text-align: center;
  transition: opacity 0.5s;
  transform: translate(0, -50%);
  /* +position(absolute, 50% null null negative($header-padding-left) - $width - 2) */
  /* +size($width $height - 5) */
}

.Calculator__expressionsOverflow:before {
  content: '';
}

.Calculator__expressionsOverflow.is-showing {
  opacity: 1;
}

.Calculator-operands {
  color: var(--foreground--dark);
  font-size: 60px;
  font-weight: 200;
  line-height: 1.1;
  clear: both;
}

.Calculator-currentOperand {
  display: block;
  float: right;
  line-height: 60px;
  overflow: visible;
  min-height: 60px;
  transition-duration: 0.2s;
  transition-property: font-size;
}

.Calculator-currentOperand.has-error {
  color: hsla(10, 85%, 57%, 1);
}

.Calculator-body {
  background: white;
}

.Calculator-buttonsContainer {
  display: flex;
  flex-wrap: wrap;
  overflow: visible;
  position: relative;
}

.Calculator-buttonsContainer:before {
  background-color: rgba(90, 95, 114, 0.76);
  background-image: linear-gradient(
    to bottom,
    rgba(90, 95, 114, 0.76),
    rgba(29, 32, 37, 0.8)
  );
  box-shadow: 17px 27px 72px 1px rgba(0, 0, 0, 0.3);
  content: '';
  filter: drop-shadow(0px 0px 7px rgba(0, 0, 0, 0.2));
  left: -18px;
  position: absolute;
  right: -18px;
  top: 0;
  bottom: 0;
  /* width: 100%; */
  /* height: 100%; */
}

.Calculator-button {
  background-color: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  font-family: Source Sans Pro;
  font-size: 22px;
  font-weight: 300;
  justify-content: center;
  line-height: 70px;
  outline: 0;
  padding: 0;
  position: relative;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.2s, background-color 0.15s;
  z-index: 1;
  width: 25%;
}

.Calculator-button:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.Calculator-button.is-active,
.Calculator-button:active {
  box-shadow: inset 0 3px 15px 0 rgba(0, 0, 0, 0.3);
}

.Calculator-button > span {
  display: block;
}

.Calculator-button.is-negation,
.Calculator-button.is-modulo {
  font-size: 18px;
}

.Calculator-button.is-square {
  font-size: 16px;
}

.Calculator-button.is-division {
  font-size: 20px;
}

.Calculator-button.is-multiplication svg {
  width: 20px;
}

.Calculator-button.is-addition svg {
  width: 20px;
}

.Calculator-button.is-subtraction svg {
  width: 20px;
}

.Calculator-button.is-paren {
  display: flex;
  font-size: 18px;
  width: 12.5%;
}

.Calculator-button--paren:hover,
.Calculator-button--paren:active {
  background: initial !important;
  box-shadow: none !important;
  cursor: default !important;
}

.Calculator-button--paren > span {
  flex: 50%;
}

.Calculator-equals {
  background-color: transparent;
  border: 0;
  background-image: linear-gradient(to right, #ff8d4b, #ff542e);
  cursor: pointer;
  display: block;
  padding: 26px 0;
  outline: none;
  position: relative;
  width: 100%;
  z-index: -1;
}

.Calculator-equalsLine {
  background: white;
  box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.4);
  display: block;
  margin: 0 auto 6px;
  width: 20px;
  height: 1px;
}

.Calculator-equalsLine:last-child {
  margin-bottom: 0;
}
</style>
