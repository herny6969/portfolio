/**
 * PDF 课表解析：pdf.js 取文字 → 按表头列坐标还原成表格文本 → 交给 parser.js
 */
(function (root) {
  var TOL_Y = 6;

  function groupRows(items) {
    var sorted = items.slice().sort(function (a, b) { return b.y - a.y; });
    var rows = [];
    sorted.forEach(function (it) {
      var last = rows[rows.length - 1];
      if (last && Math.abs(last.y - it.y) <= TOL_Y) {
        last.items.push(it);
      } else {
        rows.push({ y: it.y, items: [it] });
      }
    });
    rows.forEach(function (r) {
      r.items.sort(function (a, b) { return a.x - b.x; });
      r.text = r.items.map(function (i) { return i.str; }).join("");
    });
    return rows;
  }

  /** 用表头（星期一…）和节次列锚定列坐标 */
  function columnCenters(rows) {
    var header = null;
    for (var i = 0; i < rows.length; i++) {
      if (/星期|周[一二三四五六日天]/.test(rows[i].text.replace(/\s/g, ""))) {
        header = rows[i];
        break;
      }
    }
    if (!header) return null;

    var centers = [];
    header.items.forEach(function (it) {
      var s = it.str.trim();
      if (!s) return;
      centers.push({ x: it.x, key: s });
    });

    return { centers: centers.map(function (c) { return c.x; }) };
  }

  function assignColumns(row, cols) {
    var cells = cols.map(function () { return []; });
    row.items.forEach(function (it) {
      var s = it.str.trim();
      if (!s) return;
      var best = 0;
      var bestD = Infinity;
      for (var i = 0; i < cols.length; i++) {
        var d = Math.abs(cols[i] - it.x);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      cells[best].push(it);
    });
    return cells.map(function (arr) {
      arr.sort(function (a, b) { return a.x - b.x; });
      var text = "";
      var prevEnd = null;
      arr.forEach(function (i) {
        var s = i.str.trim();
        if (!s) return;
        var w = i.w || 0;
        if (prevEnd !== null && i.x - prevEnd > 1.5) text += " ";
        text += s;
        prevEnd = i.x + w;
      });
      return text;
    });
  }

  function itemsToGrid(items) {
    var usable = items.filter(function (i) { return i.str && i.str.trim(); });
    if (!usable.length) return "";

    var rows = groupRows(usable);
    var colInfo = columnCenters(rows);
    if (!colInfo) return rows.map(function (r) { return r.text; }).join("\n");

    var centers = colInfo.centers; // 已经是 x 坐标数组
    var out = [];

    rows.forEach(function (row) {
      if (row === null) return;
      var cells = assignColumns(row, centers);
      // 第一格是节次/星期表头 → 新行；否则认为是换行内容，并回上一行
      var isHeader = /星期|节\s*次|周[一二三四五六日天]/.test(cells.join("").replace(/\s/g, ""));
      var firstEmpty = !cells[0].trim();

      if (!out.length || isHeader) {
        out.push(cells);
      } else if (firstEmpty) {
        var prev = out[out.length - 1];
        for (var k = 1; k < cells.length; k++) {
          if (!cells[k]) continue;
          prev[k] = (prev[k] ? prev[k] + " " : "") + cells[k];
        }
      } else {
        out.push(cells);
      }
    });

    return out
      .map(function (r) {
        return r
          .map(function (c) { return c.replace(/\s+/g, ""); })
          .join("\t");
      })
      .join("\n");
  }

  var SELF_SRC =
    (typeof document !== "undefined" && document.currentScript && document.currentScript.src) || "";
  var WORKER_SRC = SELF_SRC
    ? SELF_SRC.replace(/[^/]+$/, "") + "../vendor/pdf.worker.min.js"
    : "../vendor/pdf.worker.min.js";

  async function pdfToGridText(arrayBuffer) {
    if (!root.pdfjsLib) throw new Error("pdf.js 没加载成功");
    root.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

    var pdf = await root.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    var pages = Math.min(pdf.numPages, 3);
    var all = [];

    for (var p = 1; p <= pages; p++) {
      var page = await pdf.getPage(p);
      var content = await page.getTextContent();
      var items = content.items.map(function (it) {
        return {
          str: it.str,
          x: it.transform ? it.transform[4] : 0,
          y: it.transform ? it.transform[5] : 0,
          w: it.width || 0,
        };
      });
      var text = itemsToGrid(items);
      if (text.trim()) all.push(text);
    }

    return all.join("\n");
  }

  root.pdfToGridText = pdfToGridText;
  root.itemsToGrid = itemsToGrid;
})(typeof window !== "undefined" ? window : this);
