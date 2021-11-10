/* global document */

'use strict';

const cmUtil = require('./cmUtil');
const domUtil = require('./domUtil');
const ohmEditor = require('./ohmEditor');

const errorMarks = {
  grammar: null,
  input: null,
};

function hideError(category, editor) {
  const errInfo = errorMarks[category];
  if (errInfo) {
    errInfo.mark.clear();
    clearTimeout(errInfo.timeout);
    if (errInfo.widget) {
      errInfo.widget.clear();
    }
    errorMarks[category] = null;
  }
}

function setError(category, editor, interval, messageOrNode) {
  hideError(category, editor);

  errorMarks[category] = {
    mark: cmUtil.markInterval(editor, interval, 'error-interval', false),
    timeout: setTimeout(
      showError.bind(null, category, editor, interval, messageOrNode),
      1500
    ),
    widget: null,
  };
}

function showError(category, editor, interval, messageOrNode) {
  const errorEl = domUtil.createElement('.error');
  if (typeof messageOrNode === 'string') {
    errorEl.textContent = messageOrNode;
  } else {
    errorEl.appendChild(messageOrNode);
  }
  const line = editor.posFromIndex(interval.endIdx).line;
  errorMarks[category].widget = editor.addLineWidget(line, errorEl, {
    insertAt: 0,
  });
}

function createErrorEl(result, pos) {
  const el = domUtil.createElement('span', 'Expected ');

  const failures = result.getRightmostFailures();
  const sep = ', ';
  const lastSep = failures.length >= 3 ? ', or ' : ' or '; // Oxford comma.

  failures.forEach(function (f, i) {
    let prefix = '';
    if (i > 0) {
      prefix = i === failures.length - 1 ? lastSep : sep;
    }
    el.appendChild(document.createTextNode(prefix));
    const link = el.appendChild(
      domUtil.createElement('span.link', f.toString())
    );
    link.onclick = function () {
      ohmEditor.emit('goto:failure', f);
    };
    link.onmouseenter = function () {
      ohmEditor.emit('peek:failure', f);
    };
    link.onmouseout = function () {
      ohmEditor.emit('unpeek:failure');
    };
  });
  return el;
}

// Hide errors in the editors as soon as the user starts typing again.
ohmEditor.addListener('change:grammarEditor', function (cm) {
  hideError('grammar', cm);
});
ohmEditor.addListener('change:inputEditor', function (cm) {
  hideError('input', cm);
});

// Hide the input error when the grammar is about to be reparsed.
ohmEditor.addListener('change:grammar', function (source) {
  hideError('input', ohmEditor.ui.inputEditor);
});

ohmEditor.addListener('parse:grammars', function (matchResult, grammars, err) {
  if (err) {
    const editor = ohmEditor.ui.grammarEditor;
    setError('grammar', editor, err.interval, err.shortMessage || err.message);
  }
});
ohmEditor.addListener('parse:input', function (matchResult, trace) {
  if (trace.result.failed()) {
    const editor = ohmEditor.ui.inputEditor;
    // Intervals with start == end won't show up in CodeMirror.
    const interval = trace.result.getInterval();
    interval.endIdx += 1;

    setError('input', editor, interval, createErrorEl(trace.result));
  }
});
