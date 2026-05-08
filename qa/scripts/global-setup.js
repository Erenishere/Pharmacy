const seedSmokeData = require('./seed-smoke-data');

module.exports = async function globalSetup() {
  if (process.env.QA_SKIP_SEED === '1') {
    return;
  }

  await seedSmokeData();
};
