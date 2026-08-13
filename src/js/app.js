// JS Goes here - ES6 supported
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("nav-menu--open");
    navToggle.classList.toggle("nav-toggle--active", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen);
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("nav-menu--open");
      navToggle.classList.remove("nav-toggle--active");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const targetId = anchor.getAttribute("href");
    if (targetId.length <= 1) return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({behavior: "smooth"});
  });
});
