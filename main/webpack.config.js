const path = require("path");

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;


function genSass(indentedSyntax) {
	return [
		"style-loader",
		"css-loader",
		"sass-loader" + (indentedSyntax ? "?indentedSyntax" : ""),
		{
			loader: "sass-resources-loader",
			options: {
				resources: [
					path.resolve(__dirname, "./src/sass/global.sass")
				]
			}
		}
	];
}

const BABEL = {
	loader: "babel-loader",
	options: {
		presets: ["env", "stage-0"],
		plugins: [
			"syntax-decorators",
			"transform-decorators-legacy",
			[
				"babel-plugin-transform-builtin-extend", {
					globals: ["Error", "Array"]
				}
			],
			"transform-class-properties"
		]
	}
};
const CHUNKS = [
	["vue", /vue\.min\.js/],
	["core-js", /core-js/],
	["sanitize-html", /sanitize-html/],
	["elliptic-crypto", /elliptic|bn|ecies|hmac|public-encrypt|ecdh/],
	["highlight", /highlight/],
	["dom", /dom-serializer|entities|htmlparser2/],
	["crypto", /crypto|des|aes|hash|diffie-hellman|pbkdf2|ripemd160|sha|md5|cipher-base|rand|evp|miller-rabin/],
	["polyfill", /readable-stream|buffer|lodash|regenerator-runtime|browserify|babel-polyfill|process|setimmediate/],
	["vue-util", /vuex|vue-awesome|vue-style-loader|vue-async-computed|vue-loader|style-loader/],
	["vendor-ui", /marked|emojis|jdenticon|autosize|dom/],
	["vendor", /node_modules/],
	["components", /vue_components/]
];


let circularErrors;
module.exports = {
	context: path.resolve(__dirname, "./src"),
	resolve: {
		modules: [path.resolve(__dirname, "./src"), "node_modules"]
	},
	entry: {
		[CHUNKS[0][0]]: ["babel-polyfill", "./main.js"]
	},
	output: {
		path: path.resolve(__dirname, "./dist"),
		publicPath: "./",
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.vue$/,
				loader: "vue-loader",
				options: {
					loaders: {
						scss: genSass(false),
						sass: genSass(true),
						js: BABEL
					}
				}
			},
			{
				test: /\.css$/,
				loader: "style-loader!css-loader"
			},
			{
				test: /\.scss$/,
				loader: genSass(false)
			},
			{
				test: /\.sass$/,
				loader: genSass(true)
			},
			{
				test: /\.js$/,
				use: [
					BABEL,
					{
						loader: "eslint-loader"
					}
				],
				exclude: /node_modules/
			},
			{
				test: /\.js$/,
				use: BABEL,
				include: [
					path.resolve(__dirname, "../node_modules/zero-dev-lib"),
					path.resolve(__dirname, "../node_modules/vue-awesome")
				]
			},
			{
				test: /\.(gif|jpe?g|png)$/,
				loader: "file-loader"
			},
			{
				test: /\.svg$/,
				loader: "url-loader",
				options: {
					mimetype: "image/svg+xml"
				}
			},
			{
				test: /\.(ttf|otf|eot|woff2?)$/,
				loader: "file-loader?name=fonts/[name].[ext]"
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: "IRC",
			template: "./index.html",
			seo: {
				keywords: "fast,messenger,zeronet",
				description: "Good ol' IRC"
			}
		}),
		new CopyWebpackPlugin([
			{
				from: "./content.json",
				to: "./content.json"
			}
		]),
		new CopyWebpackPlugin([
			{
				from: "./dbschema.json",
				to: "./dbschema.json"
			}
		]),
		new CopyWebpackPlugin([
			{
				from: "./p2p.json",
				to: "./p2p.json"
			}
		]),
		new CopyWebpackPlugin([
			{
				from: "./data",
				to: "./data"
			}
		]),
		new CopyWebpackPlugin([
			{
				from: "./storage",
				to: "./storage"
			}
		]),
		new CopyWebpackPlugin([
			{
				from: "./DefaultBot.js",
				to: "./DefaultBot.js"
			}
		]),
		new CopyWebpackPlugin([
			{
				from: "./0background.py",
				to: "./0background.py"
			}
		]),
		new CircularDependencyPlugin({
			exclude: /node_modules/,
			failOnError: true,
			allowAsyncCycles: true,
			cwd: process.cwd(),

			onStart() {
				circularErrors = [];
			},
			onDetected({paths, compilation}) {
				let newPaths = Array.from(paths);
				newPaths.pop();
				for(let i = 0; i < newPaths.length; i++) {
					newPaths.push(newPaths.shift());
					if(circularErrors.indexOf(newPaths.join(" -> ")) > -1) {
						return;
					}
				}
				circularErrors.push(newPaths.join(" -> "));

				if(!paths.some(path => path.indexOf("node_modules") > -1)) {
					// Ignore crypto bugs, etc.
					compilation.errors.push(new Error(paths.join(" -> ")));
				}
			}
		})
	].concat(CHUNKS.map(([_, regexp], i, arr) => {
		// Thank you for wonderful CommonsChunkPlugin usage
		return new webpack.optimize.CommonsChunkPlugin({
			name: arr[i + 1] ? arr[i + 1][0] : "main",
			minChunks: module => !regexp.test(module.resource || "")
		});
	})).concat([
		new UglifyJsPlugin({
			parallel: true,
			cache: true
		}),
		new BundleAnalyzerPlugin({
			analyzerPort: 8080
		})
	])
};