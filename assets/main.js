// 深色模式切换：记住用户选择，刷新后不丢
(function () {
  var KEY = "portfolio-theme";
  var root = document.documentElement;
  var btn = document.getElementById("themeToggle");

  // 1. 读上次的选择；没有就跟随系统
  var saved = localStorage.getItem(KEY);
  if (saved) {
    root.setAttribute("data-theme", saved);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }

  // 2. 点击切换
  if (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(KEY, next);
    });
  }

  // 3. 高亮当前页导航
  var path = location.pathname.split("/").pop() || "index.html";
  var links = document.querySelectorAll(".nav-link");
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute("href");
    links[i].classList.toggle("is-active", href === path);
  }
})();
