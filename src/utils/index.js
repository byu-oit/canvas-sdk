'use strict';

exports.randomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

exports.sleep = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    })
};