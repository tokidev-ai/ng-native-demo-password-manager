const { getDefaultConfig } = require('expo/metro-config');
const { withAngularNative } = require('@ng-native/metro/config.cjs');
const { withTailwind } = require('@ng-native/tailwind/config.cjs');

// Registers the transformer that compiles Angular ahead of time, compiles each component's CSS
// into the sheet the engine reads, and adds the polyfills Angular needs before `@angular/core`
// is first evaluated. withTailwind builds src/styles.css into .angular-native/app.tailwind.js.
module.exports = withTailwind(withAngularNative(getDefaultConfig(__dirname)), {
  input: './src/styles.css',
});
