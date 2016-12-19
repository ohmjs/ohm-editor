<template>
  <div class="result">
    <result-block v-for="block of blocksToRender"
                  :classObj="block.classObj" :classId="block.classId" :result="block.result"
                  :operation="block.operation" />
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var resultBlock = require('./result-block.vue');

  // Generate a class name for the result block which used to identify the
  // semantic operation that generates the result.
  // Format: 'operationName_' <operation name> ('_' <arg#i>)*
  function generateResultBlockClassId(name, args) {
    var blockClassId = name;
    if (args) {
      var argValues = Object.keys(args).map(function(key) {
        return args[key];
      });
      blockClassId += '_' + argValues.join('_');
    }
    return 'operationName_' + blockClassId;
  }

  module.exports = {
    components: {
      'result-block': resultBlock
    },
    props: ['traceNode'],
    computed: {
      blocksToRender: function() {
        if (this.updated) {
          this.initialBlocks = [];
          this.updated = false;
        }
        return this.blocks;
      },
      blocks: function() {
        var blocks = this.initialBlocks;
        if (blocks.length > 0) {
          return blocks;
        }

        var results = ohmEditor.semantics.getResults(this.traceNode);
        if (!results) {
          return blocks;
        }
        var idx = 0;
        var nextStep = false;
        var passThrough = true;
        var optNextStep = false;
        var hasResults = false;
        Object.keys(results).forEach(function(operation) {
          var resultList = results[operation];
          resultList.forEach(function(resultWrapper) {
            var signature = operation;
            if (resultWrapper.args) {
              var argValues = Object.keys(resultWrapper.args).map(function(key) {
                return String(resultWrapper.args[key]);
              });
              signature += '(' + argValues.join(',') + ')';
            }

            var classObj = {
              error: resultWrapper.isError && !resultWrapper.missingSemanticsAction,
              forced: resultWrapper.forced,
              passThrough: resultWrapper.isPassThrough,
              optNextStep: !resultWrapper.forced && resultWrapper.isError,
              leftBorder: idx++ > 0
            };
            var noResult = resultWrapper.missingSemanticsAction;
            if (!noResult) {
              blocks.push({
                operation: signature,
                classObj: classObj,
                classId: generateResultBlockClassId(operation, resultWrapper.args),
                result: resultWrapper.result
              });
            }

            nextStep = nextStep || !resultWrapper.forced && resultWrapper.isNextStep;
            passThrough = passThrough && resultWrapper.isPassThrough;
            optNextStep = optNextStep || !resultWrapper.forced && resultWrapper.isError;
            hasResults = resultWrapper.forced && noResult ? hasResults : true;
          });
        });
        passThrough = hasResults && passThrough;
        this.passedClassObj = {
          passThrough: passThrough,
          nextStep: nextStep,
          optNextStep: optNextStep
        };
        this.$emit('styleUpdate', this.passedClassObj);
        return blocks;
      }
    },
    data: function() {
      return {
        updated: false,
        initialBlocks: [],
        passedClassObj: {}
      };
    },
    mounted: function() {
      var self = this;
      ohmEditor.semantics.addListener('render:semanticResult', function(trace, operation, optArgs) {
        self.updated = true;
      });
    }
  };
</script>