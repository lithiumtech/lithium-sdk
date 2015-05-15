'use strict';

describe('<%= camel %>', function () {

  var $filter;

  beforeEach(function () {
    module('li.<%= type %>s.<%= subModule %>.<%= name %>');

    inject(function (_$filter_) {
      $filter = _$filter_;
    });
  });

  it('should test something about itself', function () {

    var test = $filter('<%= camel %>')('YARR');
    expect(test).toEqual('Generated <%= name %> filter: YARR');

  });
});
