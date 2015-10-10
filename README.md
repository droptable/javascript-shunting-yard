# MIT Licence

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# How it works

#### Basic Parsing of expressions using `Shunt.parse()`

    var exp = '1+2*3/4^5%6',
        res = Shunt.parse(exp); // Number(1.005859375);

#### Creating a context in which you can define variables and functions for use in expressions using `Shunt.Context()`

    // using a context for functions and constants
    var ctx = new Shunt.Context();
    ctx.def('abs');                                   // wraps `Math.abs`
    // create a variable
    ctx.def('foo', 1.5);                              // defines constant `foo`
    // functions take parameters as you'd expect
    ctx.def('bar', function(a, b) { return a * b; }); // defines function `bar`

#### You can parse an expression in the context you created, making use of the variables and functions

    var exp2 = 'foo + bar(2 + 4, abs(-1000))',
        res2 = Shunt.parse(exp2, ctx); // Number(6001.5);
