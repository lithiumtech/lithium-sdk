'use strict';

/**
 * @module <%= subModule %>
 * @ngdoc <%= type %>
 * @name <%= name %>
 *
 * @description
 * TODO: add description
 */

angular.module('li.<%= type %>s.<%= subModule %>.<%= name %>', [])

.filter('<%= camel %>', function () {
  return function (arg) {
    return 'Generated <%= name %> filter: ' + arg;
  };
});
