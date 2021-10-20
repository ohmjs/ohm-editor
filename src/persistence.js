/* eslint-env browser */
/* global GitHub */

'use strict';

const Vue = require('vue').default;
const ohmEditor = require('./ohmEditor');
const domUtil = require('./domUtil');

const EllipsisDropdown = Vue.extend(
  // eslint-disable-next-line max-len
  require('./components/ellipsis-dropdown.vue').default || require('./components/ellipsis-dropdown.vue')
);

const $ = domUtil.$;
const $$ = domUtil.$$;

// These grammars are secret gists under the GitHub user 'ohm-official'.
const officialGrammars = [
  '30325d346a6e803cc35344ca218d8636', // Arithmetic
  '0a9a649c3c630fd0a470ba6cb75393fe', // ES5
];

let gitHub = new GitHub();

// Prompt stuff
// ------------

function showPrompt(dialogId, optMessage) {
  $('#promptScreen').style.display = 'block';
  $$('#promptScreen > *').forEach(function (dialog) {
    dialog.hidden = true;
  });
  const messageField = $('#' + dialogId + 'Message');
  if (messageField) {
    messageField.textContent = optMessage || '';
  }
  const dialog = $('#' + dialogId);
  dialog.hidden = false;
  dialog.querySelector('input').focus();
}

function hidePrompt() {
  $('#promptScreen').style.display = 'none';
  $$('#promptScreen > *').forEach(function (dialog) {
    dialog.hidden = true;
  });
}

// Gist loading/saving
// -------------------

const grammarList = $('#grammarList');
const saveButton = $('#saveGrammar');

function loadFromGist(gistHash, cb) {
  const gist = gitHub.getGist(gistHash);
  gist.read(function (err, res, req) {
    if (err) {
      if (grammarList.selectedOptions[0].classList.contains('shared')) {
        // delete option and select local storage
        grammarList.selectedOptions[0].remove();
        location.hash = '#';
        return;
      }
    }

    const grammarFilename = Object.getOwnPropertyNames(res.files).find(
      function (filename) {
        return filename.slice(-4) === '.ohm';
      }
    );
    const exampleFilename = Object.getOwnPropertyNames(res.files).find(
      function (filename) {
        return filename.slice(-5) === '.json';
      }
    );

    const grammarFile = res.files[grammarFilename];
    const exampleFile = res.files[exampleFilename];
    cb(
      res.description,
      grammarFile && grammarFile.content,
      exampleFile && JSON.parse(exampleFile.content)
    );
  });
}

function addGrammarGroup(list, label, grammars, beforeElem) {
  let group = list.querySelector('#myGrammars');
  if (group) {
    group.remove();
  }
  group = document.createElement('optgroup');
  group.setAttribute('label', label);
  list.add(group);

  if (!(grammars instanceof Array)) {
    grammars = [];
  }

  grammars.forEach(function (grammarHash) {
    let option = list.querySelector('.shared[value="' + grammarHash + '"]');
    if (!option) {
      option = document.createElement('option');
    }
    option.value = grammarHash;
    const gist = gitHub.getGist(grammarHash);
    gist.read(function (err, res) {
      if (err) {
        console.warn('Could not load Gist ' + grammarHash); // eslint-disable-line no-console
        return;
      }
      option.text = res.description;
      if (beforeElem) {
        group.insertBefore(option, beforeElem);
      } else {
        group.appendChild(option);
      }
    });
  });

  return group;
}

function loadUserGrammars(ghUser) {
  ghUser.listGists(function (err, res) {
    if (err) {
      // login incorrect or other network problems
      return;
    }
    const grammars = res
      .filter(function (gist) {
        const filenames = Object.getOwnPropertyNames(gist.files);
        const hasJSON = filenames.find(function (filename) {
          return filename.toLowerCase().slice(-5) === '.json';
        });
        const hasOhm = filenames.find(function (filename) {
          return filename.toLowerCase().slice(-4) === '.ohm';
        });
        return hasJSON && hasOhm;
      })
      .sort(function (a, b) {
        return a.description < b.description;
      })
      .map(function (gist) {
        return gist.id;
      });

    localStorage.setItem('gitHubAuth', btoa(JSON.stringify(ghUser.__auth)));

    const option = document.createElement('option');
    option.value = '!logout';
    option.text = '[Logout]';

    const group = addGrammarGroup(grammarList, 'My Grammars', grammars, option);
    group.id = 'myGrammars';

    group.appendChild(option);
  });
}

function isLoggedIn() {
  return gitHub.__auth.username;
}

function saveToGist(
  description,
  grammarName,
  grammarText,
  examples,
  gistIdOrNull
) {
  const gist = gitHub.getGist(gistIdOrNull);
  const gistData = {
    description,
    public: false,
    files: {},
  };
  gistData.files[grammarName + '.ohm'] = {
    content: grammarText,
    type: 'text/ohm-js',
  };
  gistData.files[grammarName + '.json'] = {
    content: JSON.stringify(
      Object.keys(examples).map(function (key) {
        return examples[key];
      }),
      null,
      2
    ),
    type: 'application/json',
  };

  gist[gistIdOrNull ? 'update' : 'create'](gistData, function (err, res) {
    if (err) {
      // could not save grammar, potential network problem
      console.warn('Could not save Gist:', gistData); // eslint-disable-line no-console
      return;
    }

    if (!gistIdOrNull) {
      const gistId = res.id;
      const option = document.createElement('option');
      option.value = gistId;
      option.text = description;
      if (isLoggedIn()) {
        const group = grammarList.querySelector('#myGrammars');
        group.insertBefore(option, group.lastChild);
        saveButton.disabled = false;
      } else {
        grammarList.insertBefore(option, grammarList.querySelector('optgroup'));
      }
      grammarList.value = gistId;
    }

    saveButton.disabled = true;
  });
}

function save() {
  const option = grammarList.options[grammarList.selectedIndex];
  const grammarHash = option.value;

  const description = option.label;
  const grammarName =
    (ohmEditor.grammar && ohmEditor.grammar.name) || 'grammar';
  const grammarText = ohmEditor.ui.grammarEditor.getValue();
  const examples = ohmEditor.examples.getExamples();

  saveToGist(description, grammarName, grammarText, examples, grammarHash);
}

function doSaveAs() {
  showPrompt(
    'newGrammarBox',
    isLoggedIn()
      ? null
      : 'Warning: You are not logged in and cannot update your grammar after saving!'
  );
}

// Main
// ----

(function init() {
  saveButton.textContent = 'Save';
  saveButton.disabled = true;

  $$('#promptScreen .close').forEach(function (close) {
    close.addEventListener('click', hidePrompt);
  });

  grammarList.hidden = false;
  addGrammarGroup(grammarList, 'Official Ohm Grammars', officialGrammars);

  const gitHubAuth = localStorage.getItem('gitHubAuth');
  if (gitHubAuth) {
    gitHub = new GitHub(JSON.parse(atob(gitHubAuth)));
    loadUserGrammars(gitHub.getUser());
  } else {
    const group = addGrammarGroup(grammarList, 'My Grammars');
    group.id = 'myGrammars';
    const option = document.createElement('option');
    option.value = '!login';
    option.text = '[Log into GitHub...]';
    group.appendChild(option);
  }

  $('#gitHubForm').addEventListener('submit', function (e) {
    hidePrompt();

    const username = $('#username').value;
    $('#username').value = '';
    const password = $('#password').value;
    $('#password').value = '';
    if (username !== '' && password !== '') {
      gitHub = new GitHub({username, password});
      loadUserGrammars(gitHub.getUser());
    }
    localStorage.removeItem('gitHubAuth');

    e.preventDefault();
    return false;
  });

  saveButton.addEventListener('click', save);

  $('#newGrammarForm').addEventListener('submit', function (e) {
    hidePrompt();

    const description = $('#newGrammarName').value;
    $('#newGrammarName').value = '';
    const grammarName =
      (ohmEditor.grammar && ohmEditor.grammar.name) || 'grammar';
    const grammarText = ohmEditor.ui.grammarEditor.getValue();
    const examples = ohmEditor.examples.getExamples();

    saveToGist(description, grammarName, grammarText, examples);

    e.preventDefault();
    return false;
  });
  $('#newGrammarForm').addEventListener('reset', function (e) {
    hidePrompt();
  });

  // Grammar selection
  // -----------------

  let prevSelection;
  grammarList.addEventListener('click', function (e) {
    prevSelection = grammarList.selectedIndex;
  });

  function setGrammarAndExamples(description, grammar, examples) {
    if (description) {
      document.title = 'Ohm - ' + description;
      grammarList.selectedOptions[0].text = description;
    } else {
      document.title = 'Ohm';
    }

    ohmEditor.once('change:grammar', function (_) {
      saveButton.disabled = true;
    });
    if (examples) {
      ohmEditor.once('parse:grammar', function (matchResult, grammar, err) {
        ohmEditor.examples.restoreExamples(examples);
      });
    }

    ohmEditor.examples.restoreExamples([]); // clear examples
    ohmEditor.setGrammar(grammar);
  }

  grammarList.addEventListener('change', function (e) {
    const grammarHash = grammarList.options[grammarList.selectedIndex].value;

    if (grammarHash === '!login') {
      showPrompt('loginBox');
      grammarList.selectedIndex = prevSelection;
      return;
    } else if (grammarHash === '!logout') {
      localStorage.removeItem('gitHubAuth');
      gitHub = new GitHub();

      const group = addGrammarGroup(grammarList, 'My Grammars');
      group.id = 'myGrammars';
      const option = document.createElement('option');
      option.value = '!login';
      option.text = '[Log into GitHub...]';
      group.appendChild(option);

      if (grammarList.options.length - 1 > prevSelection) {
        grammarList.selectedIndex = prevSelection;
      } else {
        location.hash = '#';
      }
      return;
    }

    location.hash = '#' + grammarHash;
    loadFromHash();
  });

  function loadFromHash() {
    const grammarHash = location.hash.slice(1);

    let options = Array.prototype.slice.apply(grammarList.options);
    options.reverse(); // to match my grammars first
    let option = options.find(function (option) {
      return option.value === grammarHash;
    });
    if (!option) {
      // shared grammar or not yet loaded
      option = document.createElement('option');
      option.value = grammarHash;
      option.text = '[shared grammar]';
      option.classList.add('shared');
      grammarList.insertBefore(option, grammarList.querySelector('optgroup'));
    }
    options = Array.prototype.slice.apply(grammarList.options);
    grammarList.selectedIndex = options.indexOf(option);

    if (grammarHash === '') {
      // local storage
      setGrammarAndExamples(null, null, 'examples' /* local storage key */);
      saveButton.disabled = true;
      return false;
    }

    const optGroup = grammarList[grammarList.selectedIndex].parentElement;
    if (optGroup.id === 'myGrammars') {
      saveButton.disabled = false;
    } else {
      saveButton.disabled = true;
    }
    loadFromGist(grammarHash, setGrammarAndExamples);
  }
  window.loadFromHash = loadFromHash;

  ohmEditor.ui.grammarEditor.setOption('extraKeys', {
    'Cmd-S'(cm) {
      if (saveButton.disabled) {
        doSaveAs();
      } else {
        save();
      }
    },
  });

  ohmEditor.addListener('change:grammar', function (source) {
    const grammar = grammarList.options[grammarList.selectedIndex].value;
    if (grammar === '') {
      // local storage
      ohmEditor.saveState(ohmEditor.ui.grammarEditor, 'grammar');
    } else {
      saveButton.disabled = false;
    }
  });

  window.addEventListener('hashchange', loadFromHash);
  if (location.hash !== '') {
    loadFromHash();
  }
})();

/* eslint-disable no-new */
new EllipsisDropdown({
  el: '#grammarDropdown',
  propsData: {
    items: {
      'Save As...': doSaveAs,
    },
  },
});
/* eslint-enable no-new */
