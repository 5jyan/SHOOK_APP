const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix import.meta issues for web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native$': 'react-native-web'
};

// Web-specific transformer settings
config.transformer = {
  ...config.transformer,
  webpackTransforms: {
    ...config.transformer.webpackTransforms,
    enableImportMeta: false,
  },
};

// Additional web platform settings
config.resolver.platforms = ['native', 'web', 'android', 'ios'];

module.exports = config;