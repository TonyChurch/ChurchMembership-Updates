(() => {
    const clock = document.querySelector("[data-church-clock]");
    if (!clock) return;

    const weekday = clock.querySelector("[data-clock-weekday]");
    const gregorian = clock.querySelector("[data-clock-gregorian]");
    const coptic = clock.querySelector("[data-clock-coptic]");
    const time = clock.querySelector("[data-clock-time]");

    const weekdayFormatter = new Intl.DateTimeFormat("ar-EG", { weekday: "long" });
    const gregorianFormatter = new Intl.DateTimeFormat("ar-EG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    const copticFormatter = new Intl.DateTimeFormat("ar-EG-u-ca-coptic", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });

    const updateClock = () => {
        const now = new Date();
        weekday.textContent = weekdayFormatter.format(now);
        gregorian.textContent = gregorianFormatter.format(now);
        coptic.textContent = copticFormatter.format(now).replace(/\s*AM\s*$/i, " ش");
        time.textContent = timeFormatter.format(now);
        clock.setAttribute("datetime", now.toISOString());
    };

    updateClock();
    window.setInterval(updateClock, 1000);
})();
