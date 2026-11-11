// 课程表：网格渲染 + 周次切换 + 单双周过滤 + localStorage
(function () {
  var KEY = "timetable-data";
  var THEME_KEY = "timetable-theme";

  var DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  var SLOTS = [
    { i: 1, label: "1-2节\n08:00" },
    { i: 2, label: "3-4节\n10:00" },
    { i: 3, label: "5-6节\n14:00" },
    { i: 4, label: "7-8节\n16:00" },
    { i: 5, label: "9-10节\n19:00" }
  ];

  var seed = [
    { id: 1, day: 0, slot: 0, name: "数据结构", teacher: "王老师", room: "3-201", from: 1, to: 16, color: "blue" },
    { id: 2, day: 2, slot: 1, name: "数据库原理", teacher: "李老师", room: "2-105", from: 1, to: 16, color: "green" },
    { id: 3, day: 1, slot: 2, name: "大学英语", teacher: "Smith", room: "1-302", from: 1, to: 8, color: "orange" },
    { id: 4, day: 3, slot: 0, name: "Web 前端", teacher: "张老师", room: "4-401", from: 5, to: 16, color: "purple" }
  ];

  var data = load();
  var week = 1;
  var maxWeek = 20;

  var grid = document.getElementById("timetable");
  var weekLabel = document.getElementById("weekLabel");
  var dialog = document.getElementById("dialog");
  var form = document.getElementById("form");
  var pending = null; // {day, slot}

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : seed.slice();
    } catch (e) {
      return seed.slice();
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function inWeek(c) {
    return week >= c.from && week <= c.to;
  }

  function matchesOddEven(c) {
    var mode = document.getElementById("oddEven").value;
    if (mode === "all") return true;
    // 单双周按起始周算：从第一节出现的那周开始隔周上
    var isOddWeek = week % 2 === 1;
    return mode === "odd" ? isOddWeek : !isOddWeek;
  }

  function render() {
    weekLabel.textContent = "第 " + week + " 周";

    var html = '<div class="head"></div>';
    for (var d = 0; d < 7; d++) html += '<div class="head">' + DAYS[d] + "</div>";

    for (var s = 0; s < SLOTS.length; s++) {
      html += '<div class="slot-label">' + SLOTS[s].label.replace("\n", "<br>") + "</div>";
      for (var d2 = 0; d2 < 7; d2++) {
        var c = data.find(function (x) {
          return x.day === d2 && x.slot === s && inWeek(x) && matchesOddEven(x);
        });
        if (c) {
          html +=
            '<div class="cell">' +
            '<div class="course ' + c.color + '" data-id="' + c.id + '">' +
            "<b>" + esc(c.name) + "</b>" +
            (c.room ? "<span>" + esc(c.room) + "</span>" : "") +
            (c.teacher ? "<span>" + esc(c.teacher) + "</span>" : "") +
            "</div></div>";
        } else {
          html += '<div class="cell" data-day="' + d2 + '" data-slot="' + s + '"></div>';
        }
      }
    }
    grid.innerHTML = html;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 点击空白格 → 添加
  grid.addEventListener("click", function (e) {
    var courseEl = e.target.closest(".course");
    if (courseEl) {
      var id = Number(courseEl.getAttribute("data-id"));
      var c = data.find(function (x) { return x.id === id; });
      if (c && confirm("删除《" + c.name + "》？")) {
        data = data.filter(function (x) { return x.id !== id; });
        save();
        render();
      }
      return;
    }
    var cell = e.target.closest(".cell");
    if (cell && cell.hasAttribute("data-day")) {
      pending = { day: Number(cell.dataset.day), slot: Number(cell.dataset.slot) };
      form.reset();
      form.from.value = 1;
      form.to.value = 16;
      dialog.showModal();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!pending) return;
    var item = {
      id: Date.now(),
      day: pending.day,
      slot: pending.slot,
      name: form.name.value.trim(),
      teacher: form.teacher.value.trim(),
      room: form.room.value.trim(),
      from: Number(form.from.value),
      to: Number(form.to.value),
      color: form.color.value
    };
    if (!item.name) return;
    data.push(item);
    save();
    render();
    dialog.close();
  });

  document.getElementById("cancelAdd").addEventListener("click", function () {
    dialog.close();
  });

  document.getElementById("prevWeek").addEventListener("click", function () {
    week = week <= 1 ? maxWeek : week - 1;
    render();
  });

  document.getElementById("nextWeek").addEventListener("click", function () {
    week = week >= maxWeek ? 1 : week + 1;
    render();
  });

  document.getElementById("oddEven").addEventListener("change", render);

  // 主题
  var root = document.documentElement;
  var savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  document.getElementById("themeBtn").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  });

  // ---------- 从教务系统导入 ----------
  var importDialog = document.getElementById("importDialog");
  var importText = document.getElementById("importText");
  var preview = document.getElementById("preview");
  var confirmBtn = document.getElementById("confirmImport");
  var pendingImport = [];

  document.getElementById("importBtn").addEventListener("click", function () {
    importText.value = "";
    preview.textContent = "";
    preview.className = "preview";
    confirmBtn.disabled = true;
    pendingImport = [];
    importDialog.showModal();
  });

  document.getElementById("cancelImport").addEventListener("click", function () {
    importDialog.close();
  });

  // 选 CSV / TXT / PDF 文件直接读进来
  document.getElementById("importFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;

    var isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";

    if (!isPdf) {
      var reader = new FileReader();
      reader.onload = function () {
        importText.value = String(reader.result || "");
        parsePreview();
      };
      reader.readAsText(f, "utf-8");
      return;
    }

    // PDF：先抽文字，再按坐标还原成表格
    preview.className = "preview";
    preview.textContent = "正在解析 PDF…";
    var fr = new FileReader();
    fr.onload = async function () {
      try {
        var grid = await window.pdfToGridText(new Uint8Array(fr.result));
        importText.value = grid;
        parsePreview();

        // 文字层坏了：给出针对性提示，别让用户以为是自己的操作问题
        if (!pendingImport.length && looksGarbled(grid)) {
          preview.innerHTML =
            "<b>这份 PDF 的文字层是坏的</b>（字体未嵌入或编码错乱），任何工具都读不出来。<br>" +
            "可以这样处理：<br>" +
            "1）在教务系统里直接按 Ctrl+A、Ctrl+C 复制课表，粘贴到上面的框；<br>" +
            "2）导出 Excel/Word 另存为 CSV 再导入；<br>" +
            "3）用 Edge 打开这个 PDF，打印 → Microsoft Print to PDF 重新生成一份。";
          preview.className = "preview";
          return;
        }

        if (!pendingImport.length) {
          preview.innerHTML =
            "PDF 里没解析出课程。<br>可能是扫描件（图片型 PDF），这种没有文字层，需要先 OCR；<br>也可能是版式特殊，可以试试把文字复制出来粘贴。";
          preview.className = "preview";
        }
      } catch (err) {
        preview.textContent = "PDF 解析失败：" + err.message;
        preview.className = "preview";
      }
    };
    fr.readAsArrayBuffer(f);
  });

  document.getElementById("parseBtn").addEventListener("click", parsePreview);

  /** 粗略判断抽出来的文字是不是坏的（字体未嵌入 / 编码错乱） */
  function looksGarbled(text) {
    var compact = String(text).replace(/\s/g, "");
    if (!compact) return false;
    var bad = (compact.match(/[\uFFFD\u25A1\u25A0\u0000-\u001F?？]/g) || []).length;
    var cjk = (compact.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 有明显乱码符号，或者几乎没有汉字 → 认为文字层不可用
    return bad / compact.length > 0.15 || (cjk / compact.length < 0.1 && compact.length > 30);
  }

  // 方便直接打开导入框：地址后加 #import
  if (location.hash === "#import") {
    document.getElementById("importBtn").click();
  }

  function parsePreview() {
    var raw = importText.value;
    if (!raw.trim()) {
      preview.textContent = "还没粘贴内容。";
      preview.className = "preview";
      confirmBtn.disabled = true;
      return;
    }

    pendingImport = window.parseTimetableText(raw);

    if (!pendingImport.length) {
      preview.innerHTML =
        "没解析出课程。常见原因：<br>1）复制时只选中了文字，没选表格；<br>2）表格里是图片；<br>3）格式特殊，改用 CSV 一行一门课。";
      preview.className = "preview";
      confirmBtn.disabled = true;
      return;
    }

    var list = pendingImport
      .map(function (c) {
        return (
          "<li>" + DAYS[c.day] + " · 第 " + (c.slot * 2 + 1) + "-" + (c.slot * 2 + 2) +
          " 节　" + esc(c.name) +
          (c.room ? "　" + esc(c.room) : "") +
          "　<span style='opacity:.6'>" + c.from + "-" + c.to + " 周</span></li>"
        );
      })
      .join("");

    preview.className = "preview ok";
    preview.innerHTML =
      "解析出 <b>" + pendingImport.length + "</b> 门课：<ul class='preview-list'>" + list + "</ul>";
    confirmBtn.disabled = false;
  }

  confirmBtn.addEventListener("click", function () {
    if (!pendingImport.length) return;
    var clearFirst = document.getElementById("clearFirst").checked;

    var base = clearFirst ? [] : data.slice();
    var added = 0;
    var skipped = 0;

    pendingImport.forEach(function (c) {
      var exists = base.some(function (x) {
        return x.day === c.day && x.slot === c.slot;
      });
      if (exists) {
        skipped++;
        return;
      }
      base.push({
        id: Date.now() + added,
        day: c.day,
        slot: c.slot,
        name: c.name,
        teacher: c.teacher || "",
        room: c.room || "",
        from: c.from,
        to: c.to,
        color: ["blue", "green", "orange", "purple"][added % 4],
      });
      added++;
    });

    data = base;
    save();
    render();
    importDialog.close();
    alert("导入完成：新增 " + added + " 门" + (skipped ? "，跳过 " + skipped + " 个时间冲突" : ""));
  });

  render();
})();
