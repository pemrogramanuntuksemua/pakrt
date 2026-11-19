function handleAdmin(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const arg = teksPerintah(text, CMD_ADMIN);
    const bagian = arg.split("#").map((x) => x.trim()).filter(Boolean);
    const aksi = (bagian[0] || "").toLowerCase();
    const inti = ADMIN_IDS.map((id) => str(id)).filter(Boolean);
    if (!aksi) {
      const tambahan = getAdminTambahan();
      sendAdminMessage(
        chatId,
        "📝 *ADMIN PAKRT*\n\n" +
          "*Inti (kode):*\n" +
          (inti.length ? inti.map((id) => "• `" + id + "`").join("\n") : "• (belum diisi)") +
          "\n\n*Tambahan (Setting):*\n" +
          (tambahan.length ? tambahan.map((id) => "• `" + id + "`").join("\n") : "• (belum ada)") +
          "\n\nTambah: `/admin tambah <id_telegram>`\n" +
          "Hapus: `/admin hapus <id_telegram>`\n" +
          "_Hanya admin inti yang bisa mengubah daftar._"
      );
      return;
    }
    if (aksi !== "tambah" && aksi !== "hapus") {
      sendAdminMessage(
        chatId,
        "⚠️ Gunakan:\n`/admin`\n`/admin tambah <id_telegram>`\n`/admin hapus <id_telegram>`"
      );
      return;
    }
    if (!isAdminInti(userId)) {
      sendAdminMessage(chatId, "⛔ Hanya admin inti yang bisa mengubah daftar admin.");
      return;
    }
    const daftarId = parseAdminIds(bagian.slice(1).join(" "));
    if (!daftarId.length) {
      sendAdminMessage(chatId, "⚠️ Sebutkan id_telegram. Contoh: `/admin tambah 123456789`");
      return;
    }
    const tidakValid = daftarId.filter((id) => !/^\d+$/.test(id));
    if (tidakValid.length) {
      throw new Error("ID Telegram harus berupa angka: " + tidakValid.join(", "));
    }
    const tambahan = getAdminTambahan();
    if (aksi === "tambah") {
      const ditambah = [];
      const sudahInti = [];
      const sudahAda = [];
      daftarId.forEach((id) => {
        if (inti.indexOf(id) >= 0) sudahInti.push(id);
        else if (tambahan.indexOf(id) >= 0) sudahAda.push(id);
        else {
          tambahan.push(id);
          ditambah.push(id);
        }
      });
      if (ditambah.length) {
        simpanAdminTambahan(tambahan);
        ditambah.forEach((id) => {
          try {
            sendAdminMessage(
              id,
              "✅ Anda ditambahkan sebagai admin Pakrt oleh " + str(senderName || "pengurus") + "."
            );
          } catch (e) {
            Logger.log("Gagal kirim DM ke admin baru " + id + ": " + e.toString());
          }
        });
        sendAdminMessage(
        chatId,
          "✅ *Admin ditambahkan*\n\n" +
            ditambah.map((id) => "• `" + id + "`").join("\n") +
            "\n\nTotal admin tambahan: *" + tambahan.length + "*" +
            (sudahInti.length ? "\n\nSudah admin inti: " + sudahInti.join(", ") : "") +
            (sudahAda.length ? "\n\nSudah terdaftar: " + sudahAda.join(", ") : "")
        );
      } else {
        sendAdminMessage(
        chatId,
          "ℹ️ Tidak ada admin baru." +
            (sudahInti.length ? "\n\nSudah admin inti: " + sudahInti.join(", ") : "") +
            (sudahAda.length ? "\n\nSudah terdaftar: " + sudahAda.join(", ") : "")
        );
      }
      return;
    }
    const dihapus = tambahan.filter((id) => daftarId.indexOf(id) >= 0);
    const sisa = tambahan.filter((id) => daftarId.indexOf(id) < 0);
    const intiTetap = daftarId.filter((id) => inti.indexOf(id) >= 0);
    const asing = daftarId.filter((id) => inti.indexOf(id) < 0 && tambahan.indexOf(id) < 0);
    if (dihapus.length) {
      simpanAdminTambahan(sisa);
      sendAdminMessage(
        chatId,
        "✅ *Admin dihapus*\n\n" +
          dihapus.map((id) => "• `" + id + "`").join("\n") +
          "\n\nSisa admin tambahan: *" + sisa.length + "*" +
          (intiTetap.length ? "\n\nAdmin inti tidak bisa dihapus: " + intiTetap.join(", ") : "") +
          (asing.length ? "\n\nTidak terdaftar: " + asing.join(", ") : "")
      );
    } else {
      sendAdminMessage(
        chatId,
        "ℹ️ Tidak ada admin tambahan yang dihapus." +
          (intiTetap.length ? "\n\nAdmin inti tidak bisa dihapus: " + intiTetap.join(", ") : "") +
          (asing.length ? "\n\nTidak terdaftar: " + asing.join(", ") : "")
      );
    }
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleBuatPengumuman(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const textClean = teksPerintah(text, CMD_BUATPENGUMUMAN);
    const parts = textClean.split("#").map((p) => p.trim());
    const kategori = parts[0] || "";
    const isiPesan = parts.slice(1).join("#").trim();
    if (!kategori || !isiPesan) {
      sendAdminMessage(
        chatId,
        "⚠️ *Format Salah!*\nGunakan: `/buatpengumuman Kategori#Isi Pesan`"
      );
      return;
    }
    const sheet = getSpreadsheet(SHEET_PENGUMUMAN);
    if (!sheet) {
      sendAdminMessage(chatId, "⚠️ Tab 'Pengumuman' belum dibuat di Google Sheets.");
      return;
    }
    sheet.appendRow([new Date(), kategori, isiPesan, senderName]);
    if (GROUP_CHAT_ID) {
      sendTelegramMessage(
        GROUP_CHAT_ID,
        "📢 *PENGUMUMAN RT*\n\n🏷️ Kategori: *" + escMd(kategori) + "*\n📝 " + isiPesan +
          "\n\n_Disampaikan oleh Pengurus_"
      );
    }
    sendAdminMessage(
        chatId,
      "✅ *Pengumuman Berhasil Disimpan & Disebar!*\n\n🏷️ Kategori: *" + escMd(kategori) + "*\n📝 " + isiPesan
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleTambahWarga(chatId, text, senderName, userId) {
  sendAdminMessage(
        chatId,
    "⚠️ `/tambahwarga` sudah diganti.\n\nGunakan:\n" +
      "`/tambahkk Nama#No HP#No Rumah#Alamat#Catatan`\n" +
      "`/tambahanggota id_kk#Nama#Hubungan#L/P#YYYY-MM-DD`"
  );
}

function handleTambahKK(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const parts = teksPerintah(text, CMD_TAMBAHKK).split("#").map((p) => p.trim());
    const nama = parts[0] || "";
    const noHp = parts[1] || "";
    const noRumah = parts[2] || "";
    const alamat = parts[3] || "";
    const catatan = parts.slice(4).join("#").trim();
    if (!nama || !noRumah) {
      sendAdminMessage(
        chatId,
        "⚠️ *Format Salah!*\nGunakan: `/tambahkk Nama#No HP#No Rumah#Alamat#Catatan`"
      );
      return;
    }
    const kk = tambahKeluarga(
      { nama_kk: nama, no_hp: noHp, no_rumah: noRumah, alamat: alamat, catatan: catatan },
      senderName
    );
    sendAdminMessage(
        chatId,
      "✅ *KK Berhasil Ditambahkan!*\n\n" +
        "🆔 ID: *" + kk.id_kk + "*\n" +
        "👤 Kepala Keluarga: *" + escMd(kk.nama_kk) + "*\n" +
        "🏠 No Rumah: *" + escMd(kk.no_rumah) + "*\n" +
        "📞 No HP: " + escMd(kk.no_hp || "-") + "\n" +
        "📍 " + escMd(kk.alamat || "-") + "\n" +
        "📅 Mulai iuran: " + kk.mulai_iuran + "\n\n" +
        "Tambahkan anggota lain dengan `/tambahanggota " + kk.id_kk + "#Nama#Hubungan#L/P#YYYY-MM-DD`.\n" +
        "Lengkapi data kepala keluarga: `/editanggota " + kk.id_kk + "#" + kk.nama_kk + "#jk=L#lahir=YYYY-MM-DD`."
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleTambahAnggota(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const parts = teksPerintah(text, CMD_TAMBAHANGGOTA).split("#").map((p) => p.trim());
    const idKK = parts[0] || "";
    const nama = parts[1] || "";
    const hubungan = parts[2] || "Anggota";
    const jk = parts[3] || "";
    const lahir = parts[4] || "";
    const catatan = parts.slice(5).join("#").trim();
    if (!idKK || !nama) {
      sendAdminMessage(
        chatId,
        "⚠️ *Format Salah!*\nGunakan: `/tambahanggota id_kk#Nama#Hubungan#L/P#YYYY-MM-DD`"
      );
      return;
    }
    const kk = cariKeluarga(idKK);
    tambahAnggota(kk.id_kk, {
      nama: nama,
      hubungan: hubungan,
      jenis_kelamin: jk,
      tanggal_lahir: lahir,
      catatan: catatan,
    });
    sendAdminMessage(
        chatId,
      "✅ *Anggota Berhasil Ditambahkan!*\n\n" +
        "👤 " + escMd(nama) + "\n" +
        "🆔 KK: " + kk.id_kk + " (" + escMd(kk.nama_kk) + ")\n" +
        "🔗 Hubungan: " + escMd(hubungan) + "\n" +
        "⚧ " + (normalizeJK(jk) || "-") + " · 🎂 " + (lahir || "-")
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleEditAnggota(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const parts = teksPerintah(text, CMD_EDITANGGOTA).split("#").map((p) => p.trim());
    const idKK = parts[0] || "";
    const namaLama = parts[1] || "";
    if (!idKK || !namaLama || parts.length < 3) {
      sendAdminMessage(
        chatId,
        "⚠️ *Format Salah!*\nGunakan: `/editanggota id_kk#Nama#kolom=nilai`\n" +
          "Kolom: `nama`, `hubungan`, `jk`, `lahir`, `status`, `catatan`\n" +
          "Contoh: `/editanggota KK-001#Budi#jk=L#lahir=1990-01-01`"
      );
      return;
    }
    const peta = {
      nama: "nama",
      hubungan: "hubungan",
      jk: "jenis_kelamin",
      jenis_kelamin: "jenis_kelamin",
      lahir: "tanggal_lahir",
      tanggal_lahir: "tanggal_lahir",
      status: "status",
      catatan: "catatan",
    };
    const perubahan = {};
    parts.slice(2).forEach((seg) => {
      const idx = seg.indexOf("=");
      if (idx <= 0) {
        throw new Error("Format perubahan harus kolom=nilai: '" + seg + "'.");
      }
      const kunci = seg.slice(0, idx).trim().toLowerCase();
      const nilai = seg.slice(idx + 1).trim();
      const kolom = peta[kunci];
      if (!kolom) {
        throw new Error(
          "Kolom '" + kunci + "' tidak dikenal. Gunakan: nama, hubungan, jk, lahir, status, catatan."
        );
      }
      perubahan[kolom] = nilai;
    });
    const hasil = ubahAnggota(idKK, namaLama, perubahan);
    const urut = ["nama", "hubungan", "jenis_kelamin", "tanggal_lahir", "status", "catatan"];
    const baris = urut
      .filter((k) => Object.prototype.hasOwnProperty.call(hasil.perubahan, k))
      .map((k) => {
        const lama = str(hasil.sebelum[k]) || "-";
        const baru = str(hasil.sesudah[k]) || "-";
        return "• " + k + ": " + escMd(lama) + " → *" + escMd(baru) + "*";
      });
    sendAdminMessage(
        chatId,
      "✅ *Anggota diperbarui*\n\n" +
        "🆔 KK: " + hasil.id_kk + " (" + escMd(hasil.nama_kk) + ")\n" +
        "👤 " + escMd(hasil.sesudah.nama) + " — " + escMd(hasil.sesudah.hubungan) + "\n\n" +
        baris.join("\n")
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleBayar(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const bagian = teksPerintah(text, CMD_BAYAR).split("#").map((x) => x.trim()).filter(Boolean);
    if (!bagian.length) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/bayar <id_kk/no_rumah/nama> <periode...>`");
      return;
    }
    const kk = cariKeluarga(bagian[0]);
    const periode = bagian.slice(1);
    const hasil = catatPembayaran(kk, periode, senderName);
    const totalKantong = {};
    hasil.detail.forEach((d) => {
      d.pembagian.forEach((b) => {
        totalKantong[b.kode] = (totalKantong[b.kode] || 0) + b.nominal;
      });
    });
    const rincianKantong = Object.keys(totalKantong).map(
      (kode) => "• " + padKanan(kode, 8) + padKiri(fmtRp(totalKantong[kode]), 12)
    );
    const tarif = hasil.detail.map((d) => fmtRp(d.nominal)).join(" / ");
    sendAdminMessage(
        chatId,
      "✅ *Pembayaran iuran dicatat*\n\n" +
        "👤 " + escMd(kk.nama_kk) + " (" + kk.id_kk + " / " + escMd(kk.no_rumah) + ")\n" +
        "📅 Periode: " + hasil.periode.join(", ") + "\n" +
        "💰 Tagihan: " + tarif + "\n" +
        "💵 Total: *" + fmtRp(hasil.total) + "*\n\n" +
        "*Pembagian kantong:*\n" + rincianKantong.join("\n")
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleVerifikasi(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const arg = teksPerintah(text, CMD_VERIFIKASI);
    if (!arg) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/verifikasi <id_kk|id_telegram>`");
      return;
    }
    const t = verifikasiKeterkaitan(arg, senderName);
    const kk = t.keluarga || {};
    sendAdminMessage(
        chatId,
      "✅ *Pengajuan disetujui*\n\n" +
        "👤 " + escMd(t.nama || "-") +
        (t.username ? " (@" + escMd(t.username) + ")" : "") + "\n" +
        "🆔 id_telegram: `" + t.id_telegram + "`\n" +
        "🏠 KK: *" + kk.id_kk + "* · " + escMd(kk.no_rumah) + " · " + escMd(kk.nama_kk)
    );
    sendTelegramMessage(
      t.id_telegram,
      "✅ Akun Anda kini terhubung ke KK *" + kk.id_kk + "* (" + escMd(kk.nama_kk) + ").\n" +
        "Ketik /tagihan atau /tunggakan."
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleTolak(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const arg = teksPerintah(text, CMD_TOLAK);
    if (!arg) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/tolak <id_kk|id_telegram>`");
      return;
    }
    const t = tolakKeterkaitan(arg, senderName);
    const kk = t.keluarga || {};
    sendAdminMessage(
        chatId,
      "❌ *Pengajuan ditolak*\n\n" +
        "🆔 id_telegram: `" + t.id_telegram + "`\n" +
        "🏠 KK: *" + kk.id_kk + "* · " + escMd(kk.nama_kk)
    );
    sendTelegramMessage(
      t.id_telegram,
      "❌ Pengajuan keterkaitan ke KK *" + kk.id_kk + "* (" + escMd(kk.nama_kk) + ") ditolak pengurus."
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleCabut(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const arg = teksPerintah(text, CMD_CABUT);
    if (!arg) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/cabut <id_kk|id_telegram>`");
      return;
    }
    const rows = cabutKeterkaitan(arg, senderName);
    sendAdminMessage(
        chatId,
      "⛔ *Keterkaitan dicabut*\n\n" +
        "Jumlah akun: *" + rows.length + "*\n" +
        rows.map((t) => "• `" + t.id_telegram + "` → " + t.id_kk).join("\n")
    );
    rows.forEach((t) => {
      sendTelegramMessage(
        t.id_telegram,
        "⛔ Keterkaitan akun Anda dengan KK *" + t.id_kk + "* telah dicabut pengurus."
      );
    });
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleCabutKK(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const arg = teksPerintah(text, CMD_CABUTKK);
    if (!arg) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/cabutkk <id_kk>`");
      return;
    }
    const kk = cariKeluarga(arg);
    let rows = [];
    try {
      rows = cabutKeterkaitan(kk.id_kk, senderName);
    } catch (e) {
      rows = [];
    }
    if (kk._row) setSel(SHEET_KELUARGA, kk._row, "status", "Pindah");
    const anggota = getAnggota(kk.id_kk);
    anggota.forEach((a) => {
      if (a._row) setSel(SHEET_ANGGOTA, a._row, "status", "Pindah");
    });
    sendAdminMessage(
      chatId,
      "⛔ *KK dinonaktifkan*\n\n" +
        "🆔 *" + kk.id_kk + "* · " + escMd(kk.nama_kk) + "\n" +
        "Akun Telegram dicabut: *" + rows.length + "*\n" +
        "Anggota dinonaktifkan: *" + anggota.length + "*"
    );
    rows.forEach((t) => {
      try {
        sendTelegramMessage(
          t.id_telegram,
          "⛔ KK *" + kk.id_kk + "* telah dinonaktifkan pengurus."
        );
      } catch (e) {
        // abaikan
      }
    });
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleRekap(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const raw = teksPerintah(text, CMD_REKAP).trim();
    let dari;
    let sampai;
    if (!raw) {
      dari = periodeSekarang();
      sampai = dari;
    } else if (raw.includes("..")) {
      const [aRaw, bRaw] = raw.split("..").map((x) => x.trim());
      const a = parsePeriode(aRaw);
      const b = parsePeriode(bRaw);
      if (!a || !a.bulanan || !b || !b.bulanan) {
        throw new Error("Rentang harus dua periode YYYY-MM.");
      }
      dari = a.periode;
      sampai = b.periode;
    } else {
      const p = parsePeriode(raw);
      if (!p) throw new Error("Format: /rekap [YYYY-MM|YYYY] atau /rekap YYYY-MM..YYYY-MM");
      if (p.bulanan) {
        dari = p.periode;
        sampai = p.periode;
      } else {
        dari = p.tahun + "-01";
        const now = periodeSekarang();
        sampai = now.slice(0, 4) === String(p.tahun) ? now : p.tahun + "-12";
      }
    }
    const rekap = hitungRekapRentang(dari, sampai);
    sendAdminMessage(
        chatId,
      dari === sampai ? formatRekapBulanan(rekap.perPeriode[0]) : formatRekapRentang(rekap)
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleDaftar(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const args = teksPerintah(text, CMD_DAFTAR).split("#").map((x) => x.trim()).filter(Boolean);
    let semua = false;
    let urut = "rumah";
    let halaman = 1;
    args.forEach((a) => {
      const low = a.toLowerCase();
      if (low === "semua") semua = true;
      else if (low === "tagihan" || low === "nama" || low === "rumah") urut = low;
      else if (/^\d+$/.test(low)) halaman = Math.max(1, Number(low));
    });
    const semuaKK = getDaftarKK({ semua: semua, urut: urut });
    const perHalaman = 25;
    const totalHalaman = Math.max(1, Math.ceil(semuaKK.length / perHalaman));
    const page = Math.min(halaman, totalHalaman);
    const mulai = (page - 1) * perHalaman;
    const rows = semuaKK.slice(mulai, mulai + perHalaman);
    if (!semuaKK.length) {
      sendAdminMessage(chatId, "ℹ️ Belum ada KK terdaftar. Tambah lewat `/tambahkk`.");
      return;
    }
    sendAdminMessage(
        chatId,
      formatDaftarKK(rows, {
        sampai: periodeSekarang(),
        totalKK: semuaKK.length,
        totalJiwa: semuaKK.reduce((t, r) => t + r.jiwa, 0),
        totalTunggakan: semuaKK.reduce((t, r) => t + r.tunggakan, 0),
        halaman: page,
        totalHalaman: totalHalaman,
      })
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleSetting(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  const nilai = getSettings();
  const baris = Object.keys(DEFAULT_SETTINGS).map(
    (k) => "• `" + k + "`: *" + String(nilai[k]) + "*  _(" + DEFAULT_SETTINGS[k].keterangan + ")_"
  );
  sendAdminMessage(
        chatId,
    "⚙️ *PENGATURAN PAKRT*\n\n" + baris.join("\n") +
      "\n\nUbah dengan `/set <kunci> <nilai>`."
  );
}

function handleSet(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const bagian = teksPerintah(text, CMD_SET).split("#").map((x) => x.trim()).filter(Boolean);
    const kunci = bagian[0] || "";
    if (!kunci) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/set <kunci> <nilai> [periode]`");
      return;
    }
    if (kunci === "admin_tambahan") {
      throw new Error("Gunakan `/admin tambah <id_telegram>` atau `/admin hapus <id_telegram>`.");
    }
    if (kunci === "iuran_bulanan") {
      const nilai = bagian[1];
      if (nilai === undefined) {
        sendAdminMessage(chatId, "⚠️ Gunakan: `/set <kunci> <nilai> [periode]`");
        return;
      }
      const p = parsePeriode(bagian[2] || periodeSekarang());
      if (!p || !p.bulanan) throw new Error("Periode tarif harus format YYYY-MM.");
      const nominal = parseAngka(nilai);
      const hasil = setTarif(p.periode, nominal, "Perubahan via /set oleh " + str(senderName));
      setSetting("iuran_bulanan", nominal);
      sendAdminMessage(
        chatId,
        "✅ *Tarif diperbarui*\n\n" +
          "📅 Periode: *" + p.periode + "*\n" +
          "💰 Tarif: *" + fmtRp(hasil.nominal) + "*\n" +
          "🧾 Tagihan 'belum' disesuaikan: " + hasil.tagihanDiubah + " baris\n\n" +
          hasil.pembagian.map((b) => "• " + b.kode + " — " + fmtRp(b.nominal)).join("\n")
      );
      return;
    }
    const nilai = bagian.slice(1).join(" ");
    if (!nilai) {
      sendAdminMessage(chatId, "⚠️ Gunakan: `/set <kunci> <nilai> [periode]`");
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, kunci)) {
      throw new Error("Kunci '" + kunci + "' tidak dikenal. Lihat /setting.");
    }
    const def = DEFAULT_SETTINGS[kunci];
    const dikonversi =
      def.tipe === "angka" ? parseAngka(nilai) :
      def.tipe === "boolean" ? toBool(nilai) : str(nilai);
    setSetting(kunci, dikonversi);
    sendAdminMessage(
        chatId,
      "✅ *Pengaturan disimpan*\n\n• `" + kunci + "`: *" + String(dikonversi) + "*"
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleTarif(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  const list = getTarifList();
  const aktif = getTarifUntukPeriode(periodeSekarang());
  const baris = list.map(
    (t) => "• " + t.berlaku_mulai + " — *" + fmtRp(t.nominal) + "*" +
      (t.keterangan ? "  _" + t.keterangan + "_" : "")
  );
  sendAdminMessage(
        chatId,
    "💵 *TARIF IURAN*\n\n" +
      (baris.length ? baris.join("\n") : "• (belum ada histori tarif)") +
      "\n\nBerlaku sekarang: *" + fmtRp(aktif) + "* per KK\n" +
      "Ubah: `/set iuran_bulanan <nominal> [YYYY-MM]`"
  );
}

function handleAlokasi(chatId, text, senderName, userId) {
  try {
    const tarif = getTarifUntukPeriode(periodeSekarang());
    const pembagian = hitungPembagian(tarif);
    const val = validasiAlokasi();
    const baris = val.list.map((a) => {
      const nominal = a.sisa ? tarif - val.totalTetap : a.nominal;
      return (
        padKanan(a.kode, 8) + padKanan(a.nama, 26) + padKiri(fmtRp(nominal), 12) +
        (a.sisa ? "  (sisa)" : "")
      );
    });
    sendAdminMessage(
        chatId,
      "🧩 *ALOKASI IURAN* — " + fmtRp(tarif) + " / KK\n\n" +
        "```\n" + padKanan("kode", 8) + padKanan("kantong", 26) + padKiri("nominal", 12) + "\n" +
        "─".repeat(46) + "\n" + baris.join("\n") + "\n" +
        "─".repeat(46) + "\n" +
        padKanan("TOTAL", 34) + padKiri(fmtRp(tarif), 12) + "\n```\n\n" +
        "Ketik kode kantong di /kas, /tambahkas, dan /pindahkas."
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleTambahKas(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const parts = teksPerintah(text, CMD_TAMBAHKAS).split("#").map((p) => p.trim());
    const jenis = (parts[0] || "").toLowerCase();
    const kodeDikenal = getAlokasiAktif().some((a) => a.kode === (parts[1] || "").toLowerCase());
    if (parts.length >= 2 && !kodeDikenal && parseAngka(parts[1]) > 0) {
      sendAdminMessage(
        chatId,
        "⚠️ *Format /tambahkas berubah.*\n\n" +
          "Sekarang wajib menyebut kantong:\n" +
          "`/tambahkas jenis#alokasi#nominal#keterangan`\n\n" +
          "Contoh:\n`/tambahkas keluar#kamsih#400000#Honor satpam`\n" +
          "Lihat kantong dengan /alokasi."
      );
      return;
    }
    const alokasi = (parts[1] || "").toLowerCase();
    const nominal = parseAngka(parts[2]);
    const keterangan = parts.slice(3).join("#").trim() || "Tanpa Keterangan";
    if ((jenis !== JENIS_MASUK && jenis !== JENIS_KELUAR) || !alokasi || !isFinite(nominal) || nominal <= 0) {
      sendAdminMessage(
        chatId,
        "⚠️ *Format Salah!*\nGunakan: `/tambahkas jenis#alokasi#nominal#keterangan`\n" +
          "Contoh: `/tambahkas keluar#kamsih#400000#Honor satpam`"
      );
      return;
    }
    const hasil = tambahKasManual(jenis, alokasi, nominal, keterangan, senderName);
    invalidateKasCache();
    sendAdminMessage(
        chatId,
      "✅ *Kas Berhasil Dicatat!*\n\n" +
        "📌 Jenis: *" + hasil.jenis.toUpperCase() + "*\n" +
        "👛 Kantong: *" + hasil.alokasi + "*\n" +
        "💰 Nominal: *" + fmtRp(hasil.nominal) + "*\n" +
        "📝 " + escMd(keterangan) + "\n" +
        "💎 Saldo kantong: *" + fmtRp(hasil.saldo) + "*"
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handlePindahKas(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const parts = teksPerintah(text, CMD_PINDAHKAS).split("#").map((p) => p.trim());
    const asal = (parts[0] || "").toLowerCase();
    const tujuan = (parts[1] || "").toLowerCase();
    const nominal = parseAngka(parts[2]);
    const keterangan = parts.slice(3).join("#").trim() || "Pindah kas";
    if (!asal || !tujuan || !nominal || nominal <= 0) {
      throw new Error("Gunakan: /pindahkas asal#tujuan#nominal#keterangan");
    }
    const hasil = pindahKas(asal, tujuan, nominal, keterangan, senderName);
    invalidateKasCache();
    sendAdminMessage(
        chatId,
      "✅ *Dana berhasil dipindahkan*\n\n" +
        "Dari  : " + hasil.dari + "\n" +
        "Ke    : " + hasil.ke + "\n" +
        "Jumlah: *" + fmtRp(hasil.nominal) + "*\n" +
        "Sisa " + hasil.dari + ": *" + fmtRp(hasil.saldoAsal) + "*"
    );
  } catch (e) {
    balasError(chatId, e);
  }
}

function handleTutupBuku(chatId, text, senderName, userId) {
  if (!isAdmin(userId)) {
    tolakAdmin(chatId);
    return;
  }
  try {
    const arg = teksPerintah(text, CMD_TUTUPBUKU);
    if (!arg) throw new Error("Gunakan: /tutupbuku <YYYY-MM|YYYY>");
    const hasil = tutupBuku(arg, senderName);
    if (hasil.jenis === "bulan") {
      const r = hasil.rekap;
      sendAdminMessage(
        chatId,
        "🔒 *TUTUP BUKU " + labelPeriode(hasil.periode).toUpperCase() + "*\n\n" +
          "👥 KK: " + r.totalKK + " · Jiwa: " + r.totalJiwa + "\n" +
          "🎯 Target: " + fmtRp(r.totalTagihan) + "\n" +
          "✅ Terbayar: " + fmtRp(r.terbayar) + "\n" +
          "⏳ Tunggakan: " + fmtRp(r.tunggakan) + "\n\n" +
          "💵 Masuk: " + fmtRp(hasil.kas.totalMasuk) + "\n" +
          "📤 Keluar: " + fmtRp(hasil.kas.totalKeluar) + "\n" +
          "💎 Saldo akhir: *" + fmtRp(hasil.kas.totalSaldoAkhir) + "*\n\n" +
          hasil.kas.perKantong.map(
            (d) => "• " + d.kode + ": " + fmtRp(d.saldo_akhir)
          ).join("\n")
      );
      return;
    }
    sendAdminMessage(
        chatId,
      "🔒 *TUTUP BUKU TAHUN " + hasil.periode + "*\n\n" +
        "🎯 Target setahun: " + fmtRp(hasil.rekap.total_tagihan) + "\n" +
        "✅ Terbayar: " + fmtRp(hasil.rekap.total_terbayar) + "\n" +
        "💵 Masuk: " + fmtRp(hasil.rekap.total_masuk) + "\n" +
        "📤 Keluar: " + fmtRp(hasil.rekap.total_keluar) + "\n\n" +
        "Saldo per kantong:\n" +
        hasil.perKantong.map((d) => "• " + d.kode + ": " + fmtRp(d.saldo_akhir)).join("\n")
    );
  } catch (e) {
    balasError(chatId, e);
  }
}


// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    const core = (typeof require !== "undefined") ? require("./core.gs") : null;
    if (core) Object.keys(core).forEach((k) => { if (typeof global !== "undefined") global[k] = core[k]; });
    module.exports = {
        handleAdmin,
        handleAlokasi,
        handleBayar,
        handleBuatPengumuman,
        handleCabut,
        handleCabutKK,
        handleDaftar,
        handleEditAnggota,
        handlePindahKas,
        handleRekap,
        handleSet,
        handleSetting,
        handleTambahAnggota,
        handleTambahKK,
        handleTambahKas,
        handleTambahWarga,
        handleTarif,
        handleTolak,
        handleTutupBuku,
        handleVerifikasi,
    };
}
