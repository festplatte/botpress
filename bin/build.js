"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildBackend = buildBackend;
exports.buildConfigSchema = buildConfigSchema;
exports.default = void 0;

var babel = _interopRequireWildcard(require("@babel/core"));

var _fs = _interopRequireDefault(require("fs"));

var _fsExtra = _interopRequireDefault(require("fs-extra"));

var _glob = _interopRequireDefault(require("glob"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _os = _interopRequireDefault(require("os"));

var _path = _interopRequireDefault(require("path"));

var _rimraf = _interopRequireDefault(require("rimraf"));

var _typescriptJsonSchema = require("typescript-json-schema");

var _log = require("./log");

var _webpack = require("./webpack");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

var _default = async argv => {
  const modulePath = _path.default.resolve(argv.path || process.cwd());

  await buildBackend(modulePath);
  await (0, _webpack.build)(modulePath);
  await buildConfigSchema(modulePath);
  (0, _log.normal)('Build completed');
};

exports.default = _default;

async function buildBackend(modulePath) {
  const start = Date.now();
  let babelConfig = {
    presets: [['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }], '@babel/preset-typescript', '@babel/preset-react'],
    sourceMaps: true,
    sourceRoot: _path.default.join(modulePath, 'src/backend'),
    parserOpts: {
      allowReturnOutsideFunction: true
    },
    plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-function-bind'],
    sourceType: 'module',
    cwd: modulePath
  };

  const babelFile = _path.default.join(modulePath, 'babel.backend.js');

  if (_fs.default.existsSync(babelFile)) {
    (0, _log.debug)('Babel override found for backend');
    babelConfig = require(babelFile)(babelConfig);
  }

  const files = _glob.default.sync('src/**/*.+(ts|js|jsx|tsx)', {
    cwd: modulePath,
    dot: true,
    ignore: ['**/*.d.ts', '**/views/**/*.*', '**/config.ts']
  });

  _rimraf.default.sync(_path.default.join(modulePath, 'dist')); // Allows to copy additional files to the dist directory of the module


  const extrasFile = _path.default.join(modulePath, 'build.extras.js');

  if (_fs.default.existsSync(extrasFile)) {
    const extras = require(extrasFile);

    if (extras && extras.copyFiles) {
      for (const instruction of extras.copyFiles) {
        const toCopy = _glob.default.sync(instruction, {
          cwd: modulePath,
          dot: true
        });

        for (const file of toCopy) {
          const fromFull = _path.default.join(modulePath, file);

          const dest = file.replace(/^src\//i, 'dist/').replace(/\.ts$/i, '.js');

          const destFull = _path.default.join(modulePath, dest);

          _mkdirp.default.sync(_path.default.dirname(destFull));

          _fsExtra.default.copySync(fromFull, destFull);

          (0, _log.debug)(`Copied "${file}" -> "${dest}"`);
        }
      }
    }
  }

  const copyWithoutTransform = ['actions', 'hooks', 'examples', 'content-types'];
  const outputFiles = [];

  for (const file of files) {
    const dest = file.replace(/^src\//i, 'dist/').replace(/\.ts$/i, '.js');

    _mkdirp.default.sync(_path.default.dirname(dest));

    if (copyWithoutTransform.find(x => file.startsWith(`src/${x}`))) {
      _fs.default.writeFileSync(dest, _fs.default.readFileSync(`${modulePath}/${file}`, 'utf8'));

      continue;
    }

    try {
      const dBefore = Date.now();
      const result = babel.transformFileSync(file, babelConfig);
      const destMap = dest + '.map';

      _fs.default.writeFileSync(dest, result.code + _os.default.EOL + `//# sourceMappingURL=${_path.default.basename(destMap)}`);

      result.map.sources = [_path.default.relative(babelConfig.sourceRoot, file)];

      _fs.default.writeFileSync(destMap, JSON.stringify(result.map));

      const totalTime = Date.now() - dBefore;
      (0, _log.debug)(`Generated "${dest}" (${totalTime} ms)`);
      outputFiles.push(dest);
    } catch (err) {
      (0, _log.error)(`Error transpiling file "${file}"`); // TODO Better error

      throw err;
    }
  }

  (0, _log.normal)(`Generated backend (${Date.now() - start} ms)`);
}

async function buildConfigSchema(modulePath) {
  const config = _path.default.resolve(modulePath, 'src', 'config.ts');

  if (!_fs.default.existsSync(config)) {
    return;
  }

  const settings = {
    required: true,
    ignoreErrors: true,
    noExtraProps: true,
    validationKeywords: ['see', 'example', 'pattern']
  };
  const program = (0, _typescriptJsonSchema.getProgramFromFiles)([config]);
  const definition = (0, _typescriptJsonSchema.generateSchema)(program, 'Config', settings);

  if (definition && definition.properties) {
    definition.properties.$schema = {
      type: 'string'
    };
  }

  const schema = JSON.stringify(definition, undefined, 2) + _os.default.EOL + _os.default.EOL;

  _mkdirp.default.sync(_path.default.resolve(modulePath, 'assets'));

  _fs.default.writeFileSync(_path.default.resolve(modulePath, 'assets', 'config.schema.json'), schema);
}