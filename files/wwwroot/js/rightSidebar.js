(function () {
    const storageKey = "churchMembership.sidebarCollapsed";
    const toggle = document.querySelector("[data-sidebar-toggle]");

    if (localStorage.getItem(storageKey) === "true") {
        document.body.classList.add("sidebar-collapsed");
        toggle?.setAttribute("aria-expanded", "false");
    }

    toggle?.addEventListener("click", function () {
        const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
        localStorage.setItem(storageKey, String(isCollapsed));
        toggle.setAttribute("aria-expanded", String(!isCollapsed));
    });
})();
