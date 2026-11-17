function createMockSheet(rows, options = {}) {
  const data = rows ? rows.map((r) => r.slice()) : [];
  const appended = [];
  const sheet = {
    getDataRange: () => ({
      getValues: () => data,
    }),
    getLastRow: () => (options.lastRow != null ? options.lastRow : data.length),
    appendRow: (row) => {
      appended.push(row);
      data.push(row);
    },
    _appended: appended,
    _data: data,
  };
  return sheet;
}

function createMockSpreadsheet(sheets = {}) {
  return {
    getSheetByName: (name) => (Object.prototype.hasOwnProperty.call(sheets, name) ? sheets[name] : null),
  };
}

function setSpreadsheet(sheets) {
  const spreadsheet = createMockSpreadsheet(sheets);
  global.SpreadsheetApp = {
    openById: () => spreadsheet,
  };
  return spreadsheet;
}

module.exports = { createMockSheet, createMockSpreadsheet, setSpreadsheet };
