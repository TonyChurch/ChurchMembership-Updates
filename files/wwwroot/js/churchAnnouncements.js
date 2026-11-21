(() => {
    const hosts = Array.from(document.querySelectorAll("[data-church-announcements]"));
    if (!hosts.length) return;

    fetch("/api/church-announcements/active", { headers: { Accept: "application/json" } })
        .then((response) => response.ok ? response.json() : [])
        .then((announcements) => {
            const message = announcements.length
                ? announcements.map((item) => `${item.title}: ${item.message}`).join(" | ")
                : "لا توجد تنبيهات جديدة اليوم";

            hosts.forEach((host) => { host.textContent = message; });
        })
        .catch(() => {
            hosts.forEach((host) => { host.textContent = "لا توجد تنبيهات جديدة اليوم"; });
        });
})();
