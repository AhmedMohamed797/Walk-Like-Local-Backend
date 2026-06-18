export default {
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["./tests/setup.js"],
};
