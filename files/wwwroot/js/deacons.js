// خدمة الشماسية: ربط اسم الشماس بعضو مسجل، وعدّاد من اختيروا داخل المذبح وفي الخورس.
(() => {
    // نموذج الشماس: البحث بالاسم في الأعضاء
    const form = document.querySelector("[data-deacon-form]");
    if (form) {
        const name = form.querySelector("[data-member-name]");
        const id = form.querySelector("[data-member-id]");
        const note = form.querySelector("[data-member-linked]");
        const list = document.getElementById("deaconPeople");
        let found = [];
        let timer = null;
        name.addEventListener("input", () => {
            const match = found.find((person) => person.name === name.value);
            if (match) { id.value = match.id; note.textContent = "مربوط بملف العضو"; return; }
            id.value = "";
            note.textContent = "";
            clearTimeout(timer);
            if (name.value.trim().length < 2) return;
            timer = setTimeout(async () => {
                try {
                    const response = await fetch(`${form.dataset.findUrl}?q=${encodeURIComponent(name.value.trim())}`);
                    found = response.ok ? await response.json() : [];
                } catch { found = []; }
                list.replaceChildren(...found.map((person) => Object.assign(document.createElement("option"), { value: person.name })));
            }, 250);
        });
    }

    // كشف الخدمة: الشماس لا يكون داخل المذبح وفي الخورس معًا، والعدد يتحدث
    const groups = document.querySelectorAll("[data-picks]");
    if (!groups.length) return;
    const count = () => groups.forEach((group) => {
        const badge = document.querySelector(`[data-count="${group.dataset.picks}"]`);
        if (badge) badge.textContent = group.querySelectorAll("input:checked").length;
    });
    groups.forEach((group) => group.addEventListener("change", (event) => {
        const box = event.target;
        if (box.checked) {
            groups.forEach((other) => {
                if (other === group) return;
                const twin = other.querySelector(`input[value="${box.value}"]`);
                if (twin) twin.checked = false;
            });
        }
        count();
    }));
    count();
})();

// كشف الخدمة: التاريخ يُقترح من نوع الخدمة، والمناسبة من التاريخ (ما لم تُعدَّل يدويًا)، والآباء معًا، وأسماء أخرى سطرًا سطرًا
(() => {
    const form = document.querySelector("[data-service-form]");
    if (!form) return;
    const kind = form.querySelector("[data-service-kind]");
    const date = form.querySelector("[data-service-date]");
    const occasion = form.querySelector("[data-service-occasion]");
    const state = form.querySelector("[data-occasion-state]");
    const side = document.querySelector("[data-side-occasion]");
    let dateTouched = form.dataset.new !== "true";
    let occasionTouched = false;

    // الخدمة ← أقرب يوم لها: القداس الأحد أو الجمعة، عشية والتسبحة السبت، باكر الأحد
    const nextDay = (days) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 8; i++) {
            const day = new Date(today); day.setDate(today.getDate() + i);
            if (days.includes(day.getDay())) return day;
        }
        return today;
    };
    const iso = (day) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const daysFor = (name) => name.includes("عشية") || name.includes("التسبحة") ? [6] : name.includes("باكر") ? [0] : name.includes("القداس") ? [0, 5] : null;

    async function refreshOccasion(force) {
        if (occasionTouched && !force) return;
        try {
            const response = await fetch(`${form.dataset.occasionUrl}?date=${encodeURIComponent(date.value)}&kind=${encodeURIComponent(kind.value)}`);
            if (!response.ok) return;
            const data = await response.json();
            occasion.value = data.occasion;
            occasionTouched = false;
            if (state) state.textContent = "تُملأ تلقائيًا من التاريخ، ويمكن تعديلها";
            if (side) side.textContent = data.occasion;
        } catch { /* بلا اتصال: تبقى كما هي */ }
    }

    kind.addEventListener("change", () => {
        const days = daysFor(kind.value);
        if (!dateTouched && days) date.value = iso(nextDay(days));
        refreshOccasion(false);
    });
    date.addEventListener("change", () => { dateTouched = true; refreshOccasion(false); });
    occasion.addEventListener("input", () => {
        occasionTouched = true;
        if (state) state.textContent = "عُدّلت يدويًا";
        if (side) side.textContent = occasion.value;
    });
    form.querySelector("[data-occasion-reset]")?.addEventListener("click", () => refreshOccasion(true));

    // الآباء معًا
    const all = form.querySelector("[data-priests-all]");
    const priests = [...form.querySelectorAll("[data-priest]")];
    all?.addEventListener("change", () => priests.forEach((box) => { box.checked = all.checked; }));
    priests.forEach((box) => box.addEventListener("change", () => { if (all) all.checked = priests.every((item) => item.checked); }));

    // أسماء أخرى: خانة لكل اسم، و«إضافة اسم» يفتح خانة جديدة (وEnter في آخر خانة كذلك)
    form.querySelectorAll("[data-names]").forEach((box) => {
        const add = box.querySelector("[data-add-name]");
        const addField = () => {
            const field = box.querySelector("input").cloneNode();
            field.value = "";
            box.insertBefore(field, add);
            field.focus();
        };
        add.addEventListener("click", addField);
        box.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.target.tagName !== "INPUT") return;
            event.preventDefault();
            const fields = [...box.querySelectorAll("input")];
            if (event.target === fields[fields.length - 1] && event.target.value.trim()) addField();
            else fields[fields.indexOf(event.target) + 1]?.focus();
        });
    });

    // قراءات اليوم في نافذة بجانب الصفحة
    document.querySelectorAll("[data-side-window]").forEach((button) => button.addEventListener("click", () => {
        const width = Math.min(560, Math.round(screen.availWidth * 0.4));
        window.open(button.dataset.sideWindow, "churchReadings", `width=${width},height=${screen.availHeight - 60},left=0,top=0,resizable=yes,scrollbars=yes`);
    }));
})();
