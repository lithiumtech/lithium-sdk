'use strict';

function urlBldr(url) {
	return {
	  build: function() {
	    return url;
	  },
	  add: function(val) {
	    return urlBldr(url + val);
	  },
	  addIf: function(bool, val) {
	    return bool ? this.add(val) : urlBldr(url);
	  },
	  query: function(nm, val) {
	      return url.indexOf('?') > -1 ? this.add('&' + nm + '=' + val) : this.add('?' + nm + '=' + val);
	  },
	  queryIf: function(bool, nm, val) {
	    return bool ? this.query(nm, val) : urlBldr(url);
	  }
	};
}

module.exports.urlBldr = urlBldr;