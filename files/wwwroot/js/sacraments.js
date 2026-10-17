// نموذج قيد السر: إظهار حقول المعمودية أو الخطوبة/الإكليل حسب النوع،
// وربط الاسم بعضو مسجل (بحث بالاسم، ثم ملء الميلاد والوالدين للمعمودية).
(() => {
    const form = document.querySelector("[data-sacrament-form]");
    if (!form) return;

    const list = document.getElementById("sacramentPeople");
    const personLabel = form.querySelector('label[for="PersonName"]');
    let found = [];

    const kind = () => form.querySelector("[data-sacrament-kind]:checked")?.value ?? "";
    const isBaptism = () => kind() === "معمودية وميرون";

    const applyKind = () => {
        form.querySelectorAll("[data-baptism]").forEach((element) => { element.hidden = !isBaptism(); });
        form.querySelectorAll("[data-couple]").forEach((element) => { element.hidden = isBaptism(); });
        personLabel.textContent = isBaptism() ? personLabel.dataset.labelBaptism : personLabel.dataset.labelCouple;
    };
    form.querySelectorAll("[data-sacrament-kind]").forEach((radio) => radio.addEventListener("change", applyKind));
    applyKind();

    let timer = null;
    const search = (text) => {
        clearTimeout(timer);
        if (text.trim().length < 2) return;
        timer = setTimeout(async () => {
            try {
                const response = await fetch(`${form.dataset.findUrl}?q=${encodeURIComponent(text.trim())}`);
                found = response.ok ? await response.json() : [];
            } catch { found = []; }
            list.replaceChildren(...found.map((person) => {
                const option = document.createElement("option");
                option.value = person.name;
                return option;
            }));
        }, 250);
    };

    // اسم + حقل رقم العضو + سطر «مربوط»: الاختيار من القائمة يربط، والتعديل اليدوي يفك الربط
    const link = (nameInput, idInput, note, linkedText, onLinked) => {
        nameInput.addEventListener("input", () => {
            const match = found.find((person) => person.name === nameInput.value);
            if (match) {
                idInput.value = match.id;
                note.textContent = linkedText;
                onLinked?.(match.id);
            } else {
                idInput.value = "";
                note.textContent = "";
                search(nameInput.value);
            }
        });
    };

    const fillBaptism = async (id) => {
        if (!isBaptism()) return;
        try {
            const response = await fetch(`${form.dataset.personUrl}?id=${id}`);
            if (!response.ok) return;
            const person = await response.json();
            const set = (selector, value) => { const input = form.querySelector(selector); if (value && !input.value) input.value = value; };
            set("[data-birth]", person.birthDate);
            set("[data-father]", person.father);
            set("[data-mother]", person.mother);
        } catch { /* الملء التلقائي اختياري */ }
    };

    link(form.querySelector("[data-person-name]"), form.querySelector("[data-person-id]"), form.querySelector("[data-person-linked]"), "مربوط بملف العضو", fillBaptism);
    link(form.querySelector("[data-partner-name]"), form.querySelector("[data-partner-id]"), form.querySelector("[data-partner-linked]"), "مربوطة بملف العضو");
})();
