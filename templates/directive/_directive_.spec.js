'use strict';

describe('<%= name %>', function () {

  var $rootScope, $compile;

  beforeEach(function () {
    module('li.<%= type %>s.<%= subModule %>.<%= name %>');

    /*
    Uncomment this to mock factories.
    You may delete this comment block if you do not need to create mocks here.

    module(function ($provide) {
      $provide.factory('myFactory', function () {
        return {
          myFactoryMethod: function () {
            return 'my factory method called';
          }
        };
      });
    });
    */

    inject(function (_$rootScope_, _$compile_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
    });
  });

  it('should render its own name', function () {
    var element, content;

    element = $compile('<<%= markup %>></<%= markup %>>')($rootScope);
    $rootScope.$digest();
    content = element.find('.<%= cssClass %>');

    expect(content.text().trim()).toEqual('<%= name %>');
  });
});
