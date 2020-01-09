import { normalizeComponent, createInjector } from 'vue-runtime-helpers';

var TYPE_NUMBER_LITERAL = 'NUMBER_LITERAL';

/**
 * A lexer, inspired by Stylus's lexer.
 * @constructor
 * @param {String} options.data
 */
var Lexer = function Lexer(ref) {
  var data = ref.data;

  this.input = String(data);
  this.position = 0;
  this.char = this.input[this.position];
  this.tokens = [];
  this.stash = [];
};

  /**
 * Moves the lexer's current character to the next character in the input.
 * Returns '\x00' if the position is passed the input
 * @private
 * @return {String}
 */
Lexer.prototype.advance = function advance () {
  return (this.char = this.input[++this.position] || '\x04')
};

/**
 * Looks ahead into the token stream by the index passed. The tokens
 * are cached for performance.
 * @public
 * @param{Number} index
 * @return {void}
 */
Lexer.prototype.lookahead = function lookahead (index) {
  var times = index - this.stash.length;

  if (this.position > this.input.length) {
    return '\x04'
  }

  while (times-- > 0) {
    var token = this.lex();

    while (token === '\x00') {
      token = this.lex();
    }

    this.stash.push(token);
  }

  return this.stash[index - 1]
};

/**
 * Looks into the token stream one token ahead
 * @public
 * @return {String}
 */
Lexer.prototype.peek = function peek () {
  return this.lookahead(1)
};

Lexer.prototype.getNextChar = function getNextChar () {
  return this.input[this.position + 1]
};

Lexer.prototype.getPreviousChar = function getPreviousChar () {
  return this.input[this.position - 1]
};

/**
 * Returns the next token in the token stream
 * @public
 * @return {String}
 */
Lexer.prototype.next = function next () {
  var token;

  if (this.position > this.input.length) {
    return '\x04'
  }

  while (true) {
    if (this.stash.length) {
      return this.stash.shift()
    }

    token = this.lex();

    if (token !== '\x00') {
      return token
    }
  }

  throw new Error('wtf this should be unreachable: lexer.next')
};

/**
 * Moves the lexer's position the specified length
 * @private
 * @param{Number} times
 * @return {void}
 */
Lexer.prototype.skip = function skip (length) {
  this.position += length;
  this.char = this.input[this.position];
};

/**
 * Stores the most recently found literal
 * @private
 * @param {void} literal
 */
Lexer.prototype.setLiteral = function setLiteral (literal) {
  this.currentLiteral = literal;
};

/**
 * Returns the most recently lexed literal. Always returns the value as a string.
 * @public
 * @return {String}
 */
Lexer.prototype.getLiteral = function getLiteral () {
  return this.currentLiteral
};

/**
 * Returns the next token from the lexer's input.
 * Returns null when there are no more tokens to be consumed
 * @private
 * @return {String|null}
 */
Lexer.prototype.lex = function lex () {
  if (this.position >= this.input.length) {
    return '\x04'
  }

  if (isWhitespace(this.char)) {
    this.advance();
    return '\x00'
  }

  var token =
    this.getParenToken() || this.getNumberToken() || this.getOperatorToken();

  if (token === null || token === undefined) {
    throw new Error(
      ("Unrecognized token \"" + (this.char) + "\" at position " + (this.position))
    )
  }

  return token
};

/**
 * Returns a paren punctuation character
 * @return {String|null}
 */
Lexer.prototype.getParenToken = function getParenToken () {
  var char = this.char;

  if (isParen(this.char)) {
    this.advance();
    return char
  }

  return null
};

/**
 * Returns constant TYPE_NUMBER_LITERAL if number is found
 * @return {String|null}
 */
Lexer.prototype.getNumberToken = function getNumberToken () {
  var numberLiteral = this.char;

  if (
    isDigit(this.char) ||
    (isDot(this.char) && isDigit(this.getNextChar()))
  ) {
    while (isDigit(this.advance())) {
      numberLiteral += this.char;
    }

    if (isDot(this.char)) {
      do {
        numberLiteral += this.char;
      } while (isDigit(this.advance()))
    }
  } else {
    return null
  }

  this.setLiteral(numberLiteral);

  if (numberLiteral.length) {
    return TYPE_NUMBER_LITERAL
  } else {
    return null
  }
};

/**
 * Returns operator punctuation character
 * @return {String|null}
 */
Lexer.prototype.getOperatorToken = function getOperatorToken () {
  var char = this.char;

  if (isOperatorStart(this.char)) {
    var substr = this.input.substring(
      this.position,
      this.position + longestOperatorLength
    );
    var match = substr.match(RE_OPERATOR_WHOLE);

    if (!match) {
      throw new Error('wtf dooood there was not a opeator token found...')
    }

    var length = match[0].length;

    while (length-- > 0) {
      this.advance();
    }

    return match[0]
  }

  return null
};

var operators = ['/', '*', '**', '-', '+', '√', '%'];

var longestOperatorLength = operators.reduce(function(length, item) {
  if (item.length > length) {
    return item.length
  }

  return length
}, 0);

/**
 * Courtesy of
 * http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param  {String} str
 * @return {String}
 */
var escapeRegExp = function (str) { return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'); };

var isDigit = function (char) { return RE_DIGIT.test(char); };

var isOperatorStart = function (char) { return RE_OPERATOR_START.test(char); };

var isParen = function (char) { return RE_PAREN.test(char); };

var isWhitespace = function (char) { return RE_WHITESPACE.test(char); };

var isDot = function (value) { return value === '.'; };

var isOperator = function (str) { return operators.includes(str); };

var RE_DIGIT = /[0-9]/;
var RE_PAREN = /[()]/;
var RE_WHITESPACE = /\s/;
var RE_OPERATOR_START = new RegExp(
  Array.from(new Set(operators.map(function (str) { return str[0]; })))
    .map(function (str) { return escapeRegExp(str); })
    .join('|')
);

// All the operators, sorted by longest string length
var RE_OPERATOR_WHOLE = new RegExp(
  Array.from(operators)
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (str) { return escapeRegExp(str); })
    .join('|')
);

/**
 * Recursive descent parser modified from
 * https://github.com/mattgoldspink/tapdigit/blob/master/TapDigit.js#L448
 * Note: This throw errors when passed a lexer that is parsing an empty string
 * @constructor
 * @param {Lexer} options.lexer
 */
var Parser = function Parser(ref) {
  var lexer = ref.lexer;

  this.lexer = lexer;
  this.position = 0;
};

Parser.prototype.parsePrimary = function parsePrimary () {
  var token = this.lexer.peek();
  var expression;

  if (token === '\x00') {
    console.log('WTF NULL STRING TOKEN', token);
    throw new Error('Unexpected end of expression')
  }

  if (token === '(') {
    token = this.lexer.next();
    expression = this.parseExpression();
    token = this.lexer.next();

    if (token !== ')') {
      throw new SyntaxError(("Expected \")\", got " + token))
    }

    return {
      type: 'Expression',
      expression: expression
    }
  }

  if (token === TYPE_NUMBER_LITERAL) {
    token = this.lexer.next();
    return {
      type: 'NumberLiteral',
      value: this.lexer.getLiteral()
    }
  }

  throw new SyntaxError('expected a number, a variable, or parentheses')
};

Parser.prototype.parseUnary = function parseUnary () {
  var token = this.lexer.peek();

  if (token === '-' || token === '+') {
    token = this.lexer.next();
    return {
      type: 'UnaryExpression',
      operator: token,
      expression: this.parseUnary()
    }
  }

  return this.parsePrimary()
};

// I'm not sure what these pow and nth square root operators are classified as
Parser.prototype.parsePowAndSquare = function parsePowAndSquare () {
  var expression = this.parseUnary();
  var token = this.lexer.peek();

  while (token === '**' || token == '√') {
    token = this.lexer.next();
    expression = {
      type: 'BinaryExpression',
      operator: token,
      left: expression,
      right: this.parseUnary()
    };
    token = this.lexer.peek();
  }

  return expression
};

Parser.prototype.parseMultiplicative = function parseMultiplicative () {
  var expression = this.parsePowAndSquare();
  var token = this.lexer.peek();

  while (token === '*' || token == '/' || token === '%') {
    token = this.lexer.next();
    expression = {
      type: 'BinaryExpression',
      operator: token,
      left: expression,
      right: this.parsePowAndSquare()
    };
    token = this.lexer.peek();
  }

  return expression
};

Parser.prototype.parseAdditive = function parseAdditive () {
  var expression = this.parseMultiplicative();
  var token = this.lexer.peek();

  while (token === '+' || token === '-') {
    token = this.lexer.next();
    expression = {
      type: 'BinaryExpression',
      operator: token,
      left: expression,
      right: this.parseMultiplicative()
    };
    token = this.lexer.peek();
  }

  return expression
};

Parser.prototype.parseExpression = function parseExpression () {
  return this.parseAdditive()
};

Parser.prototype.parse = function parse () {
  var ref = this;
    var lexer = ref.lexer;
  var expression = this.parseExpression();

  return {
    type: 'ExpressionStatement',
    expression: expression
  }
};

var operations = {
  '+': function (a, b) { return a + b; },
  '-': function (a, b) { return a - b; },
  '*': function (a, b) { return a * b; },
  '/': function (a, b) { return a / b; },
  '%': function (a, b) { return a % b; },
  '**': function (a, b) { return Math.pow(a, b); },
  // NOTE: Apparently this is a naive implementation of nth root
  // http://stackoverflow.com/questions/7308627/javascript-calculate-the-nth-root-of-a-number
  '√': function (a, b) { return Math.pow(a, 1 / b); }
};

/**
 * Evaluates the AST produced from the parser and returns its result
 * @return {Number}
 */
var evaluateAST = function (node) {
  var a;

  switch (node.type) {
    case 'ExpressionStatement':
      return evaluateAST(node.expression)
    case 'Expression':
      return evaluateAST(node.expression)
    case 'NumberLiteral':
      return parseFloat(node.value)
    case 'UnaryExpression':
      a = evaluateAST(node.expression);

      switch (node.operator) {
        case '+':
          return +a
        case '-':
          return -a
        default:
          throw new Error(
            ("Parsing error: Unrecognized unary operator \"" + (node.operator) + "\"")
          )
      }
    case 'BinaryExpression':
      var left = node.left;
  var right = node.right;
  var operator = node.operator;
      var operation = operations[operator];

      if (operation === undefined) {
        throw new Error('Unsupported operand')
      }

      return operation(evaluateAST(left), evaluateAST(right))
    default:
      throw new Error(("Parsing error: Unrecognized node type \"" + (node.type) + "\""))
  }
};

/**
 * Evaluates the expression passed and returns its result.
 * Note: Empty strings will cause the parser to throw an error.
 * Note: This throw errors when passed a lexer that is parsing an empty string
 * @return {Number}
 */
function evalmath (expression) {
  return evaluateAST(
    new Parser({
      lexer: new Lexer({ data: expression })
    }).parse()
  )
}

//

var keyboardNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
var keyboardOperators = ['*', '+', '-', '/', '(', ')'];

var ACTION_CLEAR = 'clear';
var ACTION_CLEAR_ENTRY = 'clearEntry';
var ACTION_NEGATE = 'negate';
var ACTION_UPDATE_OPERATOR = 'updateOperator';
var ACTION_APPEND_OPERAND = 'appendOperand';
var ACTION_ADD_PAREN = 'addParen';
var ACTION_BACKSPACE = 'backspace';
var ACTION_SHOW_TOTAL = 'showTotal';

var buttons = [
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
    text: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 192 192\"><path fill=\"inherit\" d=\"M180.2 0L95.8 84.3 11.8.4 0 12.2 84 96 0 179.9l11.8 11.7 84-83.8 84.4 84.2 11.8-11.7L107.6 96 192 11.8z\"/></svg>",
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
    text: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 17\"><path d=\"M256 17H0V0h256v17z\"/></svg>",
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
    text: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\"><path d=\"M256 137H136v119h-17V137H0v-17h119V0h17v120h120v17z\"/></svg>",
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: '+',
    },
  } ];

// Mode show total causes the total to be displayed in the current operand display
var MODE_SHOW_TOTAL = 1 << 1;
// Mode insert operand causes the current operand to be overwritten. After the first character has been written, the mode should go to mode append operand
var MODE_INSERT_OPERAND = 1 << 2;
// Mode append operand causes any operand parts to be appended to the current operand
var MODE_APPEND_OPERAND = 1 << 3;

// The maximum number of digits the current operand may be
var MAX_NUMBER_LENGTH = Number.MAX_SAFE_INTEGER.toString().length;

function isNumberPart(str) {
  return /^[0-9.]/.test(str)
}

var defaultCommands = [
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
  } ].concat( keyboardNumbers.map(function (n) { return ({
    match: {
      key: n,
    },
    action: ACTION_APPEND_OPERAND,
    args: {
      value: n,
    },
  }); }),
  keyboardOperators.map(function (n) { return ({
    match: {
      key: n,
    },
    action: ACTION_UPDATE_OPERATOR,
    args: {
      operator: n,
    },
  }); }) );

var script = {
  props: {
    commands: {
      type: Array,
      default: function () { return Object.freeze(defaultCommands); },
    },
    defaultFormula: {
      type: Array,
      default: function () { return []; },

    },
    defaultOperand: {
      type: String,
      default: function () { return ''; },
    },
    defaultOperator: {
      type: String,
      default: function () { return ''; },
    },
    defaultMode: {
      type: Number,
      default: function () { return MODE_SHOW_TOTAL|MODE_INSERT_OPERAND; }
    },
  },
  data: function data() {
    return {
      MODE_SHOW_TOTAL: MODE_SHOW_TOTAL,
      MODE_INSERT_OPERAND: MODE_INSERT_OPERAND,
      MODE_APPEND_OPERAND: MODE_APPEND_OPERAND,
      activeButtons: [],
      expressions: this.defaultFormula.slice(0),
      buttons: Object.freeze(Object.assign({}, buttons)),
      currentOperand: String(this.defaultOperand),
      currentOperator: this.defaultFormula,
      mode: this.defaultMode,
      openParenStack: 0,
      error: null,
      total: 0,
    }
  },
  computed: {
    formuoli: function formuoli() {
      return this.expressions
        .map(function (str, index, array) {
          var s = str.trim();

          if (array[index - 1] === '(') {
            return s
          } else if (s === ')') {
            return s
          } else if (s[0] === '-' && isNumberPart(s[1])) {
            return ' ' + str
          } else {
            return ' ' + s
          }
        })
        .join('')
    },
    font: function font() {
      // TODO: Change this to be some equation
      var length;

      if (this.mode & MODE_SHOW_TOTAL) {
        length = this.total.toString().length;
      } else {
        length = this.currentOperand.toString().length;
      }

      var size;
      var weight;

      if (length < 8) {
        size = '60px';
        weight = '200';
      } else if (length <= MAX_NUMBER_LENGTH) {
        size = '28px';
        weight = '300';
      } else if (length >= MAX_NUMBER_LENGTH) {
        size = '24px';
        weight = '300';
      }

      return { size: size, weight: weight }
    },
  },
  mounted: function mounted() {
    window.addEventListener('keydown', this.onKeyDown);
  },
  methods: {
    onKeyDown: function onKeyDown(e) {
      var this$1 = this;

      if (e.defaultPrevented) {
        return
      }
      console.log(e.key);

      this.commands.forEach(function (command) {
        Object.keys(command.match).map(function (key) {
          var value = command.match[key];
          console.log(e[key], value);

          if (e[key] === value) {
            this$1.exec(command.action, command.args);
            this$1.$emit('key', {
              key: e.key,
              args: Object.assign({}, command.args),
            });
          }
        });
      });
    },
    onExplicitEquals: function onExplicitEquals() {
      this.showTotal({ explicit: true });
    },
    exec: function exec(action, args) {
      // console.log(action, args)

      switch (action) {
        case ACTION_BACKSPACE: {
          this.backspace(args);
          this.$emit('backspace');
          break
        }
        case ACTION_CLEAR: {
          this.clear(args);
          this.$emit('clear');
          break
        }
        case ACTION_CLEAR_ENTRY: {
          this.clearEntry(args);
          this.$emit('clear-entry');
          break
        }
        case ACTION_NEGATE: {
          this.negate(args);
          this.$emit('negate');
          break
        }
        case ACTION_UPDATE_OPERATOR: {
          this.updateOperator(args.operator);
          this.$emit('operator-update', args.operator);
          break
        }
        case ACTION_APPEND_OPERAND: {
          this.appendOperand(args.value);
          this.$emit('operand-append', args);
          break
        }
        case ACTION_ADD_PAREN: {
          this.addParen(args.operator);
          this.$emit('paren-add', args);
          break
        }
        case ACTION_SHOW_TOTAL: {
          var total = this.showTotal({ explicit: true });
          this.$emit('update:total-explicit', { total: total });
          break;
        }
        default: {
          if (process.env.NODE_ENV === 'development') {
            console.error(("action not found: \"" + action + "\""));
          }
        }
      }

      this.showTotal();
    },
    clear: function clear() {
      this.expressions = [];
      this.currentOperand = '0';
      this.currentOperator = '';
      this.openParenStack = 0;
      this.mode = MODE_SHOW_TOTAL | MODE_INSERT_OPERAND;
      this.error = null;
      this.total = 0;
    },

    backspace: function backspace() {
      var operand = this.currentOperand.slice(0, -1);

      if (operand.length === 0) {
        operand = '0';
      }

      this.currentOperand = operand;
    },

    clearEntry: function clearEntry() {
      this.currentOperand = '0';
    },

    negate: function negate() {
      // Only add negative sign if not zero
      if (this.currentOperand !== 0) {
        this.currentOperand = (-this.currentOperand).toString();
      }
    },

    updateOperator: function updateOperator(operator) {
      var length = this.expressions.length;
      var last = this.expressions[length - 1] || '';
      var ref = this;
      var mode = ref.mode;
      var currentOperand = ref.currentOperand;

      if (mode & MODE_INSERT_OPERAND) {
        // console.log('MODE_INSERT_OPERAND')

        if (length === 0) {
          // TODO: Add regression test for adding an operand after reset state
          this.expressions.push(currentOperand || '0', operator);
        } else if (isOperator(last)) {
          this.expressions.pop();
          this.expressions.push(operator);
        } else if (last === ')') {
          this.expressions.push(operator);
        } else if (last === '(') {
          this.expressions.push(currentOperand, operator);
        }
      } else if (mode & MODE_APPEND_OPERAND) {
        // console.log('MODE_APPEND_OPERAND')

        if (length === 0) {
          this.expressions.push(currentOperand, operator);
        } else if (isOperator(last)) {
          this.expressions.push(currentOperand, operator);
        } else if (last === ')') {
          this.expressions.push(operator);
        } else if (last === '(') {
          this.expressions.push(currentOperand, operator);
        }
      }

      this.currentOperator = operator;
      this.mode = MODE_INSERT_OPERAND | MODE_SHOW_TOTAL;

      // console.log('UPDATE_OPERATOR:', this.expressions)
    },

    addParen: function addParen(paren) {
      var last = this.expressions[this.expressions.length - 1] || '';
      var ref = this;
      var currentOperand = ref.currentOperand;
      var openParenStack = ref.openParenStack;

      // console.log('ADD_PAREN:', {last, paren});

      if (paren === ')' && openParenStack === 0) {
        // No need to add closing paren if there is no open paren
        return
      } else if (paren === '(' && last === ')') {
        // FIXME: Look at real calculator for semantics
        return
      }

      if (last === '(' && paren === ')') {
        // Handle immediate closed parens
        this.expressions.push(currentOperand, paren);
      } else if (isOperator(last) && paren === ')') {
        // Automatically append current operand when expressions
        // is "(5 *" so result is "(5 * 5)"
        this.expressions.push(currentOperand, paren);
      } else if ((isOperator(last) || length === 0) && paren === '(') {
        // Handle "5 *" where the result is "5 * (" and "(" is the beginning
        // of a new group expression
        this.expressions.push(paren);
      }

      if (paren === '(') {
        this.openParenStack++;
      } else if (paren === ')') {
        this.openParenStack--;
      }
    },

    appendOperand: function appendOperand(value) {
      var currentOperand = this.currentOperand;
      var newOperand = currentOperand;

      // Don't append 0 to 0
      if (value === '0' && currentOperand[0] === '0') {
        return
      } else if (value === '.' && currentOperand.includes('.')) {
        // Avoid appending multiple decimals
        return
      }

      // Switch modes from showing the total to the current operand
      if (this.mode & MODE_SHOW_TOTAL) ;

      if (this.mode & MODE_INSERT_OPERAND) {
        // console.log('INSERT');
        newOperand = value.toString();
        this.mode = MODE_APPEND_OPERAND;
      } else {
        // console.log('APPEND');
        newOperand += value.toString();
      }

      // TODO: Update font size, actually should do that in the vm
      this.currentOperand = newOperand.substring(0, MAX_NUMBER_LENGTH);
    },

    showTotal: function showTotal(ref) {
      if ( ref === void 0 ) ref = {};
      var explicit = ref.explicit;

      var last = this.expressions[this.expressions.length - 1] || '';
      var expressions = this.expressions.slice(0);
      var currentOperand = this.currentOperand;
      var mode = this.mode;
      var currentTotal = this.total;
      var openParenStack = this.openParenStack;
      var isFirstNumber = typeof Number(expressions[0]) === 'number';
      var isSecondOperator = isOperator(expressions[1] || '');
      var length = expressions.length;
      var total;

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
        expressions.push(currentOperand);
      } else if (explicit && isOperator(last)) {
        // Handle case where expressions is ['5', '*', '4', '+'] and
        // the total is being explicitly being requested

        // console.log('explicit && isOperator(last)', isOperator(last), last);
        if (mode & MODE_INSERT_OPERAND) {
          expressions.push(currentTotal);
        } else if (mode & MODE_APPEND_OPERAND) {
          expressions.push(currentOperand);
        }
      } else if (isOperator(last)) {
        // Handle case where expressions is ['5', '*', '4', '+']
        expressions.pop();
      }

      if (explicit) {
        // Automatically close parens when explicitly requesting
        // the total
        var times$1 = openParenStack;

        while (times$1-- > 0) {
          expressions.push(')');
        }
      } else if (!explicit && openParenStack === 1) {
        // Auto close if there is only one missing paren
        expressions.push(')');
      }

      try {
        total = evalmath(expressions.join(' '));

        if (explicit) {
          this.clear();
        }

        this.total = total;
      } catch (err) {
        if (explicit) {
          this.clear();
          this.error = err;
          // console.log(err)
          this.$emit('formula-error', err);
        }
      }

      // console.log(
      //   'SHOW_TOTAL; Expressions: "%s"; Total: %s; Explicit: %s',
      //   expressions.join(' '),
      //   total,
      //   !!explicit
      // )

      if (explicit) {
        this.$emit('update:total.explicit');
      } else {
        this.$emit('update:total');
      }

      return total
    },
  },
};

/* script */
var __vue_script__ = script;

/* template */
var __vue_render__ = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", [
    _vm._m(0),
    _vm._v(" "),
    _c("div", { staticClass: "Calculator" }, [
      _c("header", { staticClass: "Calculator-header" }, [
        _c(
          "div",
          { staticClass: "Calculator-formula", attrs: { "data-formula": "" } },
          [
            _c("span", { staticClass: "Calculator-formulaOverflow" }),
            _vm._v(" "),
            _c("span", { staticClass: "Calculator-formulaList" }, [
              _vm._v(_vm._s(_vm.formuoli))
            ])
          ]
        ),
        _vm._v(" "),
        _c("div", { staticClass: "Calculator-operands" }, [
          _c(
            "span",
            {
              staticClass: "Calculator-currentOperand",
              class: { "has-error": _vm.error },
              style: {
                "font-size": _vm.font.size,
                "font-weight": _vm.font.weight
              },
              attrs: { "data-total": "" }
            },
            [
              _vm.error
                ? _c("span", [_vm._v("Error")])
                : _vm.mode & _vm.MODE_SHOW_TOTAL
                ? _c("span", [_vm._v(_vm._s(_vm.total))])
                : _c("span", [_vm._v(_vm._s(_vm.currentOperand))])
            ]
          )
        ])
      ]),
      _vm._v(" "),
      _c("div", { staticClass: "Calculator-body" }, [
        _c(
          "div",
          { staticClass: "Calculator-buttonsContainer" },
          _vm._l(_vm.buttons, function(button) {
            return _c(
              "button",
              {
                key: button.id,
                staticClass: "Calculator-button",
                class: button.className,
                attrs: { "data-key": button.id },
                on: {
                  click: function($event) {
                    return _vm.exec(button.action, button.args)
                  }
                }
              },
              [_c("span", { domProps: { innerHTML: _vm._s(button.text) } })]
            )
          }),
          0
        )
      ]),
      _vm._v(" "),
      _c(
        "button",
        {
          staticClass: "Calculator-equals",
          attrs: { title: "equals" },
          on: { click: _vm.onExplicitEquals }
        },
        [
          _c("div", { staticClass: "Calculator-equalsLine" }),
          _vm._v(" "),
          _c("div", { staticClass: "Calculator-equalsLine" })
        ]
      )
    ])
  ])
};
var __vue_staticRenderFns__ = [
  function() {
    var _vm = this;
    var _h = _vm.$createElement;
    var _c = _vm._self._c || _h;
    return _c("noscript", [
      _c("link", {
        attrs: {
          href:
            "https://fonts.googleapis.com/css?family=Source+Sans+Pro:200,300,400&display=swap",
          rel: "stylesheet"
        }
      })
    ])
  }
];
__vue_render__._withStripped = true;

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-6e48fc7a_0", { source: "html{--foreground--dark:#151515;--background-gradient-1:#b6b2ab;--background-gradient-2:#b3afa7;--background-gradient-3:#b8b5af;--background-gradient-4:#78736b;--background-gradient-5:#6f6862;--background-gradient-6:#58504b;--background-gradient-7:#5f574e;--background-gradient-8:#625a51;--gradient-blue-1:rgba(90,96,114,0.76);--gradient-blue-2:rgba(29,32,37,0.8);--gradient-orange-1:#ff8d4b;--gradient-orange-2:#ff542e;--calculator-width:260px;--header-padding-left:20px;--something-height:22px}.Calculator,.Calculator *,.Calculator :after,.Calculator :before{box-sizing:inherit}.Calculator{box-shadow:12px 18px 45px 0 rgba(0,0,0,.25);cursor:default;font-family:Source Sans Pro;line-height:1.5;margin:0 auto;position:relative;user-select:none;width:var(--calculator-width);z-index:1}.Calculator-header{background:#fff;overflow:hidden;padding:20px var(--header-padding-left);position:relative;text-align:right}.Calculator-formula{color:hsla(0,0%,62%,.76);font-size:15px;line-height:var(--something-height);min-height:var(--something-height);position:relative;white-space:nowrap;width:100%;word-wrap:normal}.Calculator-formula,.Calculator-formulaList{display:block;float:right}.Calculator__expressionsOverflow{color:#333;box-shadow:5px 0 20px 4px rgba(0,0,0,.3);font-weight:700;opacity:0;padding-right:0;text-align:center;transition:opacity .5s;transform:translateY(-50%)}.Calculator__expressionsOverflow:before{content:\"\"}.Calculator__expressionsOverflow.is-showing{opacity:1}.Calculator-operands{color:var(--foreground--dark);font-size:60px;font-weight:200;line-height:1.1;clear:both}.Calculator-currentOperand{display:block;float:right;line-height:60px;overflow:visible;min-height:60px;transition-duration:.2s;transition-property:font-size}.Calculator-currentOperand.has-error{color:#ef5334}.Calculator-body{background:#fff}.Calculator-buttonsContainer{display:flex;flex-wrap:wrap;overflow:visible;position:relative}.Calculator-buttonsContainer:before{background-color:rgba(90,95,114,.76);background-image:linear-gradient(180deg,rgba(90,95,114,.76),rgba(29,32,37,.8));box-shadow:17px 27px 72px 1px rgba(0,0,0,.3);content:\"\";filter:drop-shadow(0 0 7px rgba(0,0,0,.2));left:-18px;position:absolute;right:-18px;top:0;bottom:0}.Calculator-button{background-color:transparent;border:0;color:hsla(0,0%,100%,.8);cursor:pointer;display:flex;font-family:Source Sans Pro;font-size:22px;font-weight:300;justify-content:center;line-height:70px;outline:0;padding:0;position:relative;text-align:center;text-shadow:1px 1px 2px rgba(0,0,0,.15);transition:box-shadow .2s,background-color .15s;z-index:1;width:25%}.Calculator-button:hover{background-color:rgba(0,0,0,.08)}.Calculator-button.is-active,.Calculator-button:active{box-shadow:inset 0 3px 15px 0 rgba(0,0,0,.3)}.Calculator-button>span{display:block}.Calculator-button svg{left:50%;position:absolute;top:50%;transform:translate(-50%,-50%)}.Calculator-button path,.Calculator-button svg{fill:#fff}.Calculator-button.is-modulo,.Calculator-button.is-negation{font-size:18px}.Calculator-button.is-square{font-size:16px}.Calculator-button.is-division{font-size:20px}.Calculator-button.is-multiplication svg{width:11px}.Calculator-button.is-addition svg{width:13px}.Calculator-button.is-subtraction svg{width:14px}.Calculator-button.is-paren{display:flex;font-size:18px;width:12.5%}.Calculator-button--paren:active,.Calculator-button--paren:hover{background:initial!important;box-shadow:none!important;cursor:default!important}.Calculator-button--paren>span{flex:50%}.Calculator-equals{background-color:transparent;border:0;background-image:linear-gradient(90deg,#ff8d4b,#ff542e);cursor:pointer;display:block;padding:26px 0;outline:none;position:relative;width:100%;z-index:-1}.Calculator-equalsLine{background:#fff;box-shadow:0 0 2px rgba(0,0,0,.4);display:block;margin:0 auto 6px;width:20px;height:1px}.Calculator-equalsLine:last-child{margin-bottom:0}", map: {"version":3,"sources":["/mnt/c/Users/tony/Github/calculator/src/calculator.vue"],"names":[],"mappings":"AAguBA,KACA,0BAAA,CAEA,+BAAA,CACA,+BAAA,CAEA,+BAAA,CACA,+BAAA,CAEA,+BAAA,CACA,+BAAA,CAEA,+BAAA,CACA,+BAAA,CAGA,sCAAA,CACA,oCAAA,CAEA,2BAAA,CACA,2BAAA,CAEA,wBAAA,CACA,0BAAA,CACA,uBACA,CAEA,iEAIA,kBACA,CAoBA,YACA,2CAAA,CACA,cAAA,CACA,2BAAA,CACA,eAAA,CACA,aAAA,CACA,iBAAA,CACA,gBAAA,CACA,6BAAA,CACA,SACA,CAEA,mBACA,eAAA,CACA,eAAA,CACA,uCAAA,CACA,iBAAA,CACA,gBACA,CAEA,oBACA,wBAAA,CAGA,cAAA,CACA,mCAAA,CACA,kCAAA,CACA,iBAAA,CACA,kBAAA,CACA,UAAA,CACA,gBACA,CAEA,4CAXA,aAAA,CACA,WAaA,CAGA,iCAEA,UAAA,CACA,wCAAA,CACA,eAAA,CACA,SAAA,CACA,eAAA,CACA,iBAAA,CACA,sBAAA,CACA,0BAGA,CAEA,wCACA,UACA,CAEA,4CACA,SACA,CAEA,qBACA,6BAAA,CACA,cAAA,CACA,eAAA,CACA,eAAA,CACA,UACA,CAEA,2BACA,aAAA,CACA,WAAA,CACA,gBAAA,CACA,gBAAA,CACA,eAAA,CACA,uBAAA,CACA,6BACA,CAEA,qCACA,aACA,CAEA,iBACA,eACA,CAEA,6BACA,YAAA,CACA,cAAA,CACA,gBAAA,CACA,iBACA,CAEA,oCACA,oCAAA,CACA,8EAIA,CACA,4CAAA,CACA,UAAA,CACA,0CAAA,CACA,UAAA,CACA,iBAAA,CACA,WAAA,CACA,KAAA,CACA,QACA,CAEA,mBACA,4BAAA,CACA,QAAA,CACA,wBAAA,CACA,cAAA,CACA,YAAA,CACA,2BAAA,CACA,cAAA,CACA,eAAA,CACA,sBAAA,CACA,gBAAA,CACA,SAAA,CACA,SAAA,CACA,iBAAA,CACA,iBAAA,CACA,uCAAA,CACA,+CAAA,CACA,SAAA,CACA,SACA,CAEA,yBACA,gCACA,CAEA,uDAEA,4CACA,CAEA,wBACA,aACA,CAEA,uBACA,QAAA,CACA,iBAAA,CACA,OAAA,CACA,8BACA,CAEA,+CAEA,SACA,CAEA,4DAEA,cACA,CAEA,6BACA,cACA,CAEA,+BACA,cACA,CAEA,yCACA,UACA,CAEA,mCACA,UACA,CAEA,sCACA,UACA,CAEA,4BACA,YAAA,CACA,cAAA,CACA,WACA,CAEA,iEAEA,4BAAA,CACA,yBAAA,CACA,wBACA,CAEA,+BACA,QACA,CAEA,mBACA,4BAAA,CACA,QAAA,CACA,uDAAA,CACA,cAAA,CACA,aAAA,CACA,cAAA,CACA,YAAA,CACA,iBAAA,CACA,UAAA,CACA,UACA,CAEA,uBACA,eAAA,CACA,iCAAA,CACA,aAAA,CACA,iBAAA,CACA,UAAA,CACA,UACA,CAEA,kCACA,eACA","file":"calculator.vue","sourcesContent":["<template>\r\n  <div>\r\n    <noscript>\r\n      <link\r\n        href=\"https://fonts.googleapis.com/css?family=Source+Sans+Pro:200,300,400&display=swap\"\r\n        rel=\"stylesheet\"\r\n      />\r\n    </noscript>\r\n    <div class=\"Calculator\">\r\n      <header class=\"Calculator-header\">\r\n        <div class=\"Calculator-formula\" data-formula>\r\n          <span class=\"Calculator-formulaOverflow\" />\r\n          <span class=\"Calculator-formulaList\">{{ formuoli }}</span>\r\n        </div>\r\n        <div class=\"Calculator-operands\">\r\n          <span\r\n            class=\"Calculator-currentOperand\"\r\n            data-total\r\n            :class=\"{ 'has-error': error }\"\r\n            :style=\"{\r\n              'font-size': font.size,\r\n              'font-weight': font.weight,\r\n            }\"\r\n          >\r\n            <span v-if=\"error\">Error</span>\r\n            <span v-else-if=\"mode & MODE_SHOW_TOTAL\">{{ total }}</span>\r\n            <span v-else>{{ currentOperand }}</span>\r\n          </span>\r\n        </div>\r\n      </header>\r\n      <div class=\"Calculator-body\">\r\n        <div class=\"Calculator-buttonsContainer\">\r\n          <button\r\n            v-for=\"button in buttons\"\r\n            :key=\"button.id\"\r\n            :data-key=\"button.id\"\r\n            :class=\"button.className\"\r\n            class=\"Calculator-button\"\r\n            @click=\"exec(button.action, button.args)\"\r\n          >\r\n            <span v-html=\"button.text\" />\r\n          </button>\r\n        </div>\r\n      </div>\r\n      <button\r\n        title=\"equals\"\r\n        class=\"Calculator-equals\"\r\n        @click=\"onExplicitEquals\"\r\n      >\r\n        <div class=\"Calculator-equalsLine\" />\r\n        <div class=\"Calculator-equalsLine\" />\r\n      </button>\r\n    </div>\r\n  </div>\r\n</template>\r\n\r\n<script>\r\nimport evalmath, { isOperator } from './math'\r\n\r\nconst keyboardNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']\r\nconst keyboardOperators = ['*', '+', '-', '/', '(', ')']\r\n\r\nconst ACTION_CLEAR = 'clear'\r\nconst ACTION_CLEAR_ENTRY = 'clearEntry'\r\nconst ACTION_NEGATE = 'negate'\r\nconst ACTION_UPDATE_OPERATOR = 'updateOperator'\r\nconst ACTION_APPEND_OPERAND = 'appendOperand'\r\nconst ACTION_ADD_PAREN = 'addParen'\r\nconst ACTION_BACKSPACE = 'backspace'\r\nconst ACTION_SHOW_TOTAL = 'showTotal'\r\n\r\nconst buttons = [\r\n  {\r\n    id: 'C',\r\n    text: 'C',\r\n    className: 'is-clear',\r\n    action: ACTION_CLEAR,\r\n  },\r\n\r\n  {\r\n    id: 'CE',\r\n    text: 'CE',\r\n    className: 'is-clearEntry',\r\n    action: ACTION_CLEAR_ENTRY,\r\n  },\r\n  {\r\n    id: 'negate',\r\n    text: '+/-',\r\n    className: 'is-negation',\r\n    action: ACTION_NEGATE,\r\n  },\r\n  {\r\n    id: 'modulo',\r\n    text: '%',\r\n    className: 'is-modulo',\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '%',\r\n    },\r\n  },\r\n  // {\r\n  //   id: 4,\r\n  //   text: '√',\r\n  //   className: 'is-square',\r\n  //   action: ACTION_UPDATE_OPERATOR,\r\n  //   args: {\r\n  //     operator: '√',\r\n  //   },\r\n  // },\r\n\r\n  {\r\n    id: '7',\r\n    text: '7',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '7',\r\n    },\r\n  },\r\n  {\r\n    id: '8',\r\n    text: '8',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '8',\r\n    },\r\n  },\r\n  {\r\n    id: '9',\r\n    text: '9',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '9',\r\n    },\r\n  },\r\n  {\r\n    id: '/',\r\n    text: '/',\r\n    className: 'is-division',\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '/',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '4',\r\n    text: '4',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '4',\r\n    },\r\n  },\r\n  {\r\n    id: '5',\r\n    text: '5',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '5',\r\n    },\r\n  },\r\n  {\r\n    id: '6',\r\n    text: '6',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '6',\r\n    },\r\n  },\r\n  {\r\n    id: '*',\r\n    className: 'is-multiplication',\r\n    text: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 192 192\"><path fill=\"inherit\" d=\"M180.2 0L95.8 84.3 11.8.4 0 12.2 84 96 0 179.9l11.8 11.7 84-83.8 84.4 84.2 11.8-11.7L107.6 96 192 11.8z\"/></svg>`,\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '*',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '1',\r\n    text: '1',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '1',\r\n    },\r\n  },\r\n  {\r\n    id: '2',\r\n    text: '2',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '2',\r\n    },\r\n  },\r\n  {\r\n    id: '3',\r\n    text: '3',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '3',\r\n    },\r\n  },\r\n  {\r\n    id: '-',\r\n    className: 'is-subtraction',\r\n    text: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 17\"><path d=\"M256 17H0V0h256v17z\"/></svg>`,\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '-',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '0',\r\n    text: '0',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '0',\r\n    },\r\n  },\r\n  {\r\n    id: '(',\r\n    text: '(',\r\n    className: ['is-paren', 'is-open-paren'],\r\n    action: ACTION_ADD_PAREN,\r\n    args: {\r\n      operator: '(',\r\n    },\r\n  },\r\n  {\r\n    id: ')',\r\n    text: ')',\r\n    className: ['is-paren', 'is-close-paren'],\r\n    action: ACTION_ADD_PAREN,\r\n    args: {\r\n      operator: ')',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '.',\r\n    text: '.',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '.',\r\n    },\r\n  },\r\n  {\r\n    id: '+',\r\n    text: '',\r\n    className: 'is-addition',\r\n    text: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\"><path d=\"M256 137H136v119h-17V137H0v-17h119V0h17v120h120v17z\"/></svg>`,\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '+',\r\n    },\r\n  },\r\n]\r\n\r\n// Mode show total causes the total to be displayed in the current operand display\r\nconst MODE_SHOW_TOTAL = 1 << 1\r\n// Mode insert operand causes the current operand to be overwritten. After the first character has been written, the mode should go to mode append operand\r\nconst MODE_INSERT_OPERAND = 1 << 2\r\n// Mode append operand causes any operand parts to be appended to the current operand\r\nconst MODE_APPEND_OPERAND = 1 << 3\r\n\r\n// The maximum number of digits the current operand may be\r\nconst MAX_NUMBER_LENGTH = Number.MAX_SAFE_INTEGER.toString().length\r\n\r\nfunction isNumberPart(str) {\r\n  return /^[0-9.]/.test(str)\r\n}\r\n\r\n// Debug function for flags\r\nfunction getFlags(flags) {\r\n  let arr = []\r\n\r\n  if (flags & MODE_SHOW_TOTAL) {\r\n    arr.push('MODE_SHOW_TOTAL')\r\n  }\r\n  if (flags & MODE_INSERT_OPERAND) {\r\n    arr.push('MODE_INSERT_OPERAND')\r\n  }\r\n\r\n  if (flags & MODE_APPEND_OPERAND) {\r\n    arr.push('MODE_APPEND_OPERAND')\r\n  }\r\n\r\n  return arr.join('|')\r\n}\r\n\r\nconst defaultCommands = [\r\n  {\r\n    match: {\r\n      key: 'Enter',\r\n    },\r\n    action: ACTION_SHOW_TOTAL,\r\n  },\r\n  {\r\n    match: {\r\n      key: 'Backspace',\r\n    },\r\n    action: ACTION_BACKSPACE,\r\n  },\r\n  {\r\n    match: {\r\n      key: 'Escape',\r\n    },\r\n    action: ACTION_CLEAR,\r\n  },\r\n  {\r\n    match: {\r\n      key: 'Delete',\r\n    },\r\n    action: ACTION_CLEAR_ENTRY,\r\n  },\r\n  ...keyboardNumbers.map(n => ({\r\n    match: {\r\n      key: n,\r\n    },\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: n,\r\n    },\r\n  })),\r\n  ...keyboardOperators.map(n => ({\r\n    match: {\r\n      key: n,\r\n    },\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: n,\r\n    },\r\n  })),\r\n]\r\n\r\nexport default {\r\n  props: {\r\n    commands: {\r\n      type: Array,\r\n      default: () => Object.freeze(defaultCommands),\r\n    },\r\n    defaultFormula: {\r\n      type: Array,\r\n      default: () => [],\r\n\r\n    },\r\n    defaultOperand: {\r\n      type: String,\r\n      default: () => '',\r\n    },\r\n    defaultOperator: {\r\n      type: String,\r\n      default: () => '',\r\n    },\r\n    defaultMode: {\r\n      type: Number,\r\n      default: () => MODE_SHOW_TOTAL|MODE_INSERT_OPERAND\r\n    },\r\n  },\r\n  data() {\r\n    return {\r\n      MODE_SHOW_TOTAL,\r\n      MODE_INSERT_OPERAND,\r\n      MODE_APPEND_OPERAND,\r\n      activeButtons: [],\r\n      expressions: this.defaultFormula.slice(0),\r\n      buttons: Object.freeze({ ...buttons }),\r\n      currentOperand: String(this.defaultOperand),\r\n      currentOperator: this.defaultFormula,\r\n      mode: this.defaultMode,\r\n      openParenStack: 0,\r\n      error: null,\r\n      total: 0,\r\n    }\r\n  },\r\n  computed: {\r\n    formuoli() {\r\n      return this.expressions\r\n        .map((str, index, array) => {\r\n          const s = str.trim()\r\n\r\n          if (array[index - 1] === '(') {\r\n            return s\r\n          } else if (s === ')') {\r\n            return s\r\n          } else if (s[0] === '-' && isNumberPart(s[1])) {\r\n            return ' ' + str\r\n          } else {\r\n            return ' ' + s\r\n          }\r\n\r\n          return str\r\n        })\r\n        .join('')\r\n    },\r\n    font() {\r\n      // TODO: Change this to be some equation\r\n      let length\r\n\r\n      if (this.mode & MODE_SHOW_TOTAL) {\r\n        length = this.total.toString().length\r\n      } else {\r\n        length = this.currentOperand.toString().length\r\n      }\r\n\r\n      let size\r\n      let weight\r\n\r\n      if (length < 8) {\r\n        size = '60px'\r\n        weight = '200'\r\n      } else if (length <= MAX_NUMBER_LENGTH) {\r\n        size = '28px'\r\n        weight = '300'\r\n      } else if (length >= MAX_NUMBER_LENGTH) {\r\n        size = '24px'\r\n        weight = '300'\r\n      }\r\n\r\n      return { size, weight }\r\n    },\r\n  },\r\n  mounted() {\r\n    window.addEventListener('keydown', this.onKeyDown)\r\n  },\r\n  methods: {\r\n    onKeyDown(e) {\r\n      if (e.defaultPrevented) {\r\n        return\r\n      }\r\n      console.log(e.key)\r\n\r\n      this.commands.forEach(command => {\r\n        Object.keys(command.match).map(key => {\r\n          const value = command.match[key]\r\n          console.log(e[key], value)\r\n\r\n          if (e[key] === value) {\r\n            this.exec(command.action, command.args)\r\n            this.$emit('key', {\r\n              key: e.key,\r\n              args: {\r\n                ...command.args,\r\n              },\r\n            })\r\n          }\r\n        })\r\n      })\r\n    },\r\n    onExplicitEquals() {\r\n      this.showTotal({ explicit: true })\r\n    },\r\n    exec(action, args) {\r\n      // console.log(action, args)\r\n\r\n      switch (action) {\r\n        case ACTION_BACKSPACE: {\r\n          this.backspace(args)\r\n          this.$emit('backspace')\r\n          break\r\n        }\r\n        case ACTION_CLEAR: {\r\n          this.clear(args)\r\n          this.$emit('clear')\r\n          break\r\n        }\r\n        case ACTION_CLEAR_ENTRY: {\r\n          this.clearEntry(args)\r\n          this.$emit('clear-entry')\r\n          break\r\n        }\r\n        case ACTION_NEGATE: {\r\n          this.negate(args)\r\n          this.$emit('negate')\r\n          break\r\n        }\r\n        case ACTION_UPDATE_OPERATOR: {\r\n          this.updateOperator(args.operator)\r\n          this.$emit('operator-update', args.operator)\r\n          break\r\n        }\r\n        case ACTION_APPEND_OPERAND: {\r\n          this.appendOperand(args.value)\r\n          this.$emit('operand-append', args)\r\n          break\r\n        }\r\n        case ACTION_ADD_PAREN: {\r\n          this.addParen(args.operator)\r\n          this.$emit('paren-add', args)\r\n          break\r\n        }\r\n        case ACTION_SHOW_TOTAL: {\r\n          const total = this.showTotal({ explicit: true })\r\n          this.$emit('update:total-explicit', { total })\r\n          break;\r\n        }\r\n        default: {\r\n          if (process.env.NODE_ENV === 'development') {\r\n            console.error(`action not found: \"${action}\"`)\r\n          }\r\n        }\r\n      }\r\n\r\n      this.showTotal()\r\n    },\r\n    clear() {\r\n      this.expressions = []\r\n      this.currentOperand = '0'\r\n      this.currentOperator = ''\r\n      this.openParenStack = 0\r\n      this.mode = MODE_SHOW_TOTAL | MODE_INSERT_OPERAND\r\n      this.error = null\r\n      this.total = 0\r\n    },\r\n\r\n    backspace() {\r\n      let operand = this.currentOperand.slice(0, -1)\r\n\r\n      if (operand.length === 0) {\r\n        operand = '0'\r\n      }\r\n\r\n      this.currentOperand = operand\r\n    },\r\n\r\n    clearEntry() {\r\n      this.currentOperand = '0'\r\n    },\r\n\r\n    negate() {\r\n      // Only add negative sign if not zero\r\n      if (this.currentOperand !== 0) {\r\n        this.currentOperand = (-this.currentOperand).toString()\r\n      }\r\n    },\r\n\r\n    updateOperator(operator) {\r\n      const length = this.expressions.length\r\n      const last = this.expressions[length - 1] || ''\r\n      const { mode, currentOperand } = this\r\n\r\n      if (mode & MODE_INSERT_OPERAND) {\r\n        // console.log('MODE_INSERT_OPERAND')\r\n\r\n        if (length === 0) {\r\n          // TODO: Add regression test for adding an operand after reset state\r\n          this.expressions.push(currentOperand || '0', operator)\r\n        } else if (isOperator(last)) {\r\n          this.expressions.pop()\r\n          this.expressions.push(operator)\r\n        } else if (last === ')') {\r\n          this.expressions.push(operator)\r\n        } else if (last === '(') {\r\n          this.expressions.push(currentOperand, operator)\r\n        }\r\n      } else if (mode & MODE_APPEND_OPERAND) {\r\n        // console.log('MODE_APPEND_OPERAND')\r\n\r\n        if (length === 0) {\r\n          this.expressions.push(currentOperand, operator)\r\n        } else if (isOperator(last)) {\r\n          this.expressions.push(currentOperand, operator)\r\n        } else if (last === ')') {\r\n          this.expressions.push(operator)\r\n        } else if (last === '(') {\r\n          this.expressions.push(currentOperand, operator)\r\n        }\r\n      }\r\n\r\n      this.currentOperator = operator\r\n      this.mode = MODE_INSERT_OPERAND | MODE_SHOW_TOTAL\r\n\r\n      // console.log('UPDATE_OPERATOR:', this.expressions)\r\n    },\r\n\r\n    addParen(paren) {\r\n      const last = this.expressions[this.expressions.length - 1] || ''\r\n      const { currentOperand, openParenStack } = this\r\n\r\n      // console.log('ADD_PAREN:', {last, paren});\r\n\r\n      if (paren === ')' && openParenStack === 0) {\r\n        // No need to add closing paren if there is no open paren\r\n        return\r\n      } else if (paren === '(' && last === ')') {\r\n        // FIXME: Look at real calculator for semantics\r\n        return\r\n      }\r\n\r\n      if (last === '(' && paren === ')') {\r\n        // Handle immediate closed parens\r\n        this.expressions.push(currentOperand, paren)\r\n      } else if (isOperator(last) && paren === ')') {\r\n        // Automatically append current operand when expressions\r\n        // is \"(5 *\" so result is \"(5 * 5)\"\r\n        this.expressions.push(currentOperand, paren)\r\n      } else if ((isOperator(last) || length === 0) && paren === '(') {\r\n        // Handle \"5 *\" where the result is \"5 * (\" and \"(\" is the beginning\r\n        // of a new group expression\r\n        this.expressions.push(paren)\r\n      }\r\n\r\n      if (paren === '(') {\r\n        this.openParenStack++\r\n      } else if (paren === ')') {\r\n        this.openParenStack--\r\n      }\r\n    },\r\n\r\n    appendOperand(value) {\r\n      const currentOperand = this.currentOperand\r\n      let newOperand = currentOperand\r\n      let newMode\r\n\r\n      // Don't append 0 to 0\r\n      if (value === '0' && currentOperand[0] === '0') {\r\n        return\r\n      } else if (value === '.' && currentOperand.includes('.')) {\r\n        // Avoid appending multiple decimals\r\n        return\r\n      }\r\n\r\n      // Switch modes from showing the total to the current operand\r\n      if (this.mode & MODE_SHOW_TOTAL) {\r\n        newMode = MODE_INSERT_OPERAND\r\n      }\r\n\r\n      if (this.mode & MODE_INSERT_OPERAND) {\r\n        // console.log('INSERT');\r\n        newOperand = value.toString()\r\n        this.mode = MODE_APPEND_OPERAND\r\n      } else {\r\n        // console.log('APPEND');\r\n        newOperand += value.toString()\r\n      }\r\n\r\n      // TODO: Update font size, actually should do that in the vm\r\n      this.currentOperand = newOperand.substring(0, MAX_NUMBER_LENGTH)\r\n    },\r\n\r\n    showTotal({ explicit } = {}) {\r\n      const last = this.expressions[this.expressions.length - 1] || ''\r\n      const expressions = this.expressions.slice(0)\r\n      const currentOperand = this.currentOperand\r\n      const mode = this.mode\r\n      const currentTotal = this.total\r\n      const openParenStack = this.openParenStack\r\n      const isFirstNumber = typeof Number(expressions[0]) === 'number'\r\n      const isSecondOperator = isOperator(expressions[1] || '')\r\n      const length = expressions.length\r\n      let times = openParenStack\r\n      let total\r\n\r\n      if (expressions.length === 0) {\r\n        return\r\n      } else if (\r\n        explicit &&\r\n        isFirstNumber &&\r\n        isSecondOperator &&\r\n        length === 2\r\n      ) {\r\n        // Handle case where expressions is 5 *\r\n\r\n        // console.log('explicit && isFirstNumber && isSecondOperator');\r\n        expressions.push(currentOperand)\r\n      } else if (explicit && isOperator(last)) {\r\n        // Handle case where expressions is ['5', '*', '4', '+'] and\r\n        // the total is being explicitly being requested\r\n\r\n        // console.log('explicit && isOperator(last)', isOperator(last), last);\r\n        if (mode & MODE_INSERT_OPERAND) {\r\n          expressions.push(currentTotal)\r\n        } else if (mode & MODE_APPEND_OPERAND) {\r\n          expressions.push(currentOperand)\r\n        }\r\n      } else if (isOperator(last)) {\r\n        // Handle case where expressions is ['5', '*', '4', '+']\r\n        expressions.pop()\r\n      }\r\n\r\n      if (explicit) {\r\n        // Automatically close parens when explicitly requesting\r\n        // the total\r\n        let times = openParenStack\r\n\r\n        while (times-- > 0) {\r\n          expressions.push(')')\r\n        }\r\n      } else if (!explicit && openParenStack === 1) {\r\n        // Auto close if there is only one missing paren\r\n        expressions.push(')')\r\n      }\r\n\r\n      try {\r\n        total = evalmath(expressions.join(' '))\r\n\r\n        if (explicit) {\r\n          this.clear()\r\n        }\r\n\r\n        this.total = total\r\n      } catch (err) {\r\n        if (explicit) {\r\n          this.clear()\r\n          this.error = err\r\n          // console.log(err)\r\n          this.$emit('formula-error', err)\r\n        }\r\n      }\r\n\r\n      // console.log(\r\n      //   'SHOW_TOTAL; Expressions: \"%s\"; Total: %s; Explicit: %s',\r\n      //   expressions.join(' '),\r\n      //   total,\r\n      //   !!explicit\r\n      // )\r\n\r\n      if (explicit) {\r\n        this.$emit('update:total.explicit')\r\n      } else {\r\n        this.$emit('update:total')\r\n      }\r\n\r\n      return total\r\n    },\r\n  },\r\n}\r\n</script>\r\n\r\n<style>\r\n/* // */\r\n/* // -> Design credit goes to Jaroslav Getman */\r\n/* // -> https://dribbble.com/shots/2334270-004-Calculator */\r\n/* // */\r\n\r\nhtml {\r\n  --foreground--dark: #151515;\r\n\r\n  --background-gradient-1: #b6b2ab;\r\n  --background-gradient-2: #b3afa7;\r\n\r\n  --background-gradient-3: #b8b5af;\r\n  --background-gradient-4: #78736b;\r\n\r\n  --background-gradient-5: #6f6862;\r\n  --background-gradient-6: #58504b;\r\n\r\n  --background-gradient-7: #5f574e;\r\n  --background-gradient-8: #625a51;\r\n\r\n  /* // I don't know how to get the colors closer here, would need the actual hsla */\r\n  --gradient-blue-1: hsla(226, 12%, 40%, 0.76);\r\n  --gradient-blue-2: hsla(222, 12%, 13%, 0.8);\r\n\r\n  --gradient-orange-1: #ff8d4b;\r\n  --gradient-orange-2: #ff542e;\r\n\r\n  --calculator-width: 260px;\r\n  --header-padding-left: 20px;\r\n  --something-height: 22px;\r\n}\r\n\r\n.Calculator,\r\n.Calculator *,\r\n.Calculator *:before,\r\n.Calculator *:after {\r\n  box-sizing: inherit;\r\n}\r\n\r\n/*\r\n.CalculatorBackground {\r\n  background-size: cover;\r\n  background-repeat: no-repeat;\r\n  background-image: linear-gradient(\r\n    135deg,\r\n    #b6b2ab 0%,\r\n    #b3afa7 25%,\r\n    #b8b5af 25%,\r\n    #78736b 50%,\r\n    #6f6862 50%,\r\n    #58504b 75%,\r\n    #5f574e 75%,\r\n    #625a51 100%\r\n  );\r\n  min-height: 100vh;\r\n} */\r\n\r\n.Calculator {\r\n  box-shadow: 12px 18px 45px 0 rgba(0, 0, 0, 0.25);\r\n  cursor: default;\r\n  font-family: Source Sans Pro;\r\n  line-height: 1.5;\r\n  margin: 0 auto;\r\n  position: relative;\r\n  user-select: none;\r\n  width: var(--calculator-width);\r\n  z-index: 1;\r\n}\r\n\r\n.Calculator-header {\r\n  background: white;\r\n  overflow: hidden;\r\n  padding: 20px var(--header-padding-left);\r\n  position: relative;\r\n  text-align: right;\r\n}\r\n\r\n.Calculator-formula {\r\n  color: rgba(158, 158, 158, 0.76);\r\n  display: block;\r\n  float: right;\r\n  font-size: 15px;\r\n  line-height: var(--something-height);\r\n  min-height: var(--something-height);\r\n  position: relative;\r\n  white-space: nowrap;\r\n  width: 100%;\r\n  word-wrap: normal;\r\n}\r\n\r\n.Calculator-formulaList {\r\n  display: block;\r\n  float: right;\r\n}\r\n\r\n/* // \tNot sure how to represent that there are more expressions to the left */\r\n.Calculator__expressionsOverflow {\r\n  /* $width: 2px */\r\n  color: #333;\r\n  box-shadow: 5px 0 20px 4px rgba(0, 0, 0, 0.3);\r\n  font-weight: 700;\r\n  opacity: 0;\r\n  padding-right: 0px;\r\n  text-align: center;\r\n  transition: opacity 0.5s;\r\n  transform: translate(0, -50%);\r\n  /* +position(absolute, 50% null null negative($header-padding-left) - $width - 2) */\r\n  /* +size($width $height - 5) */\r\n}\r\n\r\n.Calculator__expressionsOverflow:before {\r\n  content: '';\r\n}\r\n\r\n.Calculator__expressionsOverflow.is-showing {\r\n  opacity: 1;\r\n}\r\n\r\n.Calculator-operands {\r\n  color: var(--foreground--dark);\r\n  font-size: 60px;\r\n  font-weight: 200;\r\n  line-height: 1.1;\r\n  clear: both;\r\n}\r\n\r\n.Calculator-currentOperand {\r\n  display: block;\r\n  float: right;\r\n  line-height: 60px;\r\n  overflow: visible;\r\n  min-height: 60px;\r\n  transition-duration: 0.2s;\r\n  transition-property: font-size;\r\n}\r\n\r\n.Calculator-currentOperand.has-error {\r\n  color: hsla(10, 85%, 57%, 1);\r\n}\r\n\r\n.Calculator-body {\r\n  background: white;\r\n}\r\n\r\n.Calculator-buttonsContainer {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  overflow: visible;\r\n  position: relative;\r\n}\r\n\r\n.Calculator-buttonsContainer:before {\r\n  background-color: rgba(90, 95, 114, 0.76);\r\n  background-image: linear-gradient(\r\n    to bottom,\r\n    rgba(90, 95, 114, 0.76),\r\n    rgba(29, 32, 37, 0.8)\r\n  );\r\n  box-shadow: 17px 27px 72px 1px rgba(0, 0, 0, 0.3);\r\n  content: '';\r\n  filter: drop-shadow(0px 0px 7px rgba(0, 0, 0, 0.2));\r\n  left: -18px;\r\n  position: absolute;\r\n  right: -18px;\r\n  top: 0;\r\n  bottom: 0;\r\n}\r\n\r\n.Calculator-button {\r\n  background-color: transparent;\r\n  border: 0;\r\n  color: rgba(255, 255, 255, 0.8);\r\n  cursor: pointer;\r\n  display: flex;\r\n  font-family: Source Sans Pro;\r\n  font-size: 22px;\r\n  font-weight: 300;\r\n  justify-content: center;\r\n  line-height: 70px;\r\n  outline: 0;\r\n  padding: 0;\r\n  position: relative;\r\n  text-align: center;\r\n  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);\r\n  transition: box-shadow 0.2s, background-color 0.15s;\r\n  z-index: 1;\r\n  width: 25%;\r\n}\r\n\r\n.Calculator-button:hover {\r\n  background-color: rgba(0, 0, 0, 0.08);\r\n}\r\n\r\n.Calculator-button.is-active,\r\n.Calculator-button:active {\r\n  box-shadow: inset 0 3px 15px 0 rgba(0, 0, 0, 0.3);\r\n}\r\n\r\n.Calculator-button > span {\r\n  display: block;\r\n}\r\n\r\n.Calculator-button svg {\r\n  left: 50%;\r\n  position: absolute;\r\n  top: 50%;\r\n  transform: translate(-50%, -50%);\r\n}\r\n\r\n.Calculator-button svg,\r\n.Calculator-button path {\r\n  fill: rgba(255, 255, 255, 1);\r\n}\r\n\r\n.Calculator-button.is-negation,\r\n.Calculator-button.is-modulo {\r\n  font-size: 18px;\r\n}\r\n\r\n.Calculator-button.is-square {\r\n  font-size: 16px;\r\n}\r\n\r\n.Calculator-button.is-division {\r\n  font-size: 20px;\r\n}\r\n\r\n.Calculator-button.is-multiplication svg {\r\n  width: 11px;\r\n}\r\n\r\n.Calculator-button.is-addition svg {\r\n  width: 13px;\r\n}\r\n\r\n.Calculator-button.is-subtraction svg {\r\n  width: 14px;\r\n}\r\n\r\n.Calculator-button.is-paren {\r\n  display: flex;\r\n  font-size: 18px;\r\n  width: 12.5%;\r\n}\r\n\r\n.Calculator-button--paren:hover,\r\n.Calculator-button--paren:active {\r\n  background: initial !important;\r\n  box-shadow: none !important;\r\n  cursor: default !important;\r\n}\r\n\r\n.Calculator-button--paren > span {\r\n  flex: 50%;\r\n}\r\n\r\n.Calculator-equals {\r\n  background-color: transparent;\r\n  border: 0;\r\n  background-image: linear-gradient(to right, #ff8d4b, #ff542e);\r\n  cursor: pointer;\r\n  display: block;\r\n  padding: 26px 0;\r\n  outline: none;\r\n  position: relative;\r\n  width: 100%;\r\n  z-index: -1;\r\n}\r\n\r\n.Calculator-equalsLine {\r\n  background: white;\r\n  box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.4);\r\n  display: block;\r\n  margin: 0 auto 6px;\r\n  width: 20px;\r\n  height: 1px;\r\n}\r\n\r\n.Calculator-equalsLine:last-child {\r\n  margin-bottom: 0;\r\n}\r\n</style>\r\n"]}, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = undefined;
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* style inject SSR */
  
  /* style inject shadow dom */
  

  
  var __vue_component__ = normalizeComponent(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    false,
    createInjector,
    undefined,
    undefined
  );

// Import vue component

// Declare install function executed by Vue.use()
function install(Vue) {
	if (install.installed) { return; }
	install.installed = true;
	Vue.component('calculator', __vue_component__);
}

// Create module definition for Vue.use()
var plugin = {
	install: install,
};

// Auto-install when vue is found (eg. in browser via <script> tag)
var GlobalVue = null;
if (typeof window !== 'undefined') {
	GlobalVue = window.Vue;
} else if (typeof global !== 'undefined') {
	GlobalVue = global.Vue;
}
if (GlobalVue) {
	GlobalVue.use(plugin);
}

export default __vue_component__;
export { install };
