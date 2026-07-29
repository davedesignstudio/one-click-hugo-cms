// JS Goes here - ES6 supported
if (window.netlifyIdentity) {
  window.netlifyIdentity.on("init", user => {
    if (!user) {
      window.netlifyIdentity.on("login", () => {
        document.location.href = "/admin/";
      });
    }
  });
}

// Gentle scroll reveals for homepage sections
(function () {
  var nodes = document.querySelectorAll(".reveal-on-scroll");
  if (!nodes.length) return;

  if (!("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(nodes, function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  Array.prototype.forEach.call(nodes, function (el) {
    observer.observe(el);
  });
})();
