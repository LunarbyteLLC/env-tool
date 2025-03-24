// Test file for env-tool installation tests
function getApiKey() {
  return process.env.TEST_API_KEY;
}

function getDatabaseUrl() {
  return process.env.TEST_DATABASE_URL;
}

console.log(`Server starting with debug mode: ${process.env.TEST_DEBUG_MODE}`); 