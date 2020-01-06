import { normalizeComponent, createInjector } from 'vue-runtime-helpers';

/**
 * LEXER AND PARSER for mathematical expressions. The lexer is hand written with influences from Stylus's lexer, but the parser was mostly taken from elsewhere, which is listed in the description for the Parser constructor.
 */

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

var keyboardNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
var keyboardOperators = ['*', '+', '-', '/'];

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
    text: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"rgba(255,255,255,.9)\" stroke=\"rgba(255,255,255,.9)\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M368 368L144 144\"/><path fill=\"none\" stroke=\"rgba(255,255,255,.9)\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M368 144L144 368\"/></svg>",
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
    text: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><title>ionicons-v5-e</title><line x1=\"400\" y1=\"256\" x2=\"112\" y2=\"256\" style=\"fill:rgba(255,255,255,0.9);stroke:rgba(255,255,255,0.9);stroke-linecap:round;stroke-linejoin:round;stroke-width:32px\"/></svg>",
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
    text: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path style=\"fill: rgba(255,255,255,0.9);stroke: rgba(255,255,255,0.9)\" d=\"M368.5 240H272v-96.5c0-8.8-7.2-16-16-16s-16 7.2-16 16V240h-96.5c-8.8 0-16 7.2-16 16 0 4.4 1.8 8.4 4.7 11.3 2.9 2.9 6.9 4.7 11.3 4.7H240v96.5c0 4.4 1.8 8.4 4.7 11.3 2.9 2.9 6.9 4.7 11.3 4.7 8.8 0 16-7.2 16-16V272h96.5c8.8 0 16-7.2 16-16s-7.2-16-16-16z\"/></svg>",
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
      value: n,
    },
  }); }) );

var script = {
  props: {
    commands: {
      type: Array,
      default: function () { return defaultCommands; },
    },
  },
  mounted: function mounted() {
    window.addEventListener('keydown', this.onKeyDown);
  },
  data: function data() {
    return {
      MODE_SHOW_TOTAL: MODE_SHOW_TOTAL,
      MODE_INSERT_OPERAND: MODE_INSERT_OPERAND,
      MODE_APPEND_OPERAND: MODE_APPEND_OPERAND,
      activeButtons: [],
      buttons: buttons,
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
    formula: function formula() {
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
  methods: {
    onKeyDown: function onKeyDown(e) {
      var this$1 = this;

      if (event.defaultPrevented) {
        return
      }

      this.commands.forEach(function (command) {
        Object.keys(command.match).map(function (key) {
          var value = command.match[key];

          if (e[key] === value) {
            this$1.exec(command.action, command.args);
            this$1.$emit('keypress');
          }
        });
      });
    },
    onExplicitEquals: function onExplicitEquals() {
      this.showTotal({ explicit: true });
    },
    exec: function exec(action, args) {
      console.log(action);

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
          this.updateOperator(args);
          this.$emit('operator.update');
          break
        }
        case ACTION_APPEND_OPERAND: {
          this.appendOperand(args);
          this.$emit('operand.append');
          break
        }
        case ACTION_ADD_PAREN: {
          this.addParen(args);
          this.$emit('paren.add');
          break
        }
        default: {
          console.error(("action not found: \"" + action + "\""));
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

      // console.log(this.currentOperand)
    },

    updateOperator: function updateOperator(ref) {
      var operator = ref.operator;

      var length = this.expressions.length;
      var last = this.expressions[length - 1] || '';
      var ref$1 = this;
      var mode = ref$1.mode;
      var currentOperand = ref$1.currentOperand;

      if (mode & MODE_INSERT_OPERAND) {
        // console.log('MODE_INSERT_OPERAND')

        if (length === 0) {
          this.expressions.push(currentOperand, operator);
        } else if (isOperator(last)) {
          // console.log('isoplast');                            // APPEND_OP LOG
          this.expressions.pop();
          this.expressions.push(operator);
        } else if (last === ')') {
          // console.log('nope');                                // APPEND_OP LOG
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

      console.log('UPDATE_OPERATOR:', this.expressions);
    },

    addParen: function addParen(ref) {
      var operator = ref.operator;

      var last = this.expressions[this.expressions.length - 1] || '';
      var ref$1 = this;
      var currentOperand = ref$1.currentOperand;
      var openParenStack = ref$1.openParenStack;

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
        this.expressions.push(currentOperand, operator);
      } else if (isOperator(last) && operator === ')') {
        // Automatically append current operand when expressions
        // is "(5 *" so result is "(5 * 5)"
        this.expressions.push(currentOperand, operator);
      } else if ((isOperator(last) || length === 0) && operator === '(') {
        // Handle "5 *" where the result is "5 * (" and "(" is the beginning
        // of a new group expression
        this.expressions.push(operator);
      }

      if (operator === '(') {
        this.openParenStack++;
      } else if (operator === ')') {
        this.openParenStack--;
      }
    },

    appendOperand: function appendOperand(ref) {
      var value = ref.value;
      var operator = ref.operator;

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
          console.log(err);
        }
      }

      console.log(
        'SHOW_TOTAL; Expressions: "%s"; Total: %s; Explicit: %s',
        expressions.join(' '),
        total,
        !!explicit
      );

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
  return _c("div", { staticClass: "CalculatorBackground" }, [
    _vm._m(0),
    _vm._v(" "),
    _c("div", { staticClass: "Calculator" }, [
      _c("header", { staticClass: "Calculator-header" }, [
        _c(
          "div",
          { staticClass: "Calculator-formula", attrs: { "data-formula": "" } },
          [
            _c("span", { staticClass: "Calculator-formulaOverflow" }),
            _c("span", { staticClass: "Calculator-formulaList" }, [
              _vm._v(_vm._s(_vm.formula))
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
                attrs: { "data-id": button.id },
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
            "https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400&display=swap",
          rel: "stylesheet"
        }
      }),
      _vm._v(" "),
      _c("meta", {
        attrs: {
          name: "viewport",
          content: "width=device-width, initial-scale=1"
        }
      })
    ])
  }
];
__vue_render__._withStripped = true;

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-9458653c_0", { source: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\r\n/* // */\r\n/* // -> Design credit goes to Jaroslav Getman */\r\n/* // -> https://dribbble.com/shots/2334270-004-Calculator */\r\n/* // */\r\n\r\n/* @import url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css') */\nhtml {\r\n  --foreground--dark: #151515;\r\n\r\n  --background-gradient-1: #b6b2ab;\r\n  --background-gradient-2: #b3afa7;\r\n\r\n  --background-gradient-3: #b8b5af;\r\n  --background-gradient-4: #78736b;\r\n\r\n  --background-gradient-5: #6f6862;\r\n  --background-gradient-6: #58504b;\r\n\r\n  --background-gradient-7: #5f574e;\r\n  --background-gradient-8: #625a51;\r\n\r\n  /* // I don't know how to get the colors closer here, would need the actual hsla */\r\n  --gradient-blue-1: hsla(226, 12%, 40%, 0.76);\r\n  --gradient-blue-2: hsla(222, 12%, 13%, 0.8);\r\n\r\n  --gradient-orange-1: #ff8d4b;\r\n  --gradient-orange-2: #ff542e;\r\n\r\n  --calculator-width: 260px;\r\n  --header-padding-left: 20px;\r\n  --something-height: 22px;\n}\n.Calculator,\r\n.Calculator *,\r\n.Calculator *:before,\r\n.Calculator *:after {\r\n  box-sizing: inherit;\n}\n.CalculatorBackground {\r\n  background-size: cover;\r\n  background-repeat: no-repeat;\r\n  background-image: linear-gradient(\r\n    135deg,\r\n    #b6b2ab 0%,\r\n    #b3afa7 25%,\r\n    #b8b5af 25%,\r\n    #78736b 50%,\r\n    #6f6862 50%,\r\n    #58504b 75%,\r\n    #5f574e 75%,\r\n    #625a51 100%\r\n  );\r\n  min-height: 100vh;\n}\n.Calculator {\r\n  box-shadow: 12px 18px 45px 0 rgba(0, 0, 0, 0.25);\r\n  cursor: default;\r\n  font-family: Source Sans Pro;\r\n  line-height: 1.5;\r\n  margin: 0 auto;\r\n  position: relative;\r\n  user-select: none;\r\n  width: var(--calculator-width);\r\n  z-index: 1;\n}\n.Calculator-header {\r\n  background: white;\r\n  overflow: hidden;\r\n  padding: 20px var(--header-padding-left);\r\n  position: relative;\r\n  text-align: right;\n}\n.Calculator-formula {\r\n  color: rgba(158, 158, 158, 0.76);\r\n  display: block;\r\n  float: right;\r\n  font-size: 15px;\r\n  line-height: var(--something-height);\r\n  min-height: var(--something-height);\r\n  position: relative;\r\n  white-space: nowrap;\r\n  width: 100%;\r\n  word-wrap: normal;\n}\n.Calculator-formulaList {\r\n  display: block;\r\n  float: right;\n}\r\n\r\n/* // \tNot sure how to represent that there are more expressions to the left */\n.Calculator__expressionsOverflow {\r\n  /* $width: 2px */\r\n  color: #333;\r\n  box-shadow: 5px 0 20px 4px rgba(0, 0, 0, 0.3);\r\n  font-weight: 700;\r\n  opacity: 0;\r\n  padding-right: 0px;\r\n  text-align: center;\r\n  transition: opacity 0.5s;\r\n  transform: translate(0, -50%);\r\n  /* +position(absolute, 50% null null negative($header-padding-left) - $width - 2) */\r\n  /* +size($width $height - 5) */\n}\n.Calculator__expressionsOverflow:before {\r\n  content: '';\n}\n.Calculator__expressionsOverflow.is-showing {\r\n  opacity: 1;\n}\n.Calculator-operands {\r\n  color: var(--foreground--dark);\r\n  font-size: 60px;\r\n  font-weight: 200;\r\n  line-height: 1.1;\r\n  clear: both;\n}\n.Calculator-currentOperand {\r\n  display: block;\r\n  float: right;\r\n  line-height: 60px;\r\n  overflow: visible;\r\n  min-height: 60px;\r\n  transition-duration: 0.2s;\r\n  transition-property: font-size;\n}\n.Calculator-currentOperand.has-error {\r\n  color: hsla(10, 85%, 57%, 1);\n}\n.Calculator-body {\r\n  background: white;\n}\n.Calculator-buttonsContainer {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  overflow: visible;\r\n  position: relative;\n}\n.Calculator-buttonsContainer:before {\r\n  background-color: rgba(90, 95, 114, 0.76);\r\n  background-image: linear-gradient(\r\n    to bottom,\r\n    rgba(90, 95, 114, 0.76),\r\n    rgba(29, 32, 37, 0.8)\r\n  );\r\n  box-shadow: 17px 27px 72px 1px rgba(0, 0, 0, 0.3);\r\n  content: '';\r\n  filter: drop-shadow(0px 0px 7px rgba(0, 0, 0, 0.2));\r\n  left: -18px;\r\n  position: absolute;\r\n  right: -18px;\r\n  top: 0;\r\n  bottom: 0;\r\n  /* width: 100%; */\r\n  /* height: 100%; */\n}\n.Calculator-button {\r\n  background-color: transparent;\r\n  border: 0;\r\n  color: rgba(255, 255, 255, 0.8);\r\n  cursor: pointer;\r\n  display: flex;\r\n  font-family: Source Sans Pro;\r\n  font-size: 22px;\r\n  font-weight: 300;\r\n  justify-content: center;\r\n  line-height: 70px;\r\n  outline: 0;\r\n  padding: 0;\r\n  position: relative;\r\n  text-align: center;\r\n  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);\r\n  transition: box-shadow 0.2s, background-color 0.15s;\r\n  z-index: 1;\r\n  width: 25%;\n}\n.Calculator-button:hover {\r\n  background-color: rgba(0, 0, 0, 0.08);\n}\n.Calculator-button.is-active,\r\n.Calculator-button:active {\r\n  box-shadow: inset 0 3px 15px 0 rgba(0, 0, 0, 0.3);\n}\n.Calculator-button > span {\r\n  display: block;\n}\n.Calculator-button.is-negation,\r\n.Calculator-button.is-modulo {\r\n  font-size: 18px;\n}\n.Calculator-button.is-square {\r\n  font-size: 16px;\n}\n.Calculator-button.is-division {\r\n  font-size: 20px;\n}\n.Calculator-button.is-multiplication svg {\r\n  width: 20px;\n}\n.Calculator-button.is-addition svg {\r\n  width: 20px;\n}\n.Calculator-button.is-subtraction svg {\r\n  width: 20px;\n}\n.Calculator-button.is-paren {\r\n  display: flex;\r\n  font-size: 18px;\r\n  width: 12.5%;\n}\n.Calculator-button--paren:hover,\r\n.Calculator-button--paren:active {\r\n  background: initial !important;\r\n  box-shadow: none !important;\r\n  cursor: default !important;\n}\n.Calculator-button--paren > span {\r\n  flex: 50%;\n}\n.Calculator-equals {\r\n  background-color: transparent;\r\n  border: 0;\r\n  background-image: linear-gradient(to right, #ff8d4b, #ff542e);\r\n  cursor: pointer;\r\n  display: block;\r\n  padding: 26px 0;\r\n  outline: none;\r\n  position: relative;\r\n  width: 100%;\r\n  z-index: -1;\n}\n.Calculator-equalsLine {\r\n  background: white;\r\n  box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.4);\r\n  display: block;\r\n  margin: 0 auto 6px;\r\n  width: 20px;\r\n  height: 1px;\n}\n.Calculator-equalsLine:last-child {\r\n  margin-bottom: 0;\n}\r\n", map: {"version":3,"sources":["/mnt/c/Users/tony/Github/calculator/src/calculator.vue","calculator.vue"],"names":[],"mappings":";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;AA+rBA,OAAA;AACA,gDAAA;AACA,4DAAA;AACA,OAAA;;AAEA,8FAAA;AAEA;EACA,2BAAA;;EAEA,gCAAA;EACA,gCAAA;;EAEA,gCAAA;EACA,gCAAA;;EAEA,gCAAA;EACA,gCAAA;;EAEA,gCAAA;EACA,gCAAA;;EAEA,kFAAA;EACA,4CAAA;EACA,2CAAA;;EAEA,4BAAA;EACA,4BAAA;;EAEA,yBAAA;EACA,2BAAA;EACA,wBAAA;AACA;AAEA;;;;EAIA,mBAAA;AACA;AAEA;EACA,sBAAA;EACA,4BAAA;EACA;;;;;;;;;;GAAA;EACA,iBAAA;AACA;AAEA;EACA,gDAAA;EACA,eAAA;EACA,4BAAA;EACA,gBAAA;EACA,cAAA;EACA,kBAAA;EACA,iBAAA;EACA,8BAAA;ECCE,UAAU;ADCZ;AAEA;EACA,iBAAA;EACA,gBAAA;EACA,wCAAA;EACA,kBAAA;EACA,iBAAA;AACA;AAEA;ECCE,gCAAgC;EDClC,cAAA;EACA,YAAA;EACA,eAAA;EACA,oCAAA;EACA,mCAAA;EACA,kBAAA;EACA,mBAAA;ECCE,WAAW;EDCb,iBAAA;AACA;AAEA;EACA,cAAA;EACA,YAAA;AACA;;AAEA,8EAAA;AACA;EACA,gBAAA;EACA,WAAA;ECCE,6CAA6C;EDC/C,gBAAA;EACA,UAAA;EACA,kBAAA;EACA,kBAAA;ECCE,wBAAwB;EDC1B,6BAAA;EACA,mFAAA;EACA,8BAAA;AACA;AAEA;EACA,WAAA;AACA;AAEA;EACA,UAAA;AACA;AAEA;ECCE,8BAA8B;EDChC,eAAA;EACA,gBAAA;EACA,gBAAA;ECCE,WAAW;ADCb;AAEA;ECCE,cAAc;EDChB,YAAA;EACA,iBAAA;EACA,iBAAA;EACA,gBAAA;EACA,yBAAA;EACA,8BAAA;AACA;AAEA;EACA,4BAAA;AACA;AAEA;EACA,iBAAA;AACA;AAEA;ECCE,aAAa;EDCf,eAAA;EACA,iBAAA;EACA,kBAAA;ACCA;ADEA;EACA,yCAAA;ECCE;;;;GDIF;EACA,iDAAA;EACA,WAAA;ECCE,mDAAmD;EDCrD,WAAA;EACA,kBAAA;EACA,YAAA;EACA,MAAA;EACA,SAAA;EACA,iBAAA;EACA,kBAAA;AACA;AAEA;EACA,6BAAA;EACA,SAAA;EACA,+BAAA;EACA,eAAA;EACA,aAAA;EACA,4BAAA;EACA,eAAA;EACA,gBAAA;ECCE,uBAAuB;EDCzB,iBAAA;EACA,UAAA;EACA,UAAA;EACA,kBAAA;EACA,kBAAA;EACA,4CAAA;EACA,mDAAA;EACA,UAAA;EACA,UAAA;AACA;AAEA;EACA,qCAAA;AACA;AAEA;;EAEA,iDAAA;AACA;ACEA;EDCA,cAAA;AACA;ACEA;;EDEA,eAAA;AACA;ACEA;EDCA,eAAA;AACA;ACEA;EDCA,eAAA;AACA;AAEA;ECCE,WAAW;ADCb;AAEA;ECCE,WAAW;ADCb;AAEA;ECCE,WAAW;ADCb;AAEA;ECCE,aAAa;EDCf,eAAA;EACA,YAAA;AACA;AAEA;;EAEA,8BAAA;ECCE,2BAA2B;EDC7B,0BAAA;AACA;AAEA;EACA,SAAA;ACCA;ADEA;EACA,6BAAA;EACA,SAAA;EACA,6DAAA;EACA,eAAA;ECCE,cAAc;EDChB,eAAA;EACA,aAAA;EACA,kBAAA;ECCE,WAAW;EDCb,WAAA;AACA;AAEA;EACA,iBAAA;EACA,0CAAA;EACA,cAAA;EACA,kBAAA;EACA,WAAA;EACA,WAAA;AACA;ACEA;EDCA,gBAAA;AACA","file":"calculator.vue","sourcesContent":["<template>\r\n  <div class=\"CalculatorBackground\">\r\n    <noscript>\r\n      <link\r\n        href=\"https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400&display=swap\"\r\n        rel=\"stylesheet\"\r\n      />\r\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\r\n    </noscript>\r\n    <div class=\"Calculator\">\r\n      <header class=\"Calculator-header\">\r\n        <div class=\"Calculator-formula\" data-formula>\r\n          <span class=\"Calculator-formulaOverflow\"></span\r\n          ><span class=\"Calculator-formulaList\">{{ formula }}</span>\r\n        </div>\r\n        <div class=\"Calculator-operands\">\r\n          <span\r\n            class=\"Calculator-currentOperand\"\r\n            data-total\r\n            :class=\"{ 'has-error': error }\"\r\n            :style=\"{\r\n              'font-size': font.size,\r\n              'font-weight': font.weight,\r\n            }\"\r\n          >\r\n            <span v-if=\"error\">Error</span>\r\n            <span v-else-if=\"mode & MODE_SHOW_TOTAL\">{{ total }}</span>\r\n            <span v-else>{{ currentOperand }}</span>\r\n          </span>\r\n        </div>\r\n      </header>\r\n      <div class=\"Calculator-body\">\r\n        <div class=\"Calculator-buttonsContainer\">\r\n          <button\r\n            v-for=\"button in buttons\"\r\n            class=\"Calculator-button\"\r\n            :key=\"button.id\"\r\n            :data-id=\"button.id\"\r\n            :class=\"button.className\"\r\n            @click=\"exec(button.action, button.args)\"\r\n          >\r\n            <span v-html=\"button.text\" />\r\n          </button>\r\n        </div>\r\n      </div>\r\n      <button\r\n        title=\"equals\"\r\n        class=\"Calculator-equals\"\r\n        @click=\"onExplicitEquals\"\r\n      >\r\n        <div class=\"Calculator-equalsLine\"></div>\r\n        <div class=\"Calculator-equalsLine\"></div>\r\n      </button>\r\n    </div>\r\n  </div>\r\n</template>\r\n\r\n<script>\r\nimport evalmath, { isOperator } from './math'\r\n\r\nconst keyboardNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9']\r\nconst keyboardOperators = ['*', '+', '-', '/']\r\n\r\nconst ACTION_CLEAR = 'clear'\r\nconst ACTION_CLEAR_ENTRY = 'clearEntry'\r\nconst ACTION_NEGATE = 'negate'\r\nconst ACTION_UPDATE_OPERATOR = 'updateOperator'\r\nconst ACTION_APPEND_OPERAND = 'appendOperand'\r\nconst ACTION_ADD_PAREN = 'addParen'\r\nconst ACTION_BACKSPACE = 'backspace'\r\nconst ACTION_SHOW_TOTAL = 'showTotal'\r\n\r\nconst buttons = [\r\n  {\r\n    id: 'C',\r\n    text: 'C',\r\n    className: 'is-clear',\r\n    action: ACTION_CLEAR,\r\n  },\r\n\r\n  {\r\n    id: 'CE',\r\n    text: 'CE',\r\n    className: 'is-clearEntry',\r\n    action: ACTION_CLEAR_ENTRY,\r\n  },\r\n  {\r\n    id: 'negate',\r\n    text: '+/-',\r\n    className: 'is-negation',\r\n    action: ACTION_NEGATE,\r\n  },\r\n  {\r\n    id: 'modulo',\r\n    text: '%',\r\n    className: 'is-modulo',\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '%',\r\n    },\r\n  },\r\n  // {\r\n  //   id: 4,\r\n  //   text: '√',\r\n  //   className: 'is-square',\r\n  //   action: ACTION_UPDATE_OPERATOR,\r\n  //   args: {\r\n  //     operator: '√',\r\n  //   },\r\n  // },\r\n\r\n  {\r\n    id: '7',\r\n    text: '7',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '7',\r\n    },\r\n  },\r\n  {\r\n    id: '8',\r\n    text: '8',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '8',\r\n    },\r\n  },\r\n  {\r\n    id: '9',\r\n    text: '9',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '9',\r\n    },\r\n  },\r\n  {\r\n    id: '/',\r\n    text: '/',\r\n    className: 'is-division',\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '/',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '4',\r\n    text: '4',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '4',\r\n    },\r\n  },\r\n  {\r\n    id: '5',\r\n    text: '5',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '5',\r\n    },\r\n  },\r\n  {\r\n    id: '6',\r\n    text: '6',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '6',\r\n    },\r\n  },\r\n  {\r\n    id: '*',\r\n    className: 'is-multiplication',\r\n    text: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"rgba(255,255,255,.9)\" stroke=\"rgba(255,255,255,.9)\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M368 368L144 144\"/><path fill=\"none\" stroke=\"rgba(255,255,255,.9)\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"32\" d=\"M368 144L144 368\"/></svg>`,\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '*',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '1',\r\n    text: '1',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '1',\r\n    },\r\n  },\r\n  {\r\n    id: '2',\r\n    text: '2',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '2',\r\n    },\r\n  },\r\n  {\r\n    id: '3',\r\n    text: '3',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '3',\r\n    },\r\n  },\r\n  {\r\n    id: '-',\r\n    className: 'is-subtraction',\r\n    text: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><title>ionicons-v5-e</title><line x1=\"400\" y1=\"256\" x2=\"112\" y2=\"256\" style=\"fill:rgba(255,255,255,0.9);stroke:rgba(255,255,255,0.9);stroke-linecap:round;stroke-linejoin:round;stroke-width:32px\"/></svg>`,\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '-',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '0',\r\n    text: '0',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '0',\r\n    },\r\n  },\r\n  {\r\n    id: '(',\r\n    text: '(',\r\n    className: ['is-paren', 'is-open-paren'],\r\n    action: ACTION_ADD_PAREN,\r\n    args: {\r\n      operator: '(',\r\n    },\r\n  },\r\n  {\r\n    id: ')',\r\n    text: ')',\r\n    className: ['is-paren', 'is-close-paren'],\r\n    action: ACTION_ADD_PAREN,\r\n    args: {\r\n      operator: ')',\r\n    },\r\n  },\r\n\r\n  {\r\n    id: '.',\r\n    text: '.',\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: '.',\r\n    },\r\n  },\r\n  {\r\n    id: '+',\r\n    text: '',\r\n    className: 'is-addition',\r\n    text: `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path style=\"fill: rgba(255,255,255,0.9);stroke: rgba(255,255,255,0.9)\" d=\"M368.5 240H272v-96.5c0-8.8-7.2-16-16-16s-16 7.2-16 16V240h-96.5c-8.8 0-16 7.2-16 16 0 4.4 1.8 8.4 4.7 11.3 2.9 2.9 6.9 4.7 11.3 4.7H240v96.5c0 4.4 1.8 8.4 4.7 11.3 2.9 2.9 6.9 4.7 11.3 4.7 8.8 0 16-7.2 16-16V272h96.5c8.8 0 16-7.2 16-16s-7.2-16-16-16z\"/></svg>`,\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      operator: '+',\r\n    },\r\n  },\r\n]\r\n\r\n// Mode show total causes the total to be displayed in the current operand display\r\nconst MODE_SHOW_TOTAL = 1 << 1\r\n// Mode insert operand causes the current operand to be overwritten. After the first character has been written, the mode should go to mode append operand\r\nconst MODE_INSERT_OPERAND = 1 << 2\r\n// Mode append operand causes any operand parts to be appended to the current operand\r\nconst MODE_APPEND_OPERAND = 1 << 3\r\n\r\n// The maximum number of digits the current operand may be\r\nconst MAX_NUMBER_LENGTH = Number.MAX_SAFE_INTEGER.toString().length\r\n\r\nfunction isNumberPart(str) {\r\n  return /^[0-9.]/.test(str)\r\n}\r\n\r\n// Debug function for flags\r\nfunction getFlags(flags) {\r\n  let arr = []\r\n\r\n  if (flags & MODE_SHOW_TOTAL) {\r\n    arr.push('MODE_SHOW_TOTAL')\r\n  }\r\n  if (flags & MODE_INSERT_OPERAND) {\r\n    arr.push('MODE_INSERT_OPERAND')\r\n  }\r\n\r\n  if (flags & MODE_APPEND_OPERAND) {\r\n    arr.push('MODE_APPEND_OPERAND')\r\n  }\r\n\r\n  return arr.join('|')\r\n}\r\n\r\nconst defaultCommands = [\r\n  {\r\n    match: {\r\n      key: 'Enter',\r\n    },\r\n    action: ACTION_SHOW_TOTAL,\r\n  },\r\n  {\r\n    match: {\r\n      key: 'Backspace',\r\n    },\r\n    action: ACTION_BACKSPACE,\r\n  },\r\n  {\r\n    match: {\r\n      key: 'Escape',\r\n    },\r\n    action: ACTION_CLEAR,\r\n  },\r\n  {\r\n    match: {\r\n      key: 'Delete',\r\n    },\r\n    action: ACTION_CLEAR_ENTRY,\r\n  },\r\n  ...keyboardNumbers.map(n => ({\r\n    match: {\r\n      key: n,\r\n    },\r\n    action: ACTION_APPEND_OPERAND,\r\n    args: {\r\n      value: n,\r\n    },\r\n  })),\r\n  ...keyboardOperators.map(n => ({\r\n    match: {\r\n      key: n,\r\n    },\r\n    action: ACTION_UPDATE_OPERATOR,\r\n    args: {\r\n      value: n,\r\n    },\r\n  })),\r\n]\r\n\r\nexport default {\r\n  props: {\r\n    commands: {\r\n      type: Array,\r\n      default: () => defaultCommands,\r\n    },\r\n  },\r\n  mounted() {\r\n    window.addEventListener('keydown', this.onKeyDown)\r\n  },\r\n  data() {\r\n    return {\r\n      MODE_SHOW_TOTAL,\r\n      MODE_INSERT_OPERAND,\r\n      MODE_APPEND_OPERAND,\r\n      activeButtons: [],\r\n      buttons,\r\n      expressions: ['5', '+', '7', '-', '45', '+', '3', '+', '177', '-'],\r\n      currentOperand: '147',\r\n      currentOperator: '-',\r\n      mode: MODE_SHOW_TOTAL | MODE_INSERT_OPERAND,\r\n      openParenStack: 0,\r\n      error: null,\r\n      total: 147,\r\n    }\r\n  },\r\n  computed: {\r\n    formula() {\r\n      return this.expressions\r\n        .map((str, index, array) => {\r\n          const s = str.trim()\r\n\r\n          if (array[index - 1] === '(') {\r\n            return s\r\n          } else if (s === ')') {\r\n            return s\r\n          } else if (s[0] === '-' && isNumberPart(s[1])) {\r\n            return ' ' + str\r\n          } else {\r\n            return ' ' + s\r\n          }\r\n\r\n          return str\r\n        })\r\n        .join('')\r\n    },\r\n    font() {\r\n      // TODO: Change this to be some equation\r\n      let length\r\n\r\n      if (this.mode & MODE_SHOW_TOTAL) {\r\n        length = this.total.toString().length\r\n      } else {\r\n        length = this.currentOperand.toString().length\r\n      }\r\n\r\n      let size\r\n      let weight\r\n\r\n      if (length < 8) {\r\n        size = '60px'\r\n        weight = '200'\r\n      } else if (length <= MAX_NUMBER_LENGTH) {\r\n        size = '28px'\r\n        weight = '300'\r\n      } else if (length >= MAX_NUMBER_LENGTH) {\r\n        size = '24px'\r\n        weight = '300'\r\n      }\r\n\r\n      return { size, weight }\r\n    },\r\n  },\r\n  methods: {\r\n    onKeyDown(e) {\r\n      if (event.defaultPrevented) {\r\n        return\r\n      }\r\n\r\n      this.commands.forEach(command => {\r\n        Object.keys(command.match).map(key => {\r\n          const value = command.match[key]\r\n\r\n          if (e[key] === value) {\r\n            this.exec(command.action, command.args)\r\n            this.$emit('keypress')\r\n          }\r\n        })\r\n      })\r\n    },\r\n    onExplicitEquals() {\r\n      this.showTotal({ explicit: true })\r\n    },\r\n    exec(action, args) {\r\n      console.log(action)\r\n\r\n      switch (action) {\r\n        case ACTION_BACKSPACE: {\r\n          this.backspace(args)\r\n          this.$emit('backspace')\r\n          break\r\n        }\r\n        case ACTION_CLEAR: {\r\n          this.clear(args)\r\n          this.$emit('clear')\r\n          break\r\n        }\r\n        case ACTION_CLEAR_ENTRY: {\r\n          this.clearEntry(args)\r\n          this.$emit('clear-entry')\r\n          break\r\n        }\r\n        case ACTION_NEGATE: {\r\n          this.negate(args)\r\n          this.$emit('negate')\r\n          break\r\n        }\r\n        case ACTION_UPDATE_OPERATOR: {\r\n          this.updateOperator(args)\r\n          this.$emit('operator.update')\r\n          break\r\n        }\r\n        case ACTION_APPEND_OPERAND: {\r\n          this.appendOperand(args)\r\n          this.$emit('operand.append')\r\n          break\r\n        }\r\n        case ACTION_ADD_PAREN: {\r\n          this.addParen(args)\r\n          this.$emit('paren.add')\r\n          break\r\n        }\r\n        default: {\r\n          console.error(`action not found: \"${action}\"`)\r\n        }\r\n      }\r\n\r\n      this.showTotal()\r\n    },\r\n    clear() {\r\n      this.expressions = []\r\n      this.currentOperand = '0'\r\n      this.currentOperator = ''\r\n      this.openParenStack = 0\r\n      this.mode = MODE_SHOW_TOTAL | MODE_INSERT_OPERAND\r\n      this.error = null\r\n      this.total = 0\r\n    },\r\n\r\n    backspace() {\r\n      let operand = this.currentOperand.slice(0, -1)\r\n\r\n      if (operand.length === 0) {\r\n        operand = '0'\r\n      }\r\n\r\n      this.currentOperand = operand\r\n    },\r\n\r\n    clearEntry() {\r\n      this.currentOperand = '0'\r\n    },\r\n\r\n    negate() {\r\n      // Only add negative sign if not zero\r\n      if (this.currentOperand !== 0) {\r\n        this.currentOperand = (-this.currentOperand).toString()\r\n      }\r\n\r\n      // console.log(this.currentOperand)\r\n    },\r\n\r\n    updateOperator({ operator }) {\r\n      const length = this.expressions.length\r\n      const last = this.expressions[length - 1] || ''\r\n      const { mode, currentOperand } = this\r\n\r\n      if (mode & MODE_INSERT_OPERAND) {\r\n        // console.log('MODE_INSERT_OPERAND')\r\n\r\n        if (length === 0) {\r\n          this.expressions.push(currentOperand, operator)\r\n        } else if (isOperator(last)) {\r\n          // console.log('isoplast');                            // APPEND_OP LOG\r\n          this.expressions.pop()\r\n          this.expressions.push(operator)\r\n        } else if (last === ')') {\r\n          // console.log('nope');                                // APPEND_OP LOG\r\n          this.expressions.push(operator)\r\n        } else if (last === '(') {\r\n          this.expressions.push(currentOperand, operator)\r\n        }\r\n      } else if (mode & MODE_APPEND_OPERAND) {\r\n        // console.log('MODE_APPEND_OPERAND')\r\n\r\n        if (length === 0) {\r\n          this.expressions.push(currentOperand, operator)\r\n        } else if (isOperator(last)) {\r\n          this.expressions.push(currentOperand, operator)\r\n        } else if (last === ')') {\r\n          this.expressions.push(operator)\r\n        } else if (last === '(') {\r\n          this.expressions.push(currentOperand, operator)\r\n        }\r\n      }\r\n\r\n      this.currentOperator = operator\r\n      this.mode = MODE_INSERT_OPERAND | MODE_SHOW_TOTAL\r\n\r\n      console.log('UPDATE_OPERATOR:', this.expressions)\r\n    },\r\n\r\n    addParen({ operator }) {\r\n      const last = this.expressions[this.expressions.length - 1] || ''\r\n      const { currentOperand, openParenStack } = this\r\n\r\n      // console.log('ADD_PAREN:', {last, operator});\r\n\r\n      if (operator === ')' && openParenStack === 0) {\r\n        // No need to add closing paren if there is no open paren\r\n        return\r\n      } else if (operator === '(' && last === ')') {\r\n        // FIXME: Look at real calculator for semantics\r\n        return\r\n      }\r\n\r\n      if (last === '(' && operator === ')') {\r\n        // Handle immediate closed parens\r\n        this.expressions.push(currentOperand, operator)\r\n      } else if (isOperator(last) && operator === ')') {\r\n        // Automatically append current operand when expressions\r\n        // is \"(5 *\" so result is \"(5 * 5)\"\r\n        this.expressions.push(currentOperand, operator)\r\n      } else if ((isOperator(last) || length === 0) && operator === '(') {\r\n        // Handle \"5 *\" where the result is \"5 * (\" and \"(\" is the beginning\r\n        // of a new group expression\r\n        this.expressions.push(operator)\r\n      }\r\n\r\n      if (operator === '(') {\r\n        this.openParenStack++\r\n      } else if (operator === ')') {\r\n        this.openParenStack--\r\n      }\r\n    },\r\n\r\n    appendOperand({ value, operator }) {\r\n      const currentOperand = this.currentOperand\r\n      let newOperand = currentOperand\r\n      let newMode\r\n\r\n      // Don't append 0 to 0\r\n      if (value === '0' && currentOperand[0] === '0') {\r\n        return\r\n      } else if (value === '.' && currentOperand.includes('.')) {\r\n        // Avoid appending multiple decimals\r\n        return\r\n      }\r\n\r\n      // Switch modes from showing the total to the current operand\r\n      if (this.mode & MODE_SHOW_TOTAL) {\r\n        newMode = MODE_INSERT_OPERAND\r\n      }\r\n\r\n      if (this.mode & MODE_INSERT_OPERAND) {\r\n        // console.log('INSERT');\r\n        newOperand = value.toString()\r\n        this.mode = MODE_APPEND_OPERAND\r\n      } else {\r\n        // console.log('APPEND');\r\n        newOperand += value.toString()\r\n      }\r\n\r\n      // TODO: Update font size, actually should do that in the vm\r\n      this.currentOperand = newOperand.substring(0, MAX_NUMBER_LENGTH)\r\n    },\r\n\r\n    showTotal({ explicit } = {}) {\r\n      const last = this.expressions[this.expressions.length - 1] || ''\r\n      const expressions = this.expressions.slice(0)\r\n      const currentOperand = this.currentOperand\r\n      const mode = this.mode\r\n      const currentTotal = this.total\r\n      const openParenStack = this.openParenStack\r\n      const isFirstNumber = typeof Number(expressions[0]) === 'number'\r\n      const isSecondOperator = isOperator(expressions[1] || '')\r\n      const length = expressions.length\r\n      let times = openParenStack\r\n      let total\r\n\r\n      if (expressions.length === 0) {\r\n        return\r\n      } else if (\r\n        explicit &&\r\n        isFirstNumber &&\r\n        isSecondOperator &&\r\n        length === 2\r\n      ) {\r\n        // Handle case where expressions is 5 *\r\n\r\n        // console.log('explicit && isFirstNumber && isSecondOperator');\r\n        expressions.push(currentOperand)\r\n      } else if (explicit && isOperator(last)) {\r\n        // Handle case where expressions is ['5', '*', '4', '+'] and\r\n        // the total is being explicitly being requested\r\n\r\n        // console.log('explicit && isOperator(last)', isOperator(last), last);\r\n        if (mode & MODE_INSERT_OPERAND) {\r\n          expressions.push(currentTotal)\r\n        } else if (mode & MODE_APPEND_OPERAND) {\r\n          expressions.push(currentOperand)\r\n        }\r\n      } else if (isOperator(last)) {\r\n        // Handle case where expressions is ['5', '*', '4', '+']\r\n        expressions.pop()\r\n      }\r\n\r\n      if (explicit) {\r\n        // Automatically close parens when explicitly requesting\r\n        // the total\r\n        let times = openParenStack\r\n\r\n        while (times-- > 0) {\r\n          expressions.push(')')\r\n        }\r\n      } else if (!explicit && openParenStack === 1) {\r\n        // Auto close if there is only one missing paren\r\n        expressions.push(')')\r\n      }\r\n\r\n      try {\r\n        total = evalmath(expressions.join(' '))\r\n\r\n        if (explicit) {\r\n          this.clear()\r\n        }\r\n\r\n        this.total = total\r\n      } catch (err) {\r\n        if (explicit) {\r\n          this.clear()\r\n          this.error = err\r\n          console.log(err)\r\n        }\r\n      }\r\n\r\n      console.log(\r\n        'SHOW_TOTAL; Expressions: \"%s\"; Total: %s; Explicit: %s',\r\n        expressions.join(' '),\r\n        total,\r\n        !!explicit\r\n      )\r\n\r\n      if (explicit) {\r\n        this.$emit('update:total.explicit')\r\n      } else {\r\n        this.$emit('update:total')\r\n      }\r\n\r\n      return total\r\n    },\r\n  },\r\n}\r\n</script>\r\n\r\n<style>\r\n/* // */\r\n/* // -> Design credit goes to Jaroslav Getman */\r\n/* // -> https://dribbble.com/shots/2334270-004-Calculator */\r\n/* // */\r\n\r\n/* @import url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css') */\r\n\r\nhtml {\r\n  --foreground--dark: #151515;\r\n\r\n  --background-gradient-1: #b6b2ab;\r\n  --background-gradient-2: #b3afa7;\r\n\r\n  --background-gradient-3: #b8b5af;\r\n  --background-gradient-4: #78736b;\r\n\r\n  --background-gradient-5: #6f6862;\r\n  --background-gradient-6: #58504b;\r\n\r\n  --background-gradient-7: #5f574e;\r\n  --background-gradient-8: #625a51;\r\n\r\n  /* // I don't know how to get the colors closer here, would need the actual hsla */\r\n  --gradient-blue-1: hsla(226, 12%, 40%, 0.76);\r\n  --gradient-blue-2: hsla(222, 12%, 13%, 0.8);\r\n\r\n  --gradient-orange-1: #ff8d4b;\r\n  --gradient-orange-2: #ff542e;\r\n\r\n  --calculator-width: 260px;\r\n  --header-padding-left: 20px;\r\n  --something-height: 22px;\r\n}\r\n\r\n.Calculator,\r\n.Calculator *,\r\n.Calculator *:before,\r\n.Calculator *:after {\r\n  box-sizing: inherit;\r\n}\r\n\r\n.CalculatorBackground {\r\n  background-size: cover;\r\n  background-repeat: no-repeat;\r\n  background-image: linear-gradient(\r\n    135deg,\r\n    #b6b2ab 0%,\r\n    #b3afa7 25%,\r\n    #b8b5af 25%,\r\n    #78736b 50%,\r\n    #6f6862 50%,\r\n    #58504b 75%,\r\n    #5f574e 75%,\r\n    #625a51 100%\r\n  );\r\n  min-height: 100vh;\r\n}\r\n\r\n.Calculator {\r\n  box-shadow: 12px 18px 45px 0 rgba(0, 0, 0, 0.25);\r\n  cursor: default;\r\n  font-family: Source Sans Pro;\r\n  line-height: 1.5;\r\n  margin: 0 auto;\r\n  position: relative;\r\n  user-select: none;\r\n  width: var(--calculator-width);\r\n  z-index: 1;\r\n}\r\n\r\n.Calculator-header {\r\n  background: white;\r\n  overflow: hidden;\r\n  padding: 20px var(--header-padding-left);\r\n  position: relative;\r\n  text-align: right;\r\n}\r\n\r\n.Calculator-formula {\r\n  color: rgba(158, 158, 158, 0.76);\r\n  display: block;\r\n  float: right;\r\n  font-size: 15px;\r\n  line-height: var(--something-height);\r\n  min-height: var(--something-height);\r\n  position: relative;\r\n  white-space: nowrap;\r\n  width: 100%;\r\n  word-wrap: normal;\r\n}\r\n\r\n.Calculator-formulaList {\r\n  display: block;\r\n  float: right;\r\n}\r\n\r\n/* // \tNot sure how to represent that there are more expressions to the left */\r\n.Calculator__expressionsOverflow {\r\n  /* $width: 2px */\r\n  color: #333;\r\n  box-shadow: 5px 0 20px 4px rgba(0, 0, 0, 0.3);\r\n  font-weight: 700;\r\n  opacity: 0;\r\n  padding-right: 0px;\r\n  text-align: center;\r\n  transition: opacity 0.5s;\r\n  transform: translate(0, -50%);\r\n  /* +position(absolute, 50% null null negative($header-padding-left) - $width - 2) */\r\n  /* +size($width $height - 5) */\r\n}\r\n\r\n.Calculator__expressionsOverflow:before {\r\n  content: '';\r\n}\r\n\r\n.Calculator__expressionsOverflow.is-showing {\r\n  opacity: 1;\r\n}\r\n\r\n.Calculator-operands {\r\n  color: var(--foreground--dark);\r\n  font-size: 60px;\r\n  font-weight: 200;\r\n  line-height: 1.1;\r\n  clear: both;\r\n}\r\n\r\n.Calculator-currentOperand {\r\n  display: block;\r\n  float: right;\r\n  line-height: 60px;\r\n  overflow: visible;\r\n  min-height: 60px;\r\n  transition-duration: 0.2s;\r\n  transition-property: font-size;\r\n}\r\n\r\n.Calculator-currentOperand.has-error {\r\n  color: hsla(10, 85%, 57%, 1);\r\n}\r\n\r\n.Calculator-body {\r\n  background: white;\r\n}\r\n\r\n.Calculator-buttonsContainer {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  overflow: visible;\r\n  position: relative;\r\n}\r\n\r\n.Calculator-buttonsContainer:before {\r\n  background-color: rgba(90, 95, 114, 0.76);\r\n  background-image: linear-gradient(\r\n    to bottom,\r\n    rgba(90, 95, 114, 0.76),\r\n    rgba(29, 32, 37, 0.8)\r\n  );\r\n  box-shadow: 17px 27px 72px 1px rgba(0, 0, 0, 0.3);\r\n  content: '';\r\n  filter: drop-shadow(0px 0px 7px rgba(0, 0, 0, 0.2));\r\n  left: -18px;\r\n  position: absolute;\r\n  right: -18px;\r\n  top: 0;\r\n  bottom: 0;\r\n  /* width: 100%; */\r\n  /* height: 100%; */\r\n}\r\n\r\n.Calculator-button {\r\n  background-color: transparent;\r\n  border: 0;\r\n  color: rgba(255, 255, 255, 0.8);\r\n  cursor: pointer;\r\n  display: flex;\r\n  font-family: Source Sans Pro;\r\n  font-size: 22px;\r\n  font-weight: 300;\r\n  justify-content: center;\r\n  line-height: 70px;\r\n  outline: 0;\r\n  padding: 0;\r\n  position: relative;\r\n  text-align: center;\r\n  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);\r\n  transition: box-shadow 0.2s, background-color 0.15s;\r\n  z-index: 1;\r\n  width: 25%;\r\n}\r\n\r\n.Calculator-button:hover {\r\n  background-color: rgba(0, 0, 0, 0.08);\r\n}\r\n\r\n.Calculator-button.is-active,\r\n.Calculator-button:active {\r\n  box-shadow: inset 0 3px 15px 0 rgba(0, 0, 0, 0.3);\r\n}\r\n\r\n.Calculator-button > span {\r\n  display: block;\r\n}\r\n\r\n.Calculator-button.is-negation,\r\n.Calculator-button.is-modulo {\r\n  font-size: 18px;\r\n}\r\n\r\n.Calculator-button.is-square {\r\n  font-size: 16px;\r\n}\r\n\r\n.Calculator-button.is-division {\r\n  font-size: 20px;\r\n}\r\n\r\n.Calculator-button.is-multiplication svg {\r\n  width: 20px;\r\n}\r\n\r\n.Calculator-button.is-addition svg {\r\n  width: 20px;\r\n}\r\n\r\n.Calculator-button.is-subtraction svg {\r\n  width: 20px;\r\n}\r\n\r\n.Calculator-button.is-paren {\r\n  display: flex;\r\n  font-size: 18px;\r\n  width: 12.5%;\r\n}\r\n\r\n.Calculator-button--paren:hover,\r\n.Calculator-button--paren:active {\r\n  background: initial !important;\r\n  box-shadow: none !important;\r\n  cursor: default !important;\r\n}\r\n\r\n.Calculator-button--paren > span {\r\n  flex: 50%;\r\n}\r\n\r\n.Calculator-equals {\r\n  background-color: transparent;\r\n  border: 0;\r\n  background-image: linear-gradient(to right, #ff8d4b, #ff542e);\r\n  cursor: pointer;\r\n  display: block;\r\n  padding: 26px 0;\r\n  outline: none;\r\n  position: relative;\r\n  width: 100%;\r\n  z-index: -1;\r\n}\r\n\r\n.Calculator-equalsLine {\r\n  background: white;\r\n  box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.4);\r\n  display: block;\r\n  margin: 0 auto 6px;\r\n  width: 20px;\r\n  height: 1px;\r\n}\r\n\r\n.Calculator-equalsLine:last-child {\r\n  margin-bottom: 0;\r\n}\r\n</style>\r\n","\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\r\n/* // */\r\n/* // -> Design credit goes to Jaroslav Getman */\r\n/* // -> https://dribbble.com/shots/2334270-004-Calculator */\r\n/* // */\r\n\r\n/* @import url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css') */\r\n\r\nhtml {\r\n  --foreground--dark: #151515;\r\n\r\n  --background-gradient-1: #b6b2ab;\r\n  --background-gradient-2: #b3afa7;\r\n\r\n  --background-gradient-3: #b8b5af;\r\n  --background-gradient-4: #78736b;\r\n\r\n  --background-gradient-5: #6f6862;\r\n  --background-gradient-6: #58504b;\r\n\r\n  --background-gradient-7: #5f574e;\r\n  --background-gradient-8: #625a51;\r\n\r\n  /* // I don't know how to get the colors closer here, would need the actual hsla */\r\n  --gradient-blue-1: hsla(226, 12%, 40%, 0.76);\r\n  --gradient-blue-2: hsla(222, 12%, 13%, 0.8);\r\n\r\n  --gradient-orange-1: #ff8d4b;\r\n  --gradient-orange-2: #ff542e;\r\n\r\n  --calculator-width: 260px;\r\n  --header-padding-left: 20px;\r\n  --something-height: 22px;\r\n}\r\n\r\n.Calculator,\r\n.Calculator *,\r\n.Calculator *:before,\r\n.Calculator *:after {\r\n  box-sizing: inherit;\r\n}\r\n\r\n.CalculatorBackground {\r\n  background-size: cover;\r\n  background-repeat: no-repeat;\r\n  background-image: linear-gradient(\r\n    135deg,\r\n    #b6b2ab 0%,\r\n    #b3afa7 25%,\r\n    #b8b5af 25%,\r\n    #78736b 50%,\r\n    #6f6862 50%,\r\n    #58504b 75%,\r\n    #5f574e 75%,\r\n    #625a51 100%\r\n  );\r\n  min-height: 100vh;\r\n}\r\n\r\n.Calculator {\r\n  box-shadow: 12px 18px 45px 0 rgba(0, 0, 0, 0.25);\r\n  cursor: default;\r\n  font-family: Source Sans Pro;\r\n  line-height: 1.5;\r\n  margin: 0 auto;\r\n  position: relative;\r\n  user-select: none;\r\n  width: var(--calculator-width);\r\n  z-index: 1;\r\n}\r\n\r\n.Calculator-header {\r\n  background: white;\r\n  overflow: hidden;\r\n  padding: 20px var(--header-padding-left);\r\n  position: relative;\r\n  text-align: right;\r\n}\r\n\r\n.Calculator-formula {\r\n  color: rgba(158, 158, 158, 0.76);\r\n  display: block;\r\n  float: right;\r\n  font-size: 15px;\r\n  line-height: var(--something-height);\r\n  min-height: var(--something-height);\r\n  position: relative;\r\n  white-space: nowrap;\r\n  width: 100%;\r\n  word-wrap: normal;\r\n}\r\n\r\n.Calculator-formulaList {\r\n  display: block;\r\n  float: right;\r\n}\r\n\r\n/* // \tNot sure how to represent that there are more expressions to the left */\r\n.Calculator__expressionsOverflow {\r\n  /* $width: 2px */\r\n  color: #333;\r\n  box-shadow: 5px 0 20px 4px rgba(0, 0, 0, 0.3);\r\n  font-weight: 700;\r\n  opacity: 0;\r\n  padding-right: 0px;\r\n  text-align: center;\r\n  transition: opacity 0.5s;\r\n  transform: translate(0, -50%);\r\n  /* +position(absolute, 50% null null negative($header-padding-left) - $width - 2) */\r\n  /* +size($width $height - 5) */\r\n}\r\n\r\n.Calculator__expressionsOverflow:before {\r\n  content: '';\r\n}\r\n\r\n.Calculator__expressionsOverflow.is-showing {\r\n  opacity: 1;\r\n}\r\n\r\n.Calculator-operands {\r\n  color: var(--foreground--dark);\r\n  font-size: 60px;\r\n  font-weight: 200;\r\n  line-height: 1.1;\r\n  clear: both;\r\n}\r\n\r\n.Calculator-currentOperand {\r\n  display: block;\r\n  float: right;\r\n  line-height: 60px;\r\n  overflow: visible;\r\n  min-height: 60px;\r\n  transition-duration: 0.2s;\r\n  transition-property: font-size;\r\n}\r\n\r\n.Calculator-currentOperand.has-error {\r\n  color: hsla(10, 85%, 57%, 1);\r\n}\r\n\r\n.Calculator-body {\r\n  background: white;\r\n}\r\n\r\n.Calculator-buttonsContainer {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  overflow: visible;\r\n  position: relative;\r\n}\r\n\r\n.Calculator-buttonsContainer:before {\r\n  background-color: rgba(90, 95, 114, 0.76);\r\n  background-image: linear-gradient(\r\n    to bottom,\r\n    rgba(90, 95, 114, 0.76),\r\n    rgba(29, 32, 37, 0.8)\r\n  );\r\n  box-shadow: 17px 27px 72px 1px rgba(0, 0, 0, 0.3);\r\n  content: '';\r\n  filter: drop-shadow(0px 0px 7px rgba(0, 0, 0, 0.2));\r\n  left: -18px;\r\n  position: absolute;\r\n  right: -18px;\r\n  top: 0;\r\n  bottom: 0;\r\n  /* width: 100%; */\r\n  /* height: 100%; */\r\n}\r\n\r\n.Calculator-button {\r\n  background-color: transparent;\r\n  border: 0;\r\n  color: rgba(255, 255, 255, 0.8);\r\n  cursor: pointer;\r\n  display: flex;\r\n  font-family: Source Sans Pro;\r\n  font-size: 22px;\r\n  font-weight: 300;\r\n  justify-content: center;\r\n  line-height: 70px;\r\n  outline: 0;\r\n  padding: 0;\r\n  position: relative;\r\n  text-align: center;\r\n  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);\r\n  transition: box-shadow 0.2s, background-color 0.15s;\r\n  z-index: 1;\r\n  width: 25%;\r\n}\r\n\r\n.Calculator-button:hover {\r\n  background-color: rgba(0, 0, 0, 0.08);\r\n}\r\n\r\n.Calculator-button.is-active,\r\n.Calculator-button:active {\r\n  box-shadow: inset 0 3px 15px 0 rgba(0, 0, 0, 0.3);\r\n}\r\n\r\n.Calculator-button > span {\r\n  display: block;\r\n}\r\n\r\n.Calculator-button.is-negation,\r\n.Calculator-button.is-modulo {\r\n  font-size: 18px;\r\n}\r\n\r\n.Calculator-button.is-square {\r\n  font-size: 16px;\r\n}\r\n\r\n.Calculator-button.is-division {\r\n  font-size: 20px;\r\n}\r\n\r\n.Calculator-button.is-multiplication svg {\r\n  width: 20px;\r\n}\r\n\r\n.Calculator-button.is-addition svg {\r\n  width: 20px;\r\n}\r\n\r\n.Calculator-button.is-subtraction svg {\r\n  width: 20px;\r\n}\r\n\r\n.Calculator-button.is-paren {\r\n  display: flex;\r\n  font-size: 18px;\r\n  width: 12.5%;\r\n}\r\n\r\n.Calculator-button--paren:hover,\r\n.Calculator-button--paren:active {\r\n  background: initial !important;\r\n  box-shadow: none !important;\r\n  cursor: default !important;\r\n}\r\n\r\n.Calculator-button--paren > span {\r\n  flex: 50%;\r\n}\r\n\r\n.Calculator-equals {\r\n  background-color: transparent;\r\n  border: 0;\r\n  background-image: linear-gradient(to right, #ff8d4b, #ff542e);\r\n  cursor: pointer;\r\n  display: block;\r\n  padding: 26px 0;\r\n  outline: none;\r\n  position: relative;\r\n  width: 100%;\r\n  z-index: -1;\r\n}\r\n\r\n.Calculator-equalsLine {\r\n  background: white;\r\n  box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.4);\r\n  display: block;\r\n  margin: 0 auto 6px;\r\n  width: 20px;\r\n  height: 1px;\r\n}\r\n\r\n.Calculator-equalsLine:last-child {\r\n  margin-bottom: 0;\r\n}\r\n"]}, media: undefined });

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
