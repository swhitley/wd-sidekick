const packageJsonPath = require('path').join(__dirname, '../../package.json');

const packageJson = require(packageJsonPath);

module.exports = {
  name: "WD Sidekick", //packageJson.name,
  description: packageJson.description,
  version: packageJson.version
};
