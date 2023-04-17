import * as ohm from 'ohm-js';
import {test} from 'uvu';
import * as assert from 'uvu/assert';

import {createModeFactory} from '../src/ohmMode.js';

class FakeStream {
  constructor(str) {
    this.string = str;
    this.pos = 0;
  }

  next() {
    if (this.pos < this.string.length) {
      return this.string.charAt(this.pos++);
    }
  }

  skipToEnd() {
    this.pos = this.string.length;
  }

  match(str) {
    if (this.string.slice(this.pos).startsWith(str)) {
      this.pos += str.length;
      return str;
    }
  }

  eol() {
    return this.pos >= this.string.length;
  }
}

function tokenizeLine(tokenFn, stream, state) {
  const tokenTypes = [];
  while (!stream.eol()) {
    tokenTypes.push(tokenFn(stream, state));
  }
  return tokenTypes;
}

function simpleTokenize(str) {
  const {token, startState} = createModeFactory(ohm)();
  const stream = new FakeStream(str);
  return tokenizeLine(token, stream, startState());
}

test('basic token types', () => {
  // As defined in ohm-grammar.ohm:
  //   token = caseName | comment | ident | operator | punctuation | terminal | any
  const tokens = simpleTokenize('r(desc)/**/=r2<r3>"a".."z"+--caseName//');
  assert.equal(tokens, [
    'ruleDef',
    'meta',
    'comment',
    'operator', // =
    'variable', // r2
    'punctuation', // <
    'variable', // r3
    'punctuation', // >
    'string', // "a"
    'operator', // ..
    'string', // "z"
    'operator', // "+"
    'caseName',
    'comment',
  ]);
});

test('single-line rule defintions', () => {
  let tokens = simpleTokenize('r<a>=a');
  assert.equal(tokens, [
    'ruleDef',
    'punctuation',
    'variable',
    'punctuation',
    'operator',
    'variable',
  ]);

  tokens = simpleTokenize('myRule<a,b>(a desc)=a');
  assert.equal(tokens, [
    'ruleDef',
    'punctuation',
    'variable',
    'punctuation',
    'variable',
    'punctuation',
    'meta',
    'operator',
    'variable',
  ]);
});

test('multi-line comments', () => {
  const {token, startState} = createModeFactory(ohm)();
  const state = startState();

  let tokens = tokenizeLine(token, new FakeStream('""/*'), state);
  assert.equal(tokens, ['string', 'comment']);
  assert.is(state.insideComment, true);

  tokens = tokenizeLine(token, new FakeStream('blah'), state);
  assert.equal(tokens, ['comment']);

  tokens = tokenizeLine(token, new FakeStream('*/""'), state);
  assert.equal(tokens, ['comment', 'string']);
});

test('open strings', () => {
  const tokens = simpleTokenize('x="hell');
  assert.equal(tokens, ['ruleDef', 'operator', 'string']);
});

test.skip('rule descriptions', () => {
  const tokens = simpleTokenize('x=(y)+');
  assert.equal(tokens, [
    'ruleDef',
    'operator',
    'punctuation',
    'variable',
    'punctuation',
    'operator',
  ]);
});

test.skip('multi-line rule definitions', () => {
  const {token, startState} = createModeFactory(ohm)();
  const state = startState();

  // TODO: Support lookAhead in FakeStream
  const tokens = tokenizeLine(
    token,
    new FakeStream('myRule(so amazing)', '='),
    state
  );
  assert.equal(tokens, ['ruleDef', 'meta']);
});

test.run();
