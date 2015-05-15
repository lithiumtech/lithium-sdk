'use strict';

describe('<%= name %>', function () {

  var <%= camel %>;

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

    inject(function (_<%= camel  %>_) {
      <%= camel  %> = _<%= camel  %>_;
    });

  });

  it('should test method', function () {
    expect(<%= camel  %>.dummyMethod({a: 'a'})).toBe(JSON.stringify({a: 'a'}));
  });

});
