const { withAppBuildGradle } = require('@expo/config-plugins');

function withAndroidPathFix(config) {
  return withAppBuildGradle(config, async (config) => {
    let content = config.modResults.contents;
    // Safely replace the broken path evaluation with an absolute string path
    content = content.replace(
      /def projectRoot = [^\n]*/g,
      'def projectRoot = "/home/expo/workingdir/build/sewer-app"'
    );
    config.modResults.contents = content;
    return config;
  });
}

module.exports = withAndroidPathFix;