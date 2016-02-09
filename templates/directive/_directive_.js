'use strict';

angular.module('li.<%= type %>s.<%= subModule %>.<%= name %>', [])

/**
 * @module <%= subModule %>
 * @ngdoc <%= type %>
 * @name <%= name %>
 *
 * @restrict AE
 *
 * @description
 * TODO: add description
 */
.directive('<%= directiveName %>', function () {
  return {
    restrict: 'AE',
    templateUrl: '<%= subModule %>/<%= name %>/<%= name %>.tpl.html'
  };
});
