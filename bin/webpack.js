"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = config;
exports.watch = watch;
exports.build = build;

var _cleanWebpackPlugin = _interopRequireDefault(require("clean-webpack-plugin"));

var _fs = _interopRequireDefault(require("fs"));

var _lodash = _interopRequireDefault(require("lodash"));

var _path = _interopRequireDefault(require("path"));

var _webpack = _interopRequireDefault(require("webpack"));

var _webpackBundleAnalyzer = require("webpack-bundle-analyzer");

var _log = require("./log");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const libraryTarget = mod => `botpress = typeof botpress === "object" ? botpress : {}; botpress["${mod}"]`;

function config(projectPath) {
  const packageJson = require(_path.default.join(projectPath, 'package.json'));

  const getEntryPoint = view => {
    const isTs = _fs.default.existsSync(_path.default.join(projectPath, `./src/views/${view}/index.tsx`));

    return `./src/views/${view}/index.${isTs ? 'tsx' : 'jsx'}`;
  };

  const full = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.argv.find(x => x.toLowerCase() === '--nomap') ? false : 'source-map',
    entry: [getEntryPoint('full')],
    output: {
      path: _path.default.resolve(projectPath, './assets/web'),
      publicPath: '/js/modules/',
      filename: 'full.bundle.js',
      libraryTarget: 'assign',
      library: libraryTarget(packageJson.name)
    },
    externals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      'react-bootstrap': 'ReactBootstrap',
      '@blueprintjs/core': 'BlueprintJsCore',
      'botpress/ui': 'BotpressUI',
      'botpress/content-picker': 'BotpressContentPicker',
      'botpress/documentation': 'DocumentationProvider',
      'botpress/utils': 'BotpressUtils'
    },
    resolveLoader: {
      modules: ['node_modules', _path.default.resolve(projectPath, './node_modules/module-builder/node_modules')]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.tsx', '.ts']
    },
    plugins: [new _cleanWebpackPlugin.default()],
    module: {
      rules: [{
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      }, {
        test: /\.jsx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env'], '@babel/preset-typescript', '@babel/preset-react'],
            plugins: [['@babel/plugin-proposal-decorators', {
              legacy: true
            }], ['@babel/plugin-proposal-class-properties', {
              loose: true
            }], '@babel/plugin-syntax-function-bind', '@babel/plugin-proposal-function-bind']
          }
        },
        exclude: /node_modules/
      }, {
        test: /\.scss$/,
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-modules-typescript-loader'
        }, {
          loader: 'css-loader',
          options: {
            modules: true,
            importLoaders: 1,
            localIdentName: packageJson.name + '__[name]__[local]___[hash:base64:5]'
          }
        }, {
          loader: 'sass-loader'
        }]
      }, {
        test: /\.css$/,
        use: [{
          loader: 'style-loader'
        }, {
          loader: 'css-loader'
        }]
      }, {
        test: /font.*\.(woff|woff2|svg|eot|ttf)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '../fonts/[name].[ext]'
          }
        }
      }, {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[hash].[ext]'
          }
        }]
      }]
    }
  };

  if (process.argv.find(x => x.toLowerCase() === '--analyze-full')) {
    full.plugins.push(new _webpackBundleAnalyzer.BundleAnalyzerPlugin());
  }

  if (packageJson.webpack) {
    _lodash.default.merge(full, packageJson.webpack);
  }

  const lite = Object.assign({}, full, {
    entry: [getEntryPoint('lite')],
    output: {
      path: _path.default.resolve(projectPath, './assets/web'),
      publicPath: '/js/lite-modules/',
      filename: 'lite.bundle.js',
      libraryTarget: 'assign',
      library: libraryTarget(packageJson.name)
    },
    externals: {
      react: 'React',
      'react-dom': 'ReactDOM'
    },
    plugins: [] // We clear the plugins here, since the cleanup is already done by the "full" view

  });

  if (process.argv.find(x => x.toLowerCase() === '--analyze-lite')) {
    lite.plugins.push(new _webpackBundleAnalyzer.BundleAnalyzerPlugin());
  }

  const webpackFile = _path.default.join(projectPath, 'webpack.frontend.js');

  if (_fs.default.existsSync(webpackFile)) {
    (0, _log.debug)('Webpack override found for frontend');
    return require(webpackFile)({
      full,
      lite
    });
  }

  return [full, lite];
}

function writeStats(err, stats, exitOnError = true) {
  if (err || stats.hasErrors()) {
    (0, _log.error)(stats.toString('minimal'));

    if (exitOnError) {
      return process.exit(1);
    }
  }

  for (const child of stats.toJson().children) {
    (0, _log.normal)(`Generated frontend bundle (${child.time} ms)`);
  }
}

function watch(projectPath) {
  const confs = config(projectPath);
  const compiler = (0, _webpack.default)(confs);
  compiler.watch({}, (err, stats) => writeStats(err, stats, false));
}

function build(projectPath) {
  const confs = config(projectPath);
  (0, _webpack.default)(confs, (err, stats) => writeStats(err, stats, true));
}