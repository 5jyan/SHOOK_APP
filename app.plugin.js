const { withAndroidManifest, withAppDelegate, withProjectBuildGradle } = require('@expo/config-plugins');
const IOS_LAUNCH_BACKGROUND = 'UIColor(red: 16.0 / 255.0, green: 16.0 / 255.0, blue: 19.0 / 255.0, alpha: 1.0)';

const withIosLaunchBackground = (config) => withAppDelegate(config, (config) => {
  if (config.modResults.language !== 'swift') {
    throw new Error('Expected a Swift AppDelegate to configure the iOS launch background');
  }

  const backgroundAssignment = `window?.backgroundColor = ${IOS_LAUNCH_BACKGROUND}`;
  if (!config.modResults.contents.includes(backgroundAssignment)) {
    config.modResults.contents = config.modResults.contents.replace(
      '    window = UIWindow(frame: UIScreen.main.bounds)',
      `    window = UIWindow(frame: UIScreen.main.bounds)\n    ${backgroundAssignment}`,
    );
  }

  const rootViewCustomization = `  override func customize(_ rootView: UIView) {
    super.customize(rootView)
    rootView.backgroundColor = ${IOS_LAUNCH_BACKGROUND}
  }`;
  if (!config.modResults.contents.includes(rootViewCustomization)) {
    config.modResults.contents = config.modResults.contents.replace(
      'class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {',
      `class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {\n${rootViewCustomization}`,
    );
  }

  return config;
});

/**
 * Custom Expo config plugin to add Kakao SDK Maven repository
 * This is needed because Kakao SDK is not available in standard Maven repositories
 */
const withKakaoMavenRepo = (config) => {
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('devrepo.kakao.com')) {
      return config;
    }

    // Add Kakao Maven repository to allprojects.repositories
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{[\s\S]*?repositories\s*\{/,
      (match) => {
        return match + `
        maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }`;
      }
    );

    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0]?.$;
    if (application) {
      application['android:usesCleartextTraffic'] = config.extra?.isE2E ? 'true' : 'false';
    }
    return config;
  });

  return withIosLaunchBackground(config);
};

module.exports = withKakaoMavenRepo;
