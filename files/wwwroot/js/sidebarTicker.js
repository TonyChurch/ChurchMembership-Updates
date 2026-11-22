// شريط «رسالة اليوم» في القائمة الجانبية: بطاقات تصعد من أسفل لأعلى واحدة بعد الأخرى
// (تنبيهات الكنيسة، مواعيد اليوم في الكنيسة، أعياد ميلاد اليوم، تدريب اليوم) وتتوقف عند وضع الماوس عليها.
(() => {
    const hosts = Array.from(document.querySelectorAll("[data-daily-ticker]"));
    if (!hosts.length) return;

    const holdMs = 7000;
    const maxNames = 4;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const practices = [
        "اتصل اليوم بمخدوم غاب عن الاجتماع الأخير.",
        "صلِّ اليوم باسم كل مخدوم في فصلك.",
        "اختر أسرة تحتاج افتقادًا وحدد موعد زيارتها.",
        "اقرأ إنجيل اليوم قبل أن تبدأ خدمتك.",
        "أرسل كلمة تشجيع لخادم زميل.",
        "راجع بيانات مخدوم ناقصة وأكملها.",
        "اشكر الله على ثلاثة أمور في خدمتك.",
        "اسأل عن مريض من أبناء الكنيسة.",
        "احفظ آية اليوم ورددها في طريقك.",
        "هنّئ اليوم صاحب مناسبة من مخدوميك.",
        "صلِّ من أجل الآباء الكهنة وخدمة الكنيسة.",
        "خصص عشر دقائق هدوء وصلاة قبل النوم.",
        "صالح اليوم من بينك وبينه عتاب.",
        "سجّل حضور فصلك أولًا بأول ولا تؤجله."
    ];

    const buildCard = (kind, icon, label, text, href) => {
        const card = document.createElement(href ? "a" : "div");
        card.className = `right-sidebar-daily-message__card right-sidebar-daily-message__card--${kind}`;
        if (href) card.href = href;
        const heading = document.createElement("small");
        const glyph = document.createElement("i");
        glyph.className = `bi ${icon}`;
        glyph.setAttribute("aria-hidden", "true");
        heading.append(glyph, label);
        const body = document.createElement("p");
        body.textContent = text;
        card.append(heading, body);
        return card;
    };

    // null عند الفشل أو عند ردّ غير JSON (مثل تحويل مستخدم بلا صلاحية إلى صفحة أخرى)
    const loadJson = (url) => !url ? Promise.resolve(null) : fetch(url, { headers: { Accept: "application/json" } })
        .then((response) => response.ok && (response.headers.get("content-type") || "").includes("json") ? response.json() : null)
        .catch(() => null);

    const run = (host, cards) => {
        const track = host.querySelector("[data-daily-ticker-track]");
        if (!track) return;
        track.replaceChildren(...cards);
        const count = cards.length;
        if (count < 2) return;

        // نسخة من أول بطاقة في النهاية ليبقى الصعود متصلًا عند العودة للبداية
        if (!reducedMotion) {
            const loopCard = cards[0].cloneNode(true);
            loopCard.setAttribute("aria-hidden", "true");
            loopCard.tabIndex = -1;
            track.append(loopCard);
        }

        let index = 0;
        let paused = false;
        const move = () => { track.style.transform = `translateY(-${index * 100}%)`; };
        const rewind = () => {
            track.style.transition = "none";
            index = 0;
            move();
            void track.offsetHeight;
            track.style.transition = "";
        };

        host.addEventListener("mouseenter", () => { paused = true; });
        host.addEventListener("mouseleave", () => { paused = false; });
        host.addEventListener("focusin", () => { paused = true; });
        host.addEventListener("focusout", () => { paused = false; });
        track.addEventListener("transitionend", () => { if (index >= count) rewind(); });

        window.setInterval(() => {
            if (paused || document.hidden) return;
            if (reducedMotion) {
                index = (index + 1) % count;
            } else {
                if (index >= count) rewind();
                index++;
            }
            move();
        }, holdMs);
    };

    const first = hosts[0];
    Promise.all([
        loadJson("/api/church-announcements/active"),
        loadJson(first.dataset.birthdaysApi),
        loadJson(first.dataset.scheduleApi)
    ]).then(([announcements, birthdays, schedule]) => {
        const today = new Date();
        const dayNumber = Math.round(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 86400000);

        hosts.forEach((host) => {
            const cards = [];

            if (announcements && announcements.length) {
                announcements.forEach((item) => {
                    cards.push(buildCard("notice", "bi-bell-fill", "تنبيهات الكنيسة", `${item.title}: ${item.message}`));
                });
            } else {
                cards.push(buildCard("notice", "bi-bell-fill", "تنبيهات الكنيسة", "لا توجد تنبيهات جديدة اليوم"));
            }

            // مواعيد اليوم من صفحة «مواعيد الكنيسة»؛ لا بطاقة إن لم يُسجَّل لليوم شيء
            if (schedule && schedule.length) {
                const extra = schedule.length - maxNames;
                const text = schedule.slice(0, maxNames).map((item) => item.time ? `${item.time} ${item.title}` : item.title).join("، ")
                    + (extra > 0 ? ` و${extra} أخرى` : "");
                cards.push(buildCard("schedule", "bi-calendar-week-fill", "اليوم في الكنيسة", text, host.dataset.scheduleUrl));
            }

            // بلا صلاحية على الأعضاء لا تظهر بطاقة أعياد الميلاد أصلًا
            if (birthdays) {
                const names = birthdays.map((item) => item.name);
                const extra = names.length - maxNames;
                const text = !names.length
                    ? "لا توجد أعياد ميلاد اليوم"
                    : names.slice(0, maxNames).join("، ") + (extra > 0 ? ` و${extra} آخرون` : "");
                const label = names.length ? `أعياد ميلاد اليوم (${names.length})` : "أعياد ميلاد اليوم";
                cards.push(buildCard("birthdays", "bi-balloon-heart-fill", label, text, host.dataset.birthdaysUrl));
            }

            cards.push(buildCard("practice", "bi-check2-circle", "تدريب اليوم", practices[dayNumber % practices.length]));
            run(host, cards);
        });
    });
})();
