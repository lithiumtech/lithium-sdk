'use strict';

var validPluginPoints = ['asset', 'badge_icon', 'component', 'endpoint', 'init',
    'layout', 'macro', 'quilt', 'rank_icon', 'skin', 'text'];

module.exports = {
    getPoints: function() {
       return validPluginPoints;
    }
}