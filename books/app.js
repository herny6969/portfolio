// 图书管理：增删改查 + 搜索筛选 + localStorage 持久化
(function () {
  var KEY = "books-data";
  var THEME_KEY = "books-theme";

  var seed = [
    { id: 1, title: "JavaScript 高级程序设计", author: "Matt Frisbie", category: "技术", status: "reading" },
    { id: 2, title: "CSS 世界", author: "张鑫旭", category: "技术", status: "done" },
    { id: 3, title: "活着", author: "余华", category: "文学", status: "done" },
    { id: 4, title: "万历十五年", author: "黄仁宇", category: "历史", status: "unread" }
  ];

  var books = load();
  var editingId = null;

  var tbody = document.getElementById("tbody");
  var empty = document.getElementById("empty");
  var stats = document.getElementById("stats");
  var search = document.getElementById("search");
  var filter = document.getElementById("filter");
  var dialog = document.getElementById("dialog");
  var form = document.getElementById("form");
  var dialogTitle = document.getElementById("dialogTitle");

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : seed.slice();
    } catch (e) {
      return seed.slice();
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(books));
  }

  function statusText(s) {
    return { unread: "未读", reading: "在读", done: "已读" }[s] || "未读";
  }

  function render() {
    var kw = search.value.trim().toLowerCase();
    var st = filter.value;

    var list = books.filter(function (b) {
      var hitKw =
        !kw ||
        b.title.toLowerCase().indexOf(kw) > -1 ||
        b.author.toLowerCase().indexOf(kw) > -1 ||
        b.category.toLowerCase().indexOf(kw) > -1;
      var hitSt = st === "all" || b.status === st;
      return hitKw && hitSt;
    });

    tbody.innerHTML = list
      .map(function (b) {
        return (
          "<tr>" +
          '<td data-label="书名">' + esc(b.title) + "</td>" +
          '<td data-label="作者">' + esc(b.author) + "</td>" +
          '<td data-label="分类"><span class="badge">' + esc(b.category) + "</span></td>" +
          '<td data-label="状态"><span class="badge ' + b.status + '">' + statusText(b.status) + "</span></td>" +
          '<td data-label="操作">' +
          '<button class="ghost" data-edit="' + b.id + '">编辑</button>' +
          '<button class="danger" data-del="' + b.id + '">删除</button>' +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    empty.hidden = list.length > 0;

    var done = books.filter(function (b) { return b.status === "done"; }).length;
    var reading = books.filter(function (b) { return b.status === "reading"; }).length;
    stats.innerHTML =
      stat(books.length, "总藏书") + stat(reading, "在读") + stat(done, "已读");
  }

  function stat(n, label) {
    return '<div class="stat"><strong>' + n + "</strong><span>" + label + "</span></div>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 新增 / 编辑
  document.getElementById("addBtn").addEventListener("click", function () {
    editingId = null;
    dialogTitle.textContent = "添加图书";
    form.reset();
    dialog.showModal();
  });

  tbody.addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-edit");
    if (id) {
      var b = books.find(function (x) { return x.id === Number(id); });
      if (!b) return;
      editingId = b.id;
      dialogTitle.textContent = "编辑图书";
      form.title.value = b.title;
      form.author.value = b.author;
      form.category.value = b.category;
      form.status.value = b.status;
      dialog.showModal();
      return;
    }
    var delId = e.target.getAttribute("data-del");
    if (delId) {
      if (!confirm("确定删除这本书吗？")) return;
      books = books.filter(function (x) { return x.id !== Number(delId); });
      save();
      render();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      title: form.title.value.trim(),
      author: form.author.value.trim(),
      category: form.category.value,
      status: form.status.value
    };
    if (!data.title || !data.author) return;

    if (editingId) {
      var b = books.find(function (x) { return x.id === editingId; });
      Object.assign(b, data);
    } else {
      data.id = Date.now();
      books.unshift(data);
    }
    save();
    render();
    dialog.close();
  });

  search.addEventListener("input", render);
  filter.addEventListener("change", render);

  document.getElementById("cancelBook").addEventListener("click", function () {
    dialog.close();
  });

  // 主题
  var root = document.documentElement;
  var saved = localStorage.getItem(THEME_KEY);
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("themeBtn").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
  });

  render();
})();
