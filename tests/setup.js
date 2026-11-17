global.SpreadsheetApp = {
  openById: () => ({ getSheetByName: () => null }),
};
global.UrlFetchApp = {
  fetch: () => ({ getContentText: () => "" }),
};
global.ContentService = {
  createTextOutput: () => ({ setMimeType: () => ({}) }),
  MimeType: { JSON: "application/json" },
};
global.Logger = { log: () => {} };

global.LockService = {
  getScriptLock: () => ({
    tryLock: () => true,
    releaseLock: () => {},
  }),
};

global.ScriptApp = {
  getProjectTriggers: () => [],
  newTrigger: () => ({
    timeBased: () => ({
      everyMinutes: () => ({
        create: () => ({}),
      }),
    }),
  }),
  deleteTrigger: () => {},
};

const __propsStore = {};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) =>
      Object.prototype.hasOwnProperty.call(__propsStore, k) ? __propsStore[k] : null,
    setProperty: (k, v) => {
      __propsStore[k] = v;
    },
  }),
  __store: __propsStore,
};
