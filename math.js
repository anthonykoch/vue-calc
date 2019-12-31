"use strict";

/**
 * LEXER AND PARSER for mathematical expressions. The lexer is hand written with influences from Stylus's lexer, but the parser was mostly taken from elsewhere, which is listed in the description for the Parser constructor.
 */

const TYPE_NUMBER_LITERAL = (exports.TYPE_NUMBER_LITERAL = "NUMBER_LITERAL");

/**
 * A lexer, inspired by Stylus's lexer.
 * @constructor
 * @param {String} options.data
 */
const Lexer = (exports.Lexer = function Lexer({ data }) {
  this.input = String(data);
  this.position = 0;
  this.char = this.input[this.position];
  this.tokens = [];
  this.stash = [];
});

const operators = (exports.operators = ["/", "*", "**", "-", "+", "√", "%"]);

const longestOperatorLength = operators.reduce(function(length, item) {
  if (item.length > length) {
    return item.length;
  }

  return length;
}, 0);

const RE_DIGIT = /[0-9]/;
const RE_PAREN = /[()]/;
const RE_WHITESPACE = /\s/;
const RE_OPERATOR_START = new RegExp(
  Array.from(new Set(operators.map(str => str[0])))
    .map(str => escapeRegExp(str))
    .join("|")
);

// All the operators, sorted by longest string length
const RE_OPERATOR_WHOLE = new RegExp(
  Array.from(operators)
    .sort((a, b) => b.length - a.length)
    .map(str => escapeRegExp(str))
    .join("|")
);

/**
 * Courtesy of
 * http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param  {String} str
 * @return {String}
 */
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function isDigit(char) {
  return RE_DIGIT.test(char);
}

function isOperatorStart(char) {
  return RE_OPERATOR_START.test(char);
}

function isParen(char) {
  return RE_PAREN.test(char);
}

function isWhitespace(char) {
  return RE_WHITESPACE.test(char);
}

function isDot(value) {
  return value === ".";
}

Object.assign(Lexer.prototype, {
  /**
   * Moves the lexer's current character to the next character in the input.
   * Returns '\x00' if the position is passed the input
   * @private
   * @return {String}
   */
  advance() {
    return (this.char = this.input[++this.position] || "\x04");
  },

  /**
   * Looks ahead into the token stream by the index passed. The tokens
   * are cached for performance.
   * @public
   * @param  {Number} index
   * @return {void}
   */
  lookahead(index) {
    let times = index - this.stash.length;

    if (this.position > this.input.length) {
      return "\x04";
    }

    while (times-- > 0) {
      let token = this.lex();

      while (token === "\x00") {
        token = this.lex();
      }

      this.stash.push(token);
    }

    return this.stash[index - 1];
  },

  /**
   * Looks into the token stream one token ahead
   * @public
   * @return {String}
   */
  peek() {
    return this.lookahead(1);
  },

  getNextChar() {
    return this.input[this.position + 1];
  },

  getPreviousChar() {
    return this.input[this.position - 1];
  },

  /**
   * Returns the next token in the token stream
   * @public
   * @return {String}
   */
  next() {
    let token;

    if (this.position > this.input.length) {
      return "\x04";
    }

    while (true) {
      if (this.stash.length) {
        return this.stash.shift();
      }

      token = this.lex();

      if (token !== "\x00") {
        return token;
      }
    }

    throw new Error("wtf this should be unreachable: lexer.next");
  },

  /**
   * Moves the lexer's position the specified length
   * @private
   * @param  {Number} times
   * @return {void}
   */
  skip(length) {
    this.position += length;
    this.char = this.input[this.position];
  },

  /**
   * Stores the most recently found literal
   * @private
   * @param {void} literal
   */
  setLiteral(literal) {
    this.currentLiteral = literal;
  },

  /**
   * Returns the most recently lexed literal. Always returns the value as a string.
   * @public
   * @return {String}
   */
  getLiteral() {
    return this.currentLiteral;
  },

  /**
   * Returns the next token from the lexer's input.
   * Returns null when there are no more tokens to be consumed
   * @private
   * @return {String|null}
   */
  lex() {
    if (this.position >= this.input.length) {
      return "\x04";
    }

    if (isWhitespace(this.char)) {
      this.advance();
      return "\x00";
    }

    const token =
      this.getParenToken() || this.getNumberToken() || this.getOperatorToken();

    if (token === null || token === undefined) {
      throw new Error(
        `Unrecognized token "${this.char}" at position ${this.position}`
      );
    }

    return token;
  },

  /**
   * Returns a paren punctuation character
   * @return {String|null}
   */
  getParenToken() {
    const char = this.char;

    if (isParen(this.char)) {
      this.advance();
      return char;
    }

    return null;
  },

  /**
   * Returns constant TYPE_NUMBER_LITERAL if number is found
   * @return {String|null}
   */
  getNumberToken() {
    let numberLiteral = this.char;

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
        } while (isDigit(this.advance()));
      }
    } else {
      return null;
    }

    this.setLiteral(numberLiteral);

    if (numberLiteral.length) {
      return TYPE_NUMBER_LITERAL;
    } else {
      return null;
    }
  },

  /**
   * Returns operator punctuation character
   * @return {String|null}
   */
  getOperatorToken() {
    const char = this.char;

    if (isOperatorStart(this.char)) {
      const substr = this.input.substring(
        this.position,
        this.position + longestOperatorLength
      );
      const match = substr.match(RE_OPERATOR_WHOLE);

      if (!match) {
        throw new Error("wtf dooood there was not a opeator token found...");
      }

      let length = match[0].length;

      while (length-- > 0) {
        this.advance();
      }

      return match[0];
    }

    return null;
  }
});

/**
 * Recursive descent parser modified from
 * https://github.com/mattgoldspink/tapdigit/blob/master/TapDigit.js#L448

	Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
	Copyright (C) 2010 Ariya Hidayat <ariya.hidayat@gmail.com>
	All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

	2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * This version adds support for exponents and nth root via the '**' and '√' operators
 *
 * Note: This throw errors when passed a lexer that is parsing an empty string
 * @constructor
 * @param {Lexer} options.lexer
 */
const Parser = (exports.Parser = function Parser({ lexer }) {
  this.lexer = lexer;
  this.position = 0;
});

Object.assign(Parser.prototype, {
  parsePrimary() {
    let token = this.lexer.peek();
    let expression;

    if (token === "\x00") {
      console.log("WTF NULL STRING TOKEN", token);
      throw new Error("Unexpected end of expression");
    }

    if (token === "(") {
      token = this.lexer.next();
      expression = this.parseExpression();
      token = this.lexer.next();

      if (token !== ")") {
        throw new SyntaxError(`Expected ")", got ${token}`);
      }

      return {
        type: "Expression",
        expression: expression
      };
    }

    if (token === TYPE_NUMBER_LITERAL) {
      token = this.lexer.next();
      return {
        type: "NumberLiteral",
        value: this.lexer.getLiteral()
      };
    }

    throw new SyntaxError("expected a number, a variable, or parentheses");
  },

  parseUnary() {
    let token = this.lexer.peek();

    if (token === "-" || token === "+") {
      token = this.lexer.next();
      return {
        type: "UnaryExpression",
        operator: token,
        expression: this.parseUnary()
      };
    }

    return this.parsePrimary();
  },

  // I'm not sure what these pow and nth square root operators are classified as
  parsePowAndSquare() {
    let expression = this.parseUnary();
    let token = this.lexer.peek();

    while (token === "**" || token == "√") {
      token = this.lexer.next();
      expression = {
        type: "BinaryExpression",
        operator: token,
        left: expression,
        right: this.parseUnary()
      };
      token = this.lexer.peek();
    }

    return expression;
  },

  parseMultiplicative() {
    let expression = this.parsePowAndSquare();
    let token = this.lexer.peek();

    while (token === "*" || token == "/" || token === "%") {
      token = this.lexer.next();
      expression = {
        type: "BinaryExpression",
        operator: token,
        left: expression,
        right: this.parsePowAndSquare()
      };
      token = this.lexer.peek();
    }

    return expression;
  },

  parseAdditive() {
    let expression = this.parseMultiplicative();
    let token = this.lexer.peek();

    while (token === "+" || token === "-") {
      const operator = token;
      token = this.lexer.next();
      expression = {
        type: "BinaryExpression",
        operator: token,
        left: expression,
        right: this.parseMultiplicative()
      };
      token = this.lexer.peek();
    }

    return expression;
  },

  parseExpression() {
    return this.parseAdditive();
  },

  parse: function() {
    const { lexer } = this;
    const expression = this.parseExpression();

    return {
      type: "ExpressionStatement",
      expression: expression
    };
  }
});

const operations = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  "%": (a, b) => a % b,
  "**": (a, b) => Math.pow(a, b),
  // NOTE: Apparently this is a naive implementation of nth root
  // http://stackoverflow.com/questions/7308627/javascript-calculate-the-nth-root-of-a-number
  "√": (a, b) => Math.pow(a, 1 / b)
};

/**
 * Evaluates the AST produced from the parser and returns its result
 * @return {Number}
 */
const evaluateAST = (exports.evaluateAST = function evaluateAST(node) {
  let e;
  let a;
  let b;

  switch (node.type) {
    case "ExpressionStatement":
      return evaluateAST(node.expression);
    case "Expression":
      return evaluateAST(node.expression);
    case "NumberLiteral":
      return parseFloat(node.value);
    case "UnaryExpression":
      a = evaluateAST(node.expression);

      switch (node.operator) {
        case "+":
          return +a;
        case "-":
          return -a;
        default:
          throw new Error(
            `Parsing error: Unrecognized unary operator "${node.operator}"`
          );
      }
    case "BinaryExpression":
      let { left, right, operator } = node;
      const operation = operations[operator];

      if (operation === undefined) {
        throw new Error("Unsupported operand");
      }

      return operation(evaluateAST(left), evaluateAST(right));
    default:
      throw new Error(`Parsing error: Unrecognized node type "${node.type}"`);
  }
});

/**
 * Evaluates the expression passed and returns its result.
 * Note: Empty strings will cause the parser to throw an error.
 * Note: This throw errors when passed a lexer that is parsing an empty string
 * @constructor
 * @return {Number}
 */
const MathParser = (exports.MathParser = {
  eval(expression) {
    return evaluateAST(
      new Parser({
        lexer: new Lexer({ data: expression })
      }).parse()
    );
  }
});
