/**
 * 教务系统课表解析器 v2
 *
 * 输入：
 *  A. 从教务系统网页复制整张课表（制表符分隔；单元格内可能有换行）
 *  B. 一行一门课的 CSV：星期,节次,课程,教师,地点,起始周,结束周
 *
 * 输出：[{ name, teacher, room, day, slot, from, to }]
 *   day: 0-6（周一~周日）  slot: 0-4（1-2、3-4、5-6、7-8、9-10 节）
 */
(function (root) {
  var DAY_WORDS = [
    ["星期一", "周一", "礼拜一"],
    ["星期二", "周二", "礼拜二"],
    ["星期三", "周三", "礼拜三"],
    ["星期四", "周四", "礼拜四"],
    ["星期五", "周五", "礼拜五"],
    ["星期六", "周六", "礼拜六"],
    ["星期日", "星期天", "周日", "周天"],
  ];

  function clean(s) {
    return String(s == null ? "" : s)
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function slotOf(text) {
    var t = clean(text);
    var m = t.match(/(\d{1,2})\s*[-–~至]\s*(\d{1,2})\s*节/);
    var n;
    if (m) n = Number(m[1]);
    else {
      var m2 = t.match(/第?\s*(\d{1,2})\s*节/);
      n = m2 ? Number(m2[1]) : NaN;
    }
    if (!isFinite(n)) return -1;
    if (n <= 2) return 0;
    if (n <= 4) return 1;
    if (n <= 6) return 2;
    if (n <= 8) return 3;
    return 4;
  }

  function dayOf(text) {
    var t = clean(text).replace(/\s/g, "");
    for (var i = 0; i < DAY_WORDS.length; i++) {
      for (var j = 0; j < DAY_WORDS[i].length; j++) {
        if (t.indexOf(DAY_WORDS[i][j]) > -1) return i;
      }
    }
    return -1;
  }

  function weekRange(text) {
    var t = clean(text);
    var m = t.match(/(\d{1,2})\s*[-–~至]\s*(\d{1,2})\s*周/);
    if (m) return { from: Number(m[1]), to: Number(m[2]) };
    var s = t.match(/(\d{1,2})\s*周/);
    if (s) return { from: Number(s[1]), to: Number(s[1]) };
    return { from: 1, to: 16 };
  }

  /** 从一个单元格里抠出课程名、教师、地点、周次 */
  function parseCell(raw) {
    var text = clean(String(raw).replace(/\n/g, " "));
    if (!text) return null;
    if (/^(无|—+|-+|\/|空|暂无)$/.test(text)) return null;
    if (/^[\d\s\-–~至周节()（）单双]+$/.test(text)) return null;

    var weeks = weekRange(text);

    // 先剥掉周次，避免「1-16」被当成教室号
    var rest = text
      .replace(/\d{1,2}\s*[-–~至]\s*\d{1,2}\s*周\s*[（(]?\s*[单双]?\s*[)）]?/g, " ")
      .replace(/\d{1,2}\s*周\s*[（(]?\s*[单双]?\s*[)）]?/g, " ");

    // 地点：3-201 / A101 / 教三201 / 实验楼302 / 操场
    var room = "";
    var patterns = [
      /([A-Za-z]?\d{1,2}\s*[-－]\s*\d{3,4})/,
      /([\u4e00-\u9fa5]{1,6}(?:楼|室|馆|场|区)[A-Za-z0-9\-－]*)/,
      /((?:教|实验|综合|图书|文|理)\S{0,3}\d{3,4})/,
      /(操场|体育馆|田径场|机房|教学楼)/,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var rm = rest.match(patterns[i]);
      if (rm) {
        room = clean(rm[1]).replace(/\s/g, "");
        rest = rest.replace(rm[0], " ");
        break;
      }
    }

    // 教师：王老师 / 李教授 / Smith
    var teacher = "";
    var tm = rest.match(/([\u4e00-\u9fa5]{1,3})\s*(?:老师|教授|讲师|助教)/);
    if (tm) {
      teacher = clean(tm[0]).replace(/\s/g, "");
      rest = rest.replace(tm[0], " ");
    } else {
      var en = rest.match(/([A-Z][A-Za-z.]{1,15})/);
      if (en) {
        teacher = en[1];
        rest = rest.replace(en[0], " ");
      }
    }

    // 剩下的第一段就是课程名
    var name = clean(
      rest.split(/[|｜,，;；]/).map(clean).filter(Boolean)[0] || ""
    );
    name = name.replace(/[（(]\s*[)）]/g, "").replace(/^[·・\s]+|[·・\s]+$/g, "");

    if (!name || name.length < 2) return null;
    if (name.length > 30) name = name.slice(0, 30);

    return { name: name, teacher: teacher, room: room, from: weeks.from, to: weeks.to };
  }

  function parseTimetableText(text) {
    var out = [];
    var src = String(text || "").replace(/\r/g, "");
    if (!src.trim()) return out;

    var lines = src.split("\n").filter(function (l) { return l.trim(); });

    // ---------- 模式 A：CSV，一行一门课 ----------
    var csvLines = lines.filter(function (l) { return l.indexOf("\t") === -1 && l.split(",").length >= 4; });
    if (csvLines.length && csvLines.length >= lines.length - 1) {
      csvLines.forEach(function (line) {
        var c = line.split(",").map(function (s) { return s.trim(); });
        var d = dayOf(c[0]);
        var s = slotOf(c[1]);
        if (d < 0 || s < 0) return;
        if (!c[2]) return;
        out.push({
          name: c[2],
          teacher: c[3] || "",
          room: c[4] || "",
          from: Number(c[5]) || 1,
          to: Number(c[6]) || 16,
          day: d,
          slot: s,
        });
      });
      return out;
    }

    // ---------- 模式 B：整表复制 ----------
    var rows = []; // { label, cells: [] }

    lines.forEach(function (line) {
      var parts = line.split("\t");

      if (parts.length === 1) {
        // 没有制表符：单元格内部的换行，接到上一行最后一个非空单元格
        if (!rows.length) return;
        var last = rows[rows.length - 1];
        for (var i = last.cells.length - 1; i >= 0; i--) {
          if (last.cells[i] && last.cells[i].trim()) {
            last.cells[i] += " " + parts[0];
            return;
          }
        }
        return;
      }

      if (slotOf(parts[0]) > -1) {
        rows.push({ label: parts[0], cells: parts.slice(1) });
      } else if (rows.length) {
        // 有制表符但不是行首：单段内容接到最后一个非空单元格，多段按列并回
        var r = rows[rows.length - 1];
        var nonEmpty = parts.filter(function (p) { return p.trim(); });
        if (nonEmpty.length === 1) {
          for (var j = r.cells.length - 1; j >= 0; j--) {
            if ((r.cells[j] || "").trim()) {
              r.cells[j] += " " + nonEmpty[0];
              break;
            }
          }
        } else {
          parts.forEach(function (p, idx) {
            if (!p.trim()) return;
            r.cells[idx] = (r.cells[idx] || "") + " " + p;
          });
        }
      }
    });

    // 表头里每个星期在第几列
    var header = null;
    for (var i = 0; i < lines.length; i++) {
      if (/星期|周[一二三四五六日天]/.test(lines[i]) && lines[i].indexOf("\t") > -1) {
        header = lines[i].split("\t");
        break;
      }
    }

    var colDay = {};
    if (header) {
      header.forEach(function (h, idx) {
        var d = dayOf(h);
        if (d > -1) colDay[idx - 1] = d; // 减掉第一列“节次”
      });
    }

    var seen = {};
    rows.forEach(function (row) {
      var slot = slotOf(row.label);
      if (slot < 0) return;
      row.cells.forEach(function (cell, ci) {
        var day = colDay[ci] !== undefined ? colDay[ci] : ci;
        if (day < 0 || day > 6) return;
        var c = parseCell(cell);
        if (!c) return;
        var key = day + "-" + slot;
        if (seen[key]) return;
        seen[key] = 1;
        c.day = day;
        c.slot = slot;
        out.push(c);
      });
    });

    return out;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseTimetableText: parseTimetableText, parseCell: parseCell, slotOf: slotOf, dayOf: dayOf };
  } else {
    root.parseTimetableText = parseTimetableText;
    root.parseCell = parseCell;
  }
})(typeof window !== "undefined" ? window : this);
