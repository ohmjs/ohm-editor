/*   token = caseName | comment | ident | operator | punctuation | terminal | any */

const grammarDef = String.raw`
  OhmTokens <: Ohm {
    token +=
      | def
      | grammarDef
      | strictRuleDescr
      | multiLineRuleStart
      | whitespace
      | multiLineCommentStart
      | terminalStart
      | lenientCaseName

    def = ident &applySyntactic<DefAfterIdent>
    grammarDef = ident &(spaces "{")

    // Recognize a partial definition, for two cases:
    // 1. The user is just starting to type it
    // 2. The alternation begins on the next line.
    DefAfterIdent =
      | Formals? ruleDescr? "="  -- define
      | Formals? ":="  -- override
      | Formals? "+="  -- extend

    // Since this can only appear as part of a rule definition, we don't need
    // to explicitly handle the multi-line case here -- we get it for free.
    strictRuleDescr = ruleDescr &(spaces "=")

    // Another case for a partial definition: the operator ('=', ':=', etc.)
    // appears on the next line. Without additional context, this may not
    // be distinguishable from a rule application at the end of a rule body.
    multiLineRuleStart = ident &applySyntactic<MultiLineRuleAfterIdent>

    MultiLineRuleAfterIdent = Formals? ruleDescr? &end

    // These rules are needed due to the line-oriented and incremental
    // nature of CodeMirror syntax highlighting.
    multiLineCommentStart = ~comment_multiLine "/*" any*
    terminalStart = ~terminal "\"" terminalChar*
    lenientCaseName = "--" whitespace? name

    // TODO: Move this into the main grammar (?)
    operator += "..." | ".." | "|" | "#"
    punctuation += "(" | ")" | "{" | "}"

    whitespace = (~comment space)+
  }
`;

// CodeMirror modes are defined by a "mode factory". To avoid depending on the
// `ohm` global, we require it to be passed in here, making this a "factory
// factory" :D
export function createModeFactory(ohm) {
  const grammar = ohm.grammar(grammarDef, {Ohm: ohm.ohmGrammar});

  const tok = (wrapper, tokenType) => ({
    tokenType,
    rule: wrapper.ctorName,
    contents: wrapper.sourceString,
  });

  const semantics = grammar.createSemantics().addOperation('tokens', {
    tokens(tokenIter) {
      return tokenIter.children.map(c => c.tokens());
    },
    def(ident, _) {
      return tok(this, 'ruleDef');
    },
    grammarDef(ident, _, _open) {
      return tok(this, 'grammarDef');
    },
    strictRuleDescr(ruleDesc, _, _eq) {
      return tok(this, 'meta');
    },
    multiLineRuleStart(ident, rest) {
      // This is not *really* a rule start, but a trailing rule application.
      return tok(this, 'variable');
    },
    whitespace(spaceIter) {
      return tok(this, null);
    },
    multiLineCommentStart(_, _ch) {
      return tok(this, 'comment');
    },
    terminalStart(_, _ch) {
      return tok(this, 'string');
    },
    lenientCaseName(_, _ws, name) {
      return tok(this, 'caseName');
    },
    comment_singleLine(_open, anyIter, _close) {
      return tok(this, 'comment');
    },
    comment_multiLine(_open, anyIter, _close) {
      return tok(this, 'comment');
    },
    ident(name) {
      return tok(this, 'variable');
    },
    operator(_) {
      return tok(this, 'operator');
    },
    punctuation(term) {
      return tok(this, 'punctuation');
    },
    terminal(_open, charIter, _close) {
      return tok(this, 'string');
    },
    any(_) {
      return tok(this, null);
    },
  });

  const getTokens = input => {
    const matchResult = grammar.match(input, 'tokens');
    // In general, this should never fail.
    if (matchResult.failed()) {
      console.error(matchResult.message); // eslint-disable-line no-console
    }
    return semantics(matchResult).tokens();
  };

  const withTokenPos = tokens => {
    let pos = 0;
    return tokens.map(t => {
      const startPos = pos;
      pos += t.contents.length;
      return [startPos, t];
    });
  };

  const handleMultiLineRuleStart = (input, nextLine) => {
    const tokens = [];
    for (const [pos, tok] of withTokenPos(getTokens(input + nextLine))) {
      if (pos > input.length) break;
      tokens.push(tok);
    }
    return tokens;
  };

  const maybeHandleMultiLineRuleStart = (input, tokens, getNextLine) => {
    // Find the first token that's not whitespace or a comment.
    // If it's a multiLineRuleStart, then re-parse with the contents of the
    // next line included.
    const firstRealToken = tokens.find(
      ({tokenType}) => ![null, 'comment'].includes(tokenType)
    );
    if (firstRealToken?.rule === 'multiLineRuleStart') {
      return handleMultiLineRuleStart(input, getNextLine());
    }
    return tokens;
  };

  const handleComment = (stream, state) => {
    while (!stream.eol()) {
      if (stream.match('*/')) {
        state.insideComment = false;
        break;
      }
      stream.next();
    }
    return 'comment';
  };

  const token = (stream, state) => {
    if (state.insideComment) {
      return handleComment(stream, state);
    }

    // This function is called repeatedly to get successive tokens from a
    // single line in the input stream. Since matching token by token isn't
    // easily done with Ohm, tokenze the whole line whenever the first token
    // is required.
    if (stream.string !== state.input) {
      state.input = stream.string;

      // We need to start parsing at `stream.pos` because the comment handling
      // may have already consumed some characters on this line.
      const input = state.input.slice(stream.pos);

      const initialTokens = getTokens(input);
      state.tokens = maybeHandleMultiLineRuleStart(input, initialTokens, () =>
        stream.lookAhead(1)
      );
    }
    if (!state.tokens || state.tokens.length === 0) {
      stream.skipToEnd();
      return null;
    }
    // Grab the next token and advance the stream.
    const {tokenType, contents, rule} = state.tokens.shift();
    if (!stream.match(contents)) {
      // This should not happen!
      throw new Error(
        `failed to match ${JSON.stringify(contents)} at ${stream.pos}`
      );
    }
    if (rule === 'multiLineCommentStart') {
      state.insideComment = true;
      return 'comment';
    }

    return tokenType;
  };

  // Implement CodeMirror's "mode factory" interface
  return () => {
    return {
      startState() {
        return {
          input: undefined,
          tokens: [],
          insideComment: false,
        };
      },
      token,
    };
  };
}
