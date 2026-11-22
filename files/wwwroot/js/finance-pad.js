// مسودة الحسابات (بجوار الحاسبة): سطور كل منها رقمان وعملية (× افتراضيًا أو ÷ أو + أو −)،
// وناتج السطر يُضاف إلى الرصيد الجاري (أو يُطرح منه)، والإجمالي يتحدث مع كل رقم. تُحفظ في المتصفح.
(() => {
    const toggle = document.querySelector("[data-pad-toggle]");
    const panel = document.querySelector("[data-pad]");
    if (!toggle || !panel || panel.dataset.ready) return;
    panel.dataset.ready = "1";

    const rowsHost = panel.querySelector("[data-pad-rows]");
    const totalBox = panel.querySelector("[data-pad-total]");
    const storeKey = "finance-pad";
    const ops = { "*": "×", "/": "÷", "+": "+", "-": "−" };
    let lines = [];

    const store = {
        read() { try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { return {}; } },
        write(value) { try { localStorage.setItem(storeKey, JSON.stringify(value)); } catch { /* التخزين غير متاح */ } }
    };

    // نفس تحويل money() في دفتر الإيصالات: أرقام عربية وفاصلة عشرية
    const num = text => {
        const value = String(text || "")
            .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
            .replace(/[٫,،]/g, ".")
            .replace(/[^0-9.\-]/g, "");
        return parseFloat(value) || 0;
    };
    const round = v => Math.round(v * 100) / 100;
    const show = v => round(v).toLocaleString("en-US", { maximumFractionDigits: 2 });

    function lineValue(line) {
        const a = num(line.a), b = num(line.b);
        switch (line.op) {
            case "/": return b === 0 ? 0 : a / b;
            case "+": return a + b;
            case "-": return a - b;
            default: return a * b;
        }
    }

    const blank = () => ({ a: "", op: "*", b: "", sign: "+", note: "" });

    function save() { store.write({ open: !panel.hidden, lines }); }

    // يحدّث الأرقام فقط (بدون إعادة بناء الخانات حتى لا تضيع الكتابة)
    function recalc() {
        let balance = 0;
        [...rowsHost.children].forEach((row, i) => {
            const line = lines[i];
            const value = round(lineValue(line));
            balance = round(balance + (line.sign === "-" ? -value : value));
            row.querySelector("[data-pad-line]").textContent = show(value);
            row.querySelector("[data-pad-bal]").textContent = show(balance);
        });
        totalBox.textContent = show(balance);
        save();
    }

    function build() {
        rowsHost.textContent = "";
        lines.forEach((line, i) => {
            const row = document.createElement("div");
            row.className = "pad__row";
            row.innerHTML =
                '<div class="pad__line">' +
                '<button type="button" class="pad__sign" data-f="sign" title="يُضاف إلى الرصيد / يُطرح منه"></button>' +
                '<input class="pad__in" data-f="a" dir="ltr" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="الرقم الأول" />' +
                '<select class="pad__op" data-f="op" aria-label="العملية">' +
                Object.keys(ops).map(k => `<option value="${k}">${ops[k]}</option>`).join("") + '</select>' +
                '<input class="pad__in" data-f="b" dir="ltr" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="الرقم الثاني" />' +
                '<span class="pad__eq">=</span><strong class="pad__res" data-pad-line dir="ltr"></strong>' +
                '<button type="button" class="pad__del" data-pad-del title="حذف السطر" aria-label="حذف السطر"><i class="bi bi-x-lg" aria-hidden="true"></i></button>' +
                '</div>' +
                '<div class="pad__sub"><input class="pad__note" data-f="note" autocomplete="off" placeholder="بيان (اختياري)" aria-label="بيان" />' +
                '<span class="pad__balwrap">الرصيد <b data-pad-bal dir="ltr"></b></span></div>';
            row.querySelector('[data-f="op"]').value = line.op;
            row.querySelector('[data-f="a"]').value = line.a;
            row.querySelector('[data-f="b"]').value = line.b;
            row.querySelector('[data-f="note"]').value = line.note || "";
            paintSign(row, line);
            row.querySelector("[data-pad-del]").addEventListener("click", () => {
                lines.splice(i, 1);
                if (!lines.length) lines.push(blank());
                build();
            });
            row.querySelector('[data-f="sign"]').addEventListener("click", () => {
                line.sign = line.sign === "-" ? "+" : "-";
                paintSign(row, line);
                recalc();
            });
            row.querySelectorAll("[data-f]").forEach(el => {
                if (el.dataset.f === "sign") return;
                const handler = () => { line[el.dataset.f] = el.value; recalc(); };
                el.addEventListener("input", handler);
                el.addEventListener("change", handler);
                el.addEventListener("keydown", event => {
                    event.stopPropagation();
                    if (event.key === "Enter") { event.preventDefault(); addLine(); }
                    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); toggle.focus(); }
                });
            });
            rowsHost.appendChild(row);
        });
        recalc();
    }

    function paintSign(row, line) {
        const button = row.querySelector('[data-f="sign"]');
        const minus = line.sign === "-";
        button.textContent = minus ? "−" : "+";
        button.classList.toggle("is-minus", minus);
        row.classList.toggle("is-minus", minus);
    }

    function addLine() {
        lines.push(blank());
        build();
        const inputs = rowsHost.querySelectorAll('[data-f="a"]');
        inputs[inputs.length - 1].focus();
    }

    function setOpen(open) {
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.classList.toggle("is-active", open);
        save();
    }

    panel.querySelector("[data-pad-add]").addEventListener("click", addLine);
    panel.querySelector("[data-pad-clear]").addEventListener("click", () => {
        if (lines.some(l => l.a || l.b) && !confirm("مسح كل سطور المسودة؟")) return;
        lines = [blank()];
        build();
    });
    panel.querySelector("[data-pad-close]").addEventListener("click", () => setOpen(false));
    toggle.addEventListener("click", () => setOpen(panel.hidden));

    const saved = store.read();
    lines = Array.isArray(saved.lines) && saved.lines.length
        ? saved.lines.map(l => Object.assign(blank(), l))
        : [blank()];
    build();
    if (saved.open) setOpen(true);
})();
