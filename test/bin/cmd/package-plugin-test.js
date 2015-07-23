'use strict';

var chai = require("chai");
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
var expect = chai.expect;
chai.use(sinonChai);

function hello(name, cb) {
    cb("hello " + name);
}

describe("hello", function () {
    it("should call callback with correct greeting", function () {
        var cb = sinon.spy();

        hello("foo", cb);

        expect(cb).to.have.been.calledWith("hello foo");
    });
});

describe("testSubmitPlugin", function() {
    it("should be true", function() {
        expect(true).to.equal(true);
    });
});