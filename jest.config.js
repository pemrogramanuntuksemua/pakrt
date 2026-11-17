module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  moduleFileExtensions: ["js", "json", "gs"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  collectCoverageFrom: ["kode.gs"],
};
