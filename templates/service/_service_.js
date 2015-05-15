'use strict';

angular.module('li.<%= type %>s.<%= subModule %>.<%= name %>', [])

/**
 * @module <%= subModule %>
 * @ngdoc <%= type %>
 * @name <%= name %>
 *
 * @description
 * TODO: add description
 */
.factory('<%= camel %>', function () {
  return {
    /**
     * @module <%= subModule %>
     * @ngdoc method
     * @name <%= camel %>#dummyMethod
     *
     * @param {param1} javascript object
     *
     * @returns {string} Stringified object
     *
     */
    dummyMethod: function (param1) {
      return JSON.stringify(param1);
    }
  };
});
