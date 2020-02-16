#!/usr/bin/env node
"use strict";

var _build = _interopRequireDefault(require("./build"));

var _log = require("./log");

var _package = _interopRequireDefault(require("./package"));

var _watch = _interopRequireDefault(require("./watch"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('yargs').command('build', 'builds a botpress module', {}, argv => {
  (0, _log.configure)(argv.verbose); // tslint:disable-next-line: no-floating-promises

  (0, _build.default)(argv);
}).command('watch', 'watches and rebuilds a module', {}, argv => {
  (0, _log.configure)(argv.verbose); // tslint:disable-next-line: no-floating-promises

  (0, _watch.default)(argv);
}).command('package', 'packages a module for distribution (.tgz)', {
  out: {
    alias: 'o',
    describe: 'the output location of the package',
    default: './%name%.tgz'
  }
}, argv => {
  (0, _log.configure)(argv.verbose); // tslint:disable-next-line: no-floating-promises

  (0, _package.default)(argv);
}).option('verbose', {
  alias: 'v',
  describe: 'display more info about what is being done'
}).epilogue('for more information, visit https://botpress.com/docs').demandCommand(1).help().wrap(72).argv;