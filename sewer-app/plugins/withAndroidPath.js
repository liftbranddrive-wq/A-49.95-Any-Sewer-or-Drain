const { withAppBuildGradle } = require('@expo/config-plugins');

function withAndroidPathFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents) {
      // Replace the parent-file lookup chain with a direct string path
      config.modResults.contents = config.modResults.contents.replace(
        /def projectRoot = [^\n]*/g,
        'def projectRoot = "/home/expo/workingdir/build/sewer-app"'
      );
    }
    return config;
  });
}

module.exports = withAndroidPathFix;