"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _chokidar = _interopRequireDefault(require("chokidar"));

var _path = _interopRequireDefault(require("path"));

var _build = require("./build");

var _log = require("./log");

var _webpack = require("./webpack");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = async argv => {
  const modulePath = _path.default.resolve(argv.path || process.cwd());

  let promise = (0, _build.buildBackend)(modulePath);

  const rebuild = () => {
    if (!promise.isPending) {
      (0, _log.debug)('Backend files changed');
      promise = (0, _build.buildBackend)(modulePath);
    }
  };

  const watcher = _chokidar.default.watch(_path.default.join(modulePath, 'src'), {
    ignored: ['**/*.d.ts'],
    ignoreInitial: true,
    atomic: 500
  });

  watcher.on('add', rebuild);
  watcher.on('change', rebuild);
  watcher.on('unlink', rebuild);
  (0, _webpack.watch)(modulePath);
};

exports.default = _default;