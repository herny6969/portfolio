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
      // PDF 抽出来的中文常被拆成「数 据 结 构」，把汉字之间的空格去掉
      .replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, "$1")
      .replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, "$1")
      // 3 - 201 / 1 - 16 周 这类被空格拆开的数字
      .replace(/(\d)\s*[-－]\s*(\d)/g, "$1-$2")
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

  /** 从一个单元格里抠出课程名、教师、地点、周次
   *  思路：从右往左剥（周次 → 地点 → 教师），剩下的是课程名。
   *  这样连 PDF 里「数据结构王老师3-2011-16周」这种没有分隔符的也能拆。
   */
  function parseCell(raw) {
    var text = clean(String(raw).replace(/\n/g, " "));
    if (!text) return null;
    if (/^(无|—+|-+|\/|空|暂无)$/.test(text)) return null;
    if (/^[\d\s\-–~至周节()（）单双]+$/.test(text)) return null;

    var rest = text;
    var weeks = { from: 1, to: 16 };
    var room = "";

    // 0. PDF 常见：「3-2011-16周」= 教室 3-201 + 周次 1-16 周，先整体拆
    var combo =
      rest.match(/([A-Z]?\d{1,2}\s*[-－]\s*\d{3,4})\s*(\d{1,2})\s*[-–~]\s*(\d{1,2})\s*周\s*[（(]?\s*[单双]?\s*[)）]?\s*$/) ||
      rest.match(/((?:教|实验|综合|图书|文|理)[\u4e00-\u9fa5]{0,2}\d{3,4})\s*(\d{1,2})\s*[-–~]\s*(\d{1,2})\s*周\s*[（(]?\s*[单双]?\s*[)）]?\s*$/);
    if (combo) {
      room = clean(combo[1]).replace(/\s/g, "");
      weeks = { from: Number(combo[2]), to: Number(combo[3]) };
      rest = rest.slice(0, combo.index);
    }

    // 1. 周次（从末尾剥）
    if (!room) {
      var wm =
        rest.match(/(\d{1,2})\s*[-–~至]\s*(\d{1,2})\s*周\s*[（(]?\s*[单双]?\s*[)）]?\s*$/) ||
        rest.match(/(\d{1,2})\s*周\s*[（(]?\s*[单双]?\s*[)）]?\s*$/);
      if (wm) {
        weeks = { from: Number(wm[1]), to: Number(wm[2] || wm[1]) };
        rest = rest.slice(0, wm.index);
      }
    }

    // 2. 地点（从末尾剥）
    var roomPatterns = [
      /([A-Z]?\d{1,2}\s*[-－]\s*\d{3,4})\s*$/,
      /((?:操场|体育馆|田径场|机房|教学楼|图书馆|实验室))\s*$/,
      /([\u4e00-\u9fa5]{1,4}(?:楼|室|馆|区)[A-Za-z0-9\-－]*)\s*$/,
      /((?:教|实验|综合|图书|文|理)\S{0,3}\d{3,4})\s*$/,
    ];
    if (!room) {
      for (var i = 0; i < roomPatterns.length; i++) {
        var rm = rest.match(roomPatterns[i]);
        if (rm) {
          room = clean(rm[1]).replace(/\s/g, "");
          rest = rest.slice(0, rm.index);
          break;
        }
      }
    }

    // 3. 教师（取最后出现的那个，避免「结构王老师」把课程名尾巴吃进去）
    var teacher = "";
    var lastIdx = -1;
    var lastTxt = "";
    for (var p = 0; p < rest.length; p++) {
      var seg = rest.slice(p).match(/^([\u4e00-\u9fa5]{1,3})(老师|教授|讲师|助教)/);
      if (seg) {
        lastIdx = p;
        lastTxt = seg[0];
      }
    }
    if (lastIdx > -1) {
      teacher = lastTxt;
      rest = rest.slice(0, lastIdx) + " " + rest.slice(lastIdx + lastTxt.length);
    } else {
      var en = rest.match(/([A-Z][A-Za-z.]{1,15})\s*$/);
      if (en) {
        teacher = en[1];
        rest = rest.slice(0, en.index);
      }
    }

    // 4. 剩下的是课程名
    var name = clean(rest.split(/[|｜,，;；]/).map(clean).filter(Boolean)[0] || "");
    name = name.replace(/[（(]\s*[)）]/g, "").replace(/^[·・\s]+|[·・\s]+$/g, "");

    if (!name || name.length < 2) return null;
    if (name.length > 30) name = name.slice(0, 30);

    return { name: name, teacher: teacher, room: room, from: weeks.from, to: weeks.to };
  }

  /** 解析「教务系统导出文本」格式：
   *  星期一
   *  1-2
   *  【调】计算机组成原理○ 周数：2-16周(双) 校区:郑东校区 上课地点：实A-407  教师 ：黄磊 教学班：…
   */
  function parseExportText(text) {
    var lines = String(text || "").replace(/\r/g, "").split("\n");
    var out = [];
    var day = -1;
    var slot = -1;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\t/g, " ").trim();
      if (!line) continue;

      // 星期行
      if (/^星期[一二三四五六日天]$/.test(line)) {
        day = dayOf(line);
        continue;
      }

      // 节次行，如 "1-2"、"3-5"、"11-13"（按 1-2 / 3-5 / 6-7 / 8-10 / 11-13 分组）
      var sec = line.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
      if (sec) {
        var start = Number(sec[1]);
        slot = start <= 2 ? 0 : start <= 5 ? 1 : start <= 7 ? 2 : start <= 10 ? 3 : 4;
        continue;
      }

      // 课程信息行
      if (line.indexOf("周数：") > -1 && line.indexOf("上课地点") > -1) {
        if (day < 0 || slot < 0) continue;

        var nameM = line.match(/^(.*?)\s*周数：/);
        var name = nameM ? nameM[1] : "";
        name = name
          .replace(/^【[^】]*】/, "")
          .replace(/[★☆○●◆◇◎※]+$/g, "")
          .replace(/\s+/g, "")
          .trim();
        if (!name) continue;

        var weeksText = (line.match(/周数：([^\s]+)/) || [])[1] || "";
        var room = (line.match(/上课地点[：:]\s*([^\s]+)/) || [])[1] || "";
        var teacher = (line.match(/教师\s*[：:]\s*([^\s]+)/) || [])[1] || "";

        var range = weeksText.match(/(\d{1,2})\s*[-–~至]\s*(\d{1,2})\s*周/);
        var single = weeksText.match(/第?\s*(\d{1,2})\s*周/);
        var from = range ? Number(range[1]) : single ? Number(single[1]) : 1;
        var to = range ? Number(range[2]) : from;

        out.push({
          name: name,
          teacher: teacher,
          room: room === "未排地点" ? "" : room,
          from: from,
          to: to,
          weeksText: weeksText,
          day: day,
          slot: slot,
        });
      }
    }

    return out;
  }

  function parseTimetableText(text) {
    var out = [];
    var src = String(text || "").replace(/\r/g, "");
    if (!src.trim()) return out;

    // 教务系统导出的「星期/节次/课程信息」三行式格式
    if (src.indexOf("周数：") > -1 && src.indexOf("上课地点") > -1) {
      var exported = parseExportText(src);
      if (exported.length) return exported;
    }

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

      var first = clean(parts[0]);
      var isSplitLabel =
        /^第?\s*\d{1,2}$/.test(first) &&
        parts[1] &&
        /^[-–~]\s*\d{1,2}\s*节/.test(clean(parts[1]));
      var isRowStart = slotOf(parts[0]) > -1 || /节/.test(parts[0]) || isSplitLabel;

      if (isRowStart) {
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
      var label = row.label;
      var cells = row.cells;

      // PDF 抽取常把「第1-2节」拆成两格：「第1」「-2节」
      var shift = 0;
      if (/^第?\s*\d{1,2}$/.test(clean(label)) && cells.length) {
        var next = clean(cells[0]);
        if (/^[-–~]\s*\d{1,2}\s*节/.test(next)) {
          label = label + cells[0];
          cells = cells.slice(1);
          shift = 1;
        }
      }

      var slot = slotOf(label);
      if (slot < 0) return;
      cells.forEach(function (cell, ci) {
        var day = colDay[ci + shift] !== undefined ? colDay[ci + shift] : ci;
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
