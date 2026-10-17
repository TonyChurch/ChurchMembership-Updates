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
