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
    if (dialog.returnValue === "cancel") return;
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

  render();
})();
