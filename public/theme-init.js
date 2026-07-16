(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (_error) {
    document.documentElement.classList.remove("dark");
  }
})();
