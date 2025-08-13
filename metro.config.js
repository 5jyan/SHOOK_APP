const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix import.meta issues for web
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native$': 'react-native-web',
  '@/components': path.resolve(__dirname, 'components'),
  '@/src/components': path.resolve(__dirname, 'src/components'),
  '@/hooks': path.resolve(__dirname, 'hooks'),
  '@/src/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/services': path.resolve(__dirname, 'src/services'),
  '@/stores': path.resolve(__dirname, 'src/stores'),
  '@/lib': path.resolve(__dirname, 'src/lib'),
  '@/types': path.resolve(__dirname, 'src/types'),
  '@/constants': path.resolve(__dirname, 'constants'),
  '@/contexts': path.resolve(__dirname, 'src/contexts'),
  '@/assets': path.resolve(__dirname, 'assets')
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