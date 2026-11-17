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
