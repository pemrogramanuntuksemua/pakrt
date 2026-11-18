const pakrt = require("../main");

describe("isAdmin", () => {
  beforeEach(() => {
    pakrt.setAdminIds([]);
  });

  test("mengembalikan false untuk user yang tidak terdaftar", () => {
    expect(pakrt.isAdmin(123)).toBe(false);
    expect(pakrt.isAdmin("999")).toBe(false);
  });

  test("mengembalikan true untuk admin yang terdaftar", () => {
    pakrt.setAdminIds([123, "456"]);
    expect(pakrt.isAdmin(123)).toBe(true);
    expect(pakrt.isAdmin("456")).toBe(true);
    expect(pakrt.isAdmin("123")).toBe(true);
  });
});
