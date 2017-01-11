<template>
  <div id="suggestions">
    <suggestion-entry v-for="(suggestion, index) in suggestions"
                      :type="suggestion.type" :name="suggestion.name"
                      :extra="suggestion.extra" :id="suggestion.id" :index="index">
    </suggestion-entry>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var suggestionEntry = require('./suggestion-entry.vue');

  // Get the list of rules that start with given prefix.
  function retrieveMatchedRules(prefix) {
    var ruleDict = ohmEditor.grammar.rules;
    return Object.keys(ruleDict).filter(function(rule) {
      return rule.startsWith(prefix);
    });
  }

  module.exports = {
    components: {
      'suggestion-entry': suggestionEntry
    },
    props: ['prefix'],
    computed: {
      suggestions: function() {
        var suggestions = [];
        var prefix = this.prefix;
        if (prefix) {
          suggestions.push({
            type: 'helper',
            name: prefix,
            extra: 'a helper function',
            id: prefix
          });
        }

        // Add all the rules that started with the prefix to the suggestion list.
        var matchedRules = retrieveMatchedRules(prefix);
        matchedRules.forEach(function(ruleKey) {
          var ruleParts = ruleKey.split('_');
          suggestions.push({
            type: 'rule',
            name: ruleParts[0],
            extra: ruleParts[1],
            id: ruleKey
          });
        });

        return suggestions;
      }
    }
  };
</script>
