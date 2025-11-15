const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to add Kakao SDK Maven repository
 * This is needed because Kakao SDK is not available in standard Maven repositories
 */
const withKakaoMavenRepo = (config) => {
  return withProjectBuildGradle(config, (config) => {
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
};

module.exports = withKakaoMavenRepo;
