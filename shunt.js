/*!
 * JavaScript Shunting-yard
 * Copyright 2012 - droptable <murdoc@raidrush.org>
 *
 * ---------------------------------------------------------------- 
 *
 * Permission is hereby granted, free of charge, to any person obtaining a 
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without 
 * limitation the rights to use, copy, modify, merge, publish, distribute, 
 * sublicense, and/or sell copies of the Software, and to permit persons to 
 * whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * <http://opensource.org/licenses/mit-license.php>
 */

(function(fn) {
  if (typeof define === 'function' && define.amd)
    define('shuntjs', fn);
  else if (typeof module !== 'undefined')
    module.exports = fn();
  else
    window.Shunt = fn();
})(function(undefined) { 
  'use strict';
  
  // ----------------------------------------
  // tokens
  var T_NUMBER      = 1,  // number
      T_IDENT       = 2,  // ident (constant)
      T_FUNCTION    = 4,  // function
      T_POPEN       = 8,  // (
      T_PCLOSE      = 16, // )
      T_COMMA       = 32, // ,
      T_OPERATOR    = 64, // operator
      T_PLUS        = 65, // +
      T_MINUS       = 66, // -
      T_TIMES       = 67, // * 
      T_DIV         = 68, // /
      T_MOD         = 69, // %
      T_POW         = 70, // ^
      T_UNARY_PLUS  = 71, // unary +
      T_UNARY_MINUS = 72, // unary -
      T_NOT         = 73, // unary ! (convert (n > 0 || n < 0) to 0 and 0 to 1)
      T_SQRT        = 74; // unary √
  
  // ----------------------------------------
  // token
  function Token(value, type) {
    this.value = value;
    this.type  = type;
  }
  
  Token.prototype = {
    constructor: Token,
    
    // if token is a function:
    // save argument-count
    argc: 0
  };
  
  // ----------------------------------------
  // stack
  function Stack() {
    this.index = -1;
  }
  
  Stack.prototype = {
    constructor: Stack,
    
    length: 0,
    
    push:    Array.prototype.push,
    pop:     Array.prototype.pop,
    shift:   Array.prototype.shift,
    unshift: Array.prototype.unshift,
    
    first: function first() {
      // this is actualy faster than checking "this.length" everytime.
      // is looks like common jitter are able to optimize 
      // array out-of-bounds checks very very well :-)
      return this[0];
    },
    
    last: function last() {
      // yada yada yada see comment in .first() :-)
      return this[this.length - 1];
    },
    
    peek: function peek() {
      // yada yada yada see comment in .first() :-)
      return this[this.index + 1];
    },
    
    next: function next() {
      // yada yada yada see comment in .first() :-)
      return this[++this.index];
    },
    
    prev: function prev() {
      // yada yada yada see comment in .first() :-)
      return this[--this.index];
    }
  };
  
  // ----------------------------------------
  // context
  function Context() {
    this.fnt = {};               // function-table | use Map?
    this.cst = { 'π': Math.PI }; // constant-table | use Map?
  }
  
  Context.prototype = {
    constructor: Context,
    
    fn: function fn(name, args) {
      if (typeof this.fnt[name] !== 'function')
        throw new Error('runtime error: function "' + name + '" is not defined');
      
      var fnc = this.fnt[name];
      return fnc.apply(fnc, args);
    },
    
    cs: function cs(name) {
      if (typeof this.cst[name] === 'undefined')
        throw new Error('runtime error: constant "' + name + '" is not defined');
      
      return this.cst[name];
    },
    
    def: function def(name, value) {
      if (typeof value === 'undefined' && typeof Math[name] === 'function')
        value = Math[name].bind(Math);
      
      if (typeof value === 'function')
        this.fnt[name] = value;
      
      else if (typeof value === 'number')
        this.cst[name] = value;
      
      else throw new Error('function or number expected');
      
      return this;
    }
  };
  
  // ----------------------------------------
  // scanner
  var RE_PATTERN = /^([√!,\+\-\*\/\^%\(\)]|(?:\d*\.\d+|\d+\.\d*|\d+)(?:[eE][+-]?\d+)?|[a-z_A-Zπ]+[a-z_A-Z0-9]*|[ \t]+)/;
      
  function Scanner(term) {
    this.tokens = new Stack;
    
    var prev = { type: T_OPERATOR }; // dummy
    var match, token, type;
    
    while (term.length) {
      if (!(match = term.match(RE_PATTERN)))
        throw new Error('syntax error: near `' + term.substr(0, 10) + '``');
      
      if ((token = match[1]).length === 0) 
        throw new Error('syntax error: empty token matched. abort');
      
      term = term.substr(token.length);
      
      if ((token = token.trim()).length === 0)
        continue; // whitespace
      
      if (!isNaN(token)) {
        this.tokens.push(prev = new Token(parseFloat(token), T_NUMBER));
        continue;
      }
      
      switch (type = this.lookup[token] || T_IDENT) {          
        case T_PLUS:
          if (prev.type & T_OPERATOR || prev.type === T_POPEN) type = T_UNARY_PLUS;
          break;
          
        case T_MINUS:
          if (prev.type & T_OPERATOR || prev.type === T_POPEN) type = T_UNARY_MINUS;
          break;
          
        case T_POPEN:
          switch (prev.type) {
            case T_IDENT:
              prev.type = T_FUNCTION;
              break;
              
            case T_NUMBER:
            case T_PCLOSE:
              this.tokens.push(new Token('*', T_TIMES));
              break;
          }
          
          break;
      }
      
      this.tokens.push(prev = new Token(token, type));
    }
  }
  
  Scanner.prototype = {
    constructor: Scanner,
    
    lookup: {
      '+': T_PLUS,
      '-': T_MINUS,
      '*': T_TIMES,
      '/': T_DIV,
      '%': T_MOD,
      '^': T_POW,
      '(': T_POPEN,
      ')': T_PCLOSE,
      ',': T_COMMA,
      '!': T_NOT,
      'π': T_IDENT,
      '√': T_SQRT
    },
    
    prev: function prev() { return this.tokens.prev(); },
    next: function next() { return this.tokens.next(); },
    peek: function peek() { return this.tokens.peek(); }
  };
  
  // ----------------------------------------
  // parser
  
  function Parser(scanner) {
    this.scanner = scanner;
    
    this.queue = new Stack;
    this.stack = new Stack;
    
    var token;
    
    while ((token = this.scanner.next()) !== undefined)
      this.handle(token);
    
    while ((token = this.stack.pop()) !== undefined) {
      if (token.type === T_POPEN || token.type === T_PCLOSE)
        throw new Error('parse error: unmatched parentheses');
      
      this.queue.push(token);
    }
  }
  
  Parser.parse = function parse(term, ctx) {
    if (typeof ctx === 'undefined')
      ctx = new Context;
    
    return new Parser(new Scanner(term)).reduce(ctx);
  };
  
  Parser.prototype = {
    constructor: Parser,
    
    reduce: function reduce(ctx) {
      this.stack = new Stack;
      var len = 0, token;
      
      // While there are input tokens left
      // Read the next token from input.
      while ((token = this.queue.shift()) !== undefined) {
        switch (token.type) {
          case T_NUMBER:
          case T_IDENT:
            // evaluate constant
            if (token.type === T_IDENT)
              token = new Token(ctx.cs(token.value), T_NUMBER);
            
            // If the token is a value or identifier
            // Push it onto the stack.
            this.stack.push(token);
            ++len;
            break;
            
          case T_PLUS:
          case T_MINUS:
          case T_UNARY_PLUS:
          case T_UNARY_MINUS:
          case T_TIMES:
          case T_DIV:
          case T_MOD:
          case T_POW:
          case T_NOT:
          case T_SQRT:
            // It is known a priori that the operator takes n arguments.
            var argc = this.argc(token);
            
            // If there are fewer than n values on the stack
            if (len < argc)
              throw new Error('runtime error: too few arguments for operator `' + token.value + '`');
            
            var rhs = this.stack.pop(),
                lhs = null;
            
            if (argc === 2) lhs = this.stack.pop();              
            len -= (argc - 1);
            
            // Push the returned results, if any, back onto the stack.
            this.stack.push(new Token(this.op(token.type, lhs, rhs), T_NUMBER));
            break;
            
          case T_FUNCTION:
            // function
            var argc = token.argc,
                argv = [];
            
            len -= (argc - 1);
            
            for (; argc > 0; --argc)
              argv.unshift(this.stack.pop().value);
            
            // Push the returned results, if any, back onto the stack.
            this.stack.push(new Token(ctx.fn(token.value, argv), T_NUMBER));
            break;
              
          default:
            throw new Error('runtime error: unexpected token "' + token.value + '"');
        }
      }
      
      // If there is only one value in the stack
      // That value is the result of the calculation.
      if (this.stack.length === 1)
        return this.stack.pop().value;
      
      // If there are more values in the stack
      // (Error) The user input has too many values.
      throw new Error('runtime error: too many values');
    },
    
    op: function op(type, lhs, rhs) {
      if (lhs !== null) {
        switch (type) {
          case T_PLUS:
            return lhs.value + rhs.value;
            
          case T_MINUS:
            return lhs.value - rhs.value;
            
          case T_TIMES:
            return lhs.value * rhs.value;
            
          case T_DIV:
            if (rhs.value === 0.) 
              throw new Error('runtime error: division by zero');
            
            return lhs.value / rhs.value;
            
          case T_MOD:
            if (rhs.value === 0.)
              throw new Error('runtime error: modulo division by zero');
            
            return lhs.value % rhs.value;
            
          case T_POW:
            return Math.pow(lhs.value, rhs.value);
        }
        
        // throw?
        return 0.;
      }
      
      switch (type) {
        case T_NOT:
          return !rhs.value;
          
        case T_UNARY_MINUS:
          return -rhs.value;
          
        case T_UNARY_PLUS:
          return +rhs.value;
          
        case T_SQRT:
          return Math.sqrt(rhs.value);
      }
      
      // throw?
      return 0.;
    },
    
    argc: function argc(token) {
      switch (token.type) {
        case T_PLUS:
        case T_MINUS:
        case T_TIMES:
        case T_DIV:
        case T_MOD:
        case T_POW:
          return 2;
      }
      
      return 1;
    },
    
    fargs: function fargs(fn) {
      this.handle(this.scanner.next()); // '('
        
      var argc = 0,
          next = this.scanner.peek();
      
      if (next !== undefined && next.type !== T_PCLOSE) {
        argc = 1;
        
        while ((next = this.scanner.next()) !== undefined) {
          this.handle(next);
          
          if (next.type === T_PCLOSE)
            break;
          
          if (next.type === T_COMMA)
            ++argc;
        }
      }
      
      fn.argc = argc;
    },
    
    handle: function handle(token) {
      switch (token.type) {
        case T_NUMBER:
        case T_IDENT:
          // If the token is a number (identifier), then add it to the output queue.        
          this.queue.push(token);
          break;
          
        case T_FUNCTION:
          // If the token is a function token, then push it onto the stack.
          this.stack.push(token);
          this.fargs(token);
          break;
          
          
        case T_COMMA:
          // If the token is a function argument separator (e.g., a comma):
          var pe = false;
          
          while ((token = this.stack.last()) !== undefined) {
            if (token.type === T_POPEN) {
              pe = true;
              break;
            }
            
            // Until the token at the top of the stack is a left parenthesis,
            // pop operators off the stack onto the output queue.
            this.queue.push(this.stack.pop());
          }
          
          // If no left parentheses are encountered, either the separator was misplaced
          // or parentheses were mismatched.
          if (pe !== true)
            throw new Error('parser error: misplaced `,` or unmatched parentheses');
              
          break;
          
        // If the token is an operator, op1, then:
        case T_PLUS:
        case T_MINUS:
        case T_UNARY_PLUS:
        case T_UNARY_MINUS: 
        case T_TIMES:
        case T_DIV:
        case T_MOD:
        case T_POW:
        case T_NOT:
        case T_SQRT:
          var token2;
          
          both: while ((token2 = this.stack.last()) !== undefined) {
            // While there is an operator token, o2, at the top of the stack
            // op1 is left-associative and its precedence is less than or equal to that of op2,
            // or op1 has precedence less than that of op2,
            // Let + and ^ be right associative.
            // Correct transformation from 1^2+3 is 12^3+
            // The differing operator priority decides pop / push
            // If 2 operators have equal priority then associativity decides.
            switch (token2.type) {
              default: break both;
                
              case T_PLUS:
              case T_MINUS:
              case T_UNARY_PLUS:
              case T_UNARY_MINUS:
              case T_TIMES:
              case T_DIV:
              case T_MOD:
              case T_POW:
              case T_NOT:
              case T_SQRT:
                var p1 = this.preced(token),
                    p2 = this.preced(token2);
                
                if (!((this.assoc(token) === 1 && (p1 <= p2)) || (p1 < p2)))
                  break both;
                  
                // Pop o2 off the stack, onto the output queue;
                this.queue.push(this.stack.pop());
            }
          }
          
          // push op1 onto the stack.
          this.stack.push(token);
          break;
          
        case T_POPEN:
          // If the token is a left parenthesis, then push it onto the stack.
          this.stack.push(token);
          break;
          
        // If the token is a right parenthesis:  
        case T_PCLOSE:
          var pe = false;
          
          // Until the token at the top of the stack is a left parenthesis,
          // pop operators off the stack onto the output queue
          while ((token = this.stack.pop()) !== undefined) {
            if (token.type === T_POPEN) {
              // Pop the left parenthesis from the stack, but not onto the output queue.
              pe = true;
              break;
            }
            
            this.queue.push(token);
          }
          
          // If the stack runs out without finding a left parenthesis, then there are mismatched parentheses.
          if (pe !== true)
            throw new Error('parse error: unmatched parentheses');
          
          // If the token at the top of the stack is a function token, pop it onto the output queue.
          if ((token = this.stack.last()) !== undefined && token.type === T_FUNCTION)
            this.queue.push(this.stack.pop());
           
          break;
          
        default:
          throw new Error('parse error: unknown token "' + token.value + '"');     
      }
    },
    
    assoc: function assoc(token) {
      switch (token.type) {
        case T_TIMES:
        case T_DIV:
        case T_MOD:
        
        case T_PLUS:
        case T_MINUS:
          return 1; //ltr
        
        case T_NOT:  
        case T_UNARY_PLUS:
        case T_UNARY_MINUS:
              
        case T_POW: 
        case T_SQRT: 
          return 2; //rtl
      }
      
      return 0; //nassoc
    },
  
    preced: function preced(token) {
      switch (token.type) {
        case T_NOT:
        case T_UNARY_PLUS:
        case T_UNARY_MINUS:
          return 4;
          
        case T_POW:
        case T_SQRT:
          return 3;
          
        case T_TIMES:
        case T_DIV:
        case T_MOD:
          return 2;
          
        case T_PLUS:
        case T_MINUS:
          return 1;
      }
      
      return 0;
    }
  };
  
  // ----------------------------------------
  // exports
  
  return {
    Stack:         Stack,
    Token:         Token,
    Parser:        Parser,
    Scanner:       Scanner,
    Context:       Context,
    
    // alias
    parse: Parser.parse.bind(Parser)
  };
});
