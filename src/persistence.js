/* eslint-env browser */
/* global GitHub */

'use strict';

var Vue = require('vue').default;
var ohmEditor = require('./ohmEditor');
var domUtil = require('./domUtil');

var EllipsisDropdown = Vue.extend(require('./components/ellipsis-dropdown.vue').default);

var $ = domUtil.$;
var $$ = domUtil.$$;

// These grammars are secret gists under the GitHub user 'ohm-official'.
var officialGrammars = [
  '30325d346a6e803cc35344ca218d8636', // Arithmetic
  '0a9a649c3c630fd0a470ba6cb75393fe'  // ES5
];

var gitHub = new GitHub();

// Prompt stuff
// ------------

function showPrompt(dialogId, optMessage) {
  $('#promptScreen').style.display = 'block';
  $$('#promptScreen > *').forEach(function(dialog) {
    dialog.hidden = true;
  });
  var messageField = $('#' + dialogId + 'Message');
  if (messageField) {
    messageField.textContent = optMessage || '';
  }
  var dialog = $('#' + dialogId);
  dialog.hidden = false;
  dialog.querySelector('input').focus();
}

function hidePrompt() {
  $('#promptScreen').style.display = 'none';
  $$('#promptScreen > *').forEach(function(dialog) {
    dialog.hidden = true;
  });
}

// Gist loading/saving
// -------------------

var grammarList = $('#grammarList');
var saveButton = $('#saveGrammar');

function loadFromGist(gistHash, cb) {
  var gist = gitHub.getGist(gistHash);
  gist.read(function(err, res, req) {
    if (err) {
      if (grammarList.selectedOptions[0].classList.contains('shared')) {
        // delete option and select local storage
        grammarList.selectedOptions[0].remove();
        location.hash = '#';
        return;
      }
    }

    var grammarFilename = Object.getOwnPropertyNames(res.files).find(function(filename) {
      return filename.slice(-4) === '.ohm';
    });
    var exampleFilename = Object.getOwnPropertyNames(res.files).find(function(filename) {
      return filename.slice(-5) === '.json';
    });

    var grammarFile = res.files[grammarFilename];
    var exampleFile = res.files[exampleFilename];
    cb(res.description, grammarFile && grammarFile.content,
      exampleFile && JSON.parse(exampleFile.content));
  });
}

function addGrammarGroup(list, label, grammars, beforeElem) {
  var group = list.querySelector('#myGrammars');
  if (group) {
    group.remove();
  }
  group = document.createElement('optgroup');
  group.setAttribute('label', label);
  list.add(group);

  if (!(grammars instanceof Array)) {
    grammars = [];
  }

  grammars.forEach(function(grammarHash) {
    var option = list.querySelector('.shared[value="' + grammarHash + '"]');
    if (!option) {
      option = document.createElement('option');
    }
    option.value = grammarHash;
    var gist = gitHub.getGist(grammarHash);
    gist.read(function(err, res) {
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
  ghUser.listGists(function(err, res) {
    if (err) {
      // login incorrect or other network problems
      return;
    }
    var grammars = res
      .filter(function(gist) {
        var filenames = Object.getOwnPropertyNames(gist.files);
        var hasJSON = filenames.find(function(filename) {
          return filename.toLowerCase().slice(-5) === '.json';
        });
        var hasOhm = filenames.find(function(filename) {
          return filename.toLowerCase().slice(-4) === '.ohm';
        });
        return hasJSON && hasOhm;
      })
      .sort(function(a, b) { return a.description < b.description; })
      .map(function(gist) { return gist.id; });

    localStorage.setItem('gitHubAuth', btoa(JSON.stringify(ghUser.__auth)));

    var option = document.createElement('option');
    option.value = '!logout';
    option.text = '[Logout]';

    var group = addGrammarGroup(grammarList, 'My Grammars', grammars, option);
    group.id = 'myGrammars';

    group.appendChild(option);
  });
}

function isLoggedIn() {
  return gitHub.__auth.username;
}

function saveToGist(description, grammarName, grammarText, examples, gistIdOrNull) {
  var gist = gitHub.getGist(gistIdOrNull);
  var gistData = {
    description: description,
    public: false,
    files: {}
  };
  gistData.files[grammarName + '.ohm'] = {
    content: grammarText,
    type: 'text/ohm-js'
  };
  gistData.files[grammarName + '.json'] = {
    content: JSON.stringify(
      Object.keys(examples).map(function(key) {
        return examples[key];
      }), null, 2
    ),
    type: 'application/json'
  };

  gist[gistIdOrNull ? 'update' : 'create'](gistData, function(err, res) {
    if (err) {
      // could not save grammar, potential network problem
      console.warn('Could not save Gist:', gistData); // eslint-disable-line no-console
      return;
    }

    if (!gistIdOrNull) {
      var gistId = res.id;
      var option = document.createElement('option');
      option.value = gistId;
      option.text = description;
      if (isLoggedIn()) {
        var group = grammarList.querySelector('#myGrammars');
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
  var option = grammarList.options[grammarList.selectedIndex];
  var grammarHash = option.value;

  var description = option.label;
  var grammarName = (ohmEditor.grammar && ohmEditor.grammar.name) || 'grammar';
  var grammarText = ohmEditor.ui.grammarEditor.getValue();
  var examples = ohmEditor.examples.getExamples();

  saveToGist(description, grammarName, grammarText, examples, grammarHash);
}

function doSaveAs() {
  showPrompt('newGrammarBox', isLoggedIn() ?
    null :
    'Warning: You are not logged in and cannot update your grammar after saving!'
  );
}

// Main
// ----

(function init() {
  saveButton.textContent = 'Save';
  saveButton.disabled = true;

  $$('#promptScreen .close').forEach(function(close) {
    close.addEventListener('click', hidePrompt);
  });

  grammarList.hidden = false;
  addGrammarGroup(grammarList, 'Official Ohm Grammars', officialGrammars);

  var gitHubAuth = localStorage.getItem('gitHubAuth');
  if (gitHubAuth) {
    gitHub = new GitHub(JSON.parse(atob(gitHubAuth)));
    loadUserGrammars(gitHub.getUser());
  } else {
    var group = addGrammarGroup(grammarList, 'My Grammars');
    group.id = 'myGrammars';
    var option = document.createElement('option');
    option.value = '!login';
    option.text = '[Log into GitHub...]';
    group.appendChild(option);
  }

  $('#gitHubForm').addEventListener('submit', function(e) {
    hidePrompt();

    var username = $('#username').value;
    $('#username').value = '';
    var password = $('#password').value;
    $('#password').value = '';
    if (username !== '' && password !== '') {
      gitHub = new GitHub({username: username, password: password});
      loadUserGrammars(gitHub.getUser());
    }
    localStorage.removeItem('gitHubAuth');

    e.preventDefault();
    return false;
  });

  saveButton.addEventListener('click', save);

  $('#newGrammarForm').addEventListener('submit', function(e) {
    hidePrompt();

    var description = $('#newGrammarName').value;
    $('#newGrammarName').value = '';
    var grammarName = (ohmEditor.grammar && ohmEditor.grammar.name) || 'grammar';
    var grammarText = ohmEditor.ui.grammarEditor.getValue();
    var examples = ohmEditor.examples.getExamples();

    saveToGist(description, grammarName, grammarText, examples);

    e.preventDefault();
    return false;
  });
  $('#newGrammarForm').addEventListener('reset', function(e) {
    hidePrompt();
  });

  // Grammar selection
  // -----------------

  var prevSelection;
  grammarList.addEventListener('click', function(e) {
    prevSelection = grammarList.selectedIndex;
  });

  function setGrammarAndExamples(description, grammar, examples) {
    if (description) {
      document.title = 'Ohm - ' + description;
      grammarList.selectedOptions[0].text = description;
    } else {
      document.title = 'Ohm';
    }

    ohmEditor.once('change:grammar', function(_) {
      saveButton.disabled = true;
    });
    if (examples) {
      ohmEditor.once('parse:grammar', function(matchResult, grammar, err) {
        ohmEditor.examples.restoreExamples(examples);
      });
    }

    ohmEditor.examples.restoreExamples([]); // clear examples
    ohmEditor.setGrammar(grammar);
  }

  grammarList.addEventListener('change', function(e) {
    var grammarHash = grammarList.options[grammarList.selectedIndex].value;

    if (grammarHash === '!login') {
      showPrompt('loginBox');
      grammarList.selectedIndex = prevSelection;
      return;
    } else if (grammarHash === '!logout') {
      localStorage.removeItem('gitHubAuth');
      gitHub = new GitHub();

      var group = addGrammarGroup(grammarList, 'My Grammars');
      group.id = 'myGrammars';
      var option = document.createElement('option');
      option.value = '!login';
      option.text = '[Log into GitHub...]';
      group.appendChild(option);

      if ((grammarList.options.length - 1) > prevSelection) {
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
    var grammarHash = location.hash.slice(1);

    var options = Array.prototype.slice.apply(grammarList.options);
    options.reverse(); // to match my grammars first
    var option = options.find(function(option) {
      return option.value === grammarHash;
    });
    if (!option) { // shared grammar or not yet loaded
      option = document.createElement('option');
      option.value = grammarHash;
      option.text = '[shared grammar]';
      option.classList.add('shared');
      grammarList.insertBefore(option, grammarList.querySelector('optgroup'));
    }
    options = Array.prototype.slice.apply(grammarList.options);
    grammarList.selectedIndex = options.indexOf(option);

    if (grammarHash === '') { // local storage
      setGrammarAndExamples(null, null, 'examples' /* local storage key */);
      saveButton.disabled = true;
      return false;
    }

    var optGroup = grammarList[grammarList.selectedIndex].parentElement;
    if (optGroup.id === 'myGrammars') {
      saveButton.disabled = false;
    } else {
      saveButton.disabled = true;
    }
    loadFromGist(grammarHash, setGrammarAndExamples);
  }
  window.loadFromHash = loadFromHash;

  ohmEditor.ui.grammarEditor.setOption('extraKeys', {
    'Cmd-S': function(cm) {
      if (saveButton.disabled) {
        doSaveAs();
      } else {
        save();
      }
    }
  });

  ohmEditor.addListener('change:grammar', function(source) {
    var grammar = grammarList.options[grammarList.selectedIndex].value;
    if (grammar === '') { // local storage
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
      'Save As...': doSaveAs
    }
  }
});
/* eslint-enable no-new */
