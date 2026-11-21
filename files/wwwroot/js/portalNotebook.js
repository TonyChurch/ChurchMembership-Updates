// النوتة الروحية في بوابة الشعب: كل شيء يُحفظ على هذا الجهاز فقط (localStorage)، ولا يُرسل شيء للخادم.
(() => {
    const host = document.querySelector("[data-notebook]");
    if (!host) return;

    const storageKey = "church.notebook.v1";
    const groups = [
        { title: "صلوات الأجبية", items: [["prime", "باكر"], ["third", "الساعة الثالثة"], ["sixth", "الساعة السادسة"], ["ninth", "الساعة التاسعة"], ["vespers", "الغروب"], ["compline", "النوم"], ["midnight", "نصف الليل"]] },
        { title: "الكتاب المقدس والقراءة", items: [["gospel", "قراءة الإنجيل"], ["retreat", "الخلوة اليومية"], ["reading", "قراءة روحية"]] },
        { title: "الحياة الكنسية", items: [["fast", "الصوم"], ["liturgy", "حضور القداس"], ["communion", "التناول"], ["confession", "الاعتراف"]] },
        { title: "المحبة العملية", items: [["mercy", "عمل رحمة أو خدمة"], ["repent", "محاسبة النفس"]] }
    ];
    const allItems = groups.flatMap((group) => group.items);

    let data;
    try {
        data = JSON.parse(localStorage.getItem(storageKey) || "null") || { days: {} };
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
        document.querySelector("[data-notebook-unavailable]").hidden = false;
        return;
    }
    if (!data.days || typeof data.days !== "object") data = { days: {} };

    const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* الحفظ غير متاح: تبقى التغييرات حتى إغلاق الصفحة */ } };
    const keyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const addDays = (date, days) => { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; };
    const dayFormat = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" });
    const shortFormat = new Intl.DateTimeFormat("ar-EG", { weekday: "short" });
    const doneOn = (date) => data.days[keyOf(date)] || [];

    let current = new Date(today);
    const summary = document.querySelector("[data-notebook-summary]");
    const backup = document.querySelector("[data-notebook-backup]");
    const note = document.querySelector("[data-notebook-note]");

    const lastDone = (id) => {
        const dates = Object.keys(data.days).filter((key) => data.days[key].includes(id)).sort();
        if (!dates.length) return "لم يُسجَّل";
        const days = Math.round((today - new Date(dates[dates.length - 1] + "T00:00:00")) / 86400000);
        return days <= 0 ? "اليوم" : days === 1 ? "أمس" : `منذ ${days} يومًا`;
    };

    const renderSummary = () => {
        const range = (count) => Array.from({ length: count }, (_, index) => addDays(today, -index));
        const total = (dates, id) => dates.filter((date) => doneOn(date).includes(id)).length;
        const week = range(7);
        const month = range(30);
        const stats = [
            ["آخر اعتراف", lastDone("confession")],
            ["آخر تناول", lastDone("communion")],
            ["قراءة الإنجيل", `${total(week, "gospel")} من 7 أيام · ${total(month, "gospel")} من 30`],
            ["صلاة باكر", `${total(week, "prime")} من 7 أيام · ${total(month, "prime")} من 30`],
            ["صلاة النوم", `${total(week, "compline")} من 7 أيام · ${total(month, "compline")} من 30`]
        ];
        const list = summary.querySelector("[data-notebook-stats]");
        list.replaceChildren(...stats.map(([label, value]) => {
            const row = document.createElement("li");
            const name = document.createElement("b");
            const text = document.createElement("span");
            name.textContent = label;
            text.textContent = value;
            row.append(name, text);
            return row;
        }));
        // آخر سبعة أيام: عمود لكل يوم، ارتفاعه بعدد ما سُجِّل فيه
        const chart = summary.querySelector("[data-notebook-week]");
        chart.replaceChildren(...week.reverse().map((date) => {
            const count = doneOn(date).length;
            const column = document.createElement("div");
            const bar = document.createElement("span");
            const label = document.createElement("small");
            bar.style.height = `${Math.max(6, Math.round(count / allItems.length * 100))}%`;
            bar.className = count ? "has-value" : "";
            bar.title = `${count} من ${allItems.length}`;
            label.textContent = shortFormat.format(date);
            column.append(bar, label);
            return column;
        }));
    };

    const renderDay = () => {
        const key = keyOf(current);
        const done = new Set(doneOn(current));
        host.querySelector("[data-notebook-date]").textContent = keyOf(current) === keyOf(today) ? `اليوم · ${dayFormat.format(current)}` : dayFormat.format(current);
        host.querySelector("[data-notebook-done]").textContent = `${done.size} من ${allItems.length}`;
        host.querySelector('[data-notebook-step="1"]').disabled = keyOf(current) === keyOf(today);

        host.querySelector("[data-notebook-groups]").replaceChildren(...groups.map((group) => {
            const section = document.createElement("div");
            const heading = document.createElement("h3");
            const list = document.createElement("div");
            section.className = "notebook-group";
            list.className = "notebook-items";
            heading.textContent = group.title;
            group.items.forEach(([id, label]) => {
                const item = document.createElement("label");
                const box = document.createElement("input");
                const text = document.createElement("span");
                box.type = "checkbox";
                box.checked = done.has(id);
                box.addEventListener("change", () => {
                    const set = new Set(data.days[key] || []);
                    if (box.checked) set.add(id); else set.delete(id);
                    if (set.size) data.days[key] = Array.from(set); else delete data.days[key];
                    save();
                    renderDay();
                    renderSummary();
                });
                text.textContent = label;
                item.append(box, text);
                list.append(item);
            });
            section.append(heading, list);
            return section;
        }));
    };

    host.querySelectorAll("[data-notebook-step]").forEach((button) => button.addEventListener("click", () => {
        const next = addDays(current, Number(button.dataset.notebookStep));
        if (next > today) return;
        current = next;
        renderDay();
    }));

    document.querySelector("[data-notebook-export]").addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
        link.download = `notebook-${keyOf(today)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        note.textContent = "تم تجهيز النسخة. احفظ الملف في مكان تعرفه.";
    });

    document.querySelector("[data-notebook-import]").addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        file.text().then((text) => {
            const loaded = JSON.parse(text);
            if (!loaded || typeof loaded.days !== "object") throw new Error("not a notebook file");
            const known = new Set(allItems.map(([id]) => id));
            // تُدمج مع الموجود: ما سُجِّل في أي من النسختين يبقى
            Object.entries(loaded.days).forEach(([key, items]) => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(items)) return;
                const merged = new Set([...(data.days[key] || []), ...items.filter((id) => known.has(id))]);
                if (merged.size) data.days[key] = Array.from(merged);
            });
            save();
            renderDay();
            renderSummary();
            note.textContent = "تمت استعادة النسخة ودمجها مع الموجود.";
        }).catch(() => { note.textContent = "هذا الملف ليس نسخة من النوتة."; });
        event.target.value = "";
    });

    host.hidden = false;
    summary.hidden = false;
    backup.hidden = false;
    renderDay();
    renderSummary();
})();
