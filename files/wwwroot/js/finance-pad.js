// مسودة الحسابات (بجوار الحاسبة) على نسق جدول: كل سطر رقمان وعملية (× افتراضيًا أو ÷ أو + أو −) وناتج وبيان،
// وناتج السطر يُضاف إلى الرصيد الجاري (أو يُطرح منه). الرصيد يُنقل إلى آخر حقل كنت فيه بالصفحة أو يُنسخ.
// يفتحها أي زر فيه data-pad-toggle (شريط الحسابات، ونموذج المنصرف). تُحفظ في المتصفح.
(() => {
    const toggles = [...document.querySelectorAll("[data-pad-toggle]")];
    const panel = document.querySelector("[data-pad]");
    if (!toggles.length || !panel || panel.dataset.ready) return;
    panel.dataset.ready = "1";

    const rowsHost = panel.querySelector("[data-pad-rows]");
    const totalBox = panel.querySelector("[data-pad-total]");
    const msg = panel.querySelector("[data-pad-msg]");
    const storeKey = "finance-pad";
    const ops = { "*": "×", "/": "÷", "+": "+", "-": "−" };
    let lines = [];
    let balance = 0;
    let lastField = null;
    let msgTimer = 0;

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

    let pos = null, min = false;
    function save() { store.write({ open: !panel.hidden, lines, pos, min }); }

    function say(text, bad) {
        msg.textContent = text;
        msg.classList.toggle("is-bad", !!bad);
        clearTimeout(msgTimer);
        msgTimer = setTimeout(() => { msg.textContent = ""; }, 3500);
    }

    // يحدّث الأرقام فقط (بدون إعادة بناء الخانات حتى لا تضيع الكتابة)
    function recalc() {
        balance = 0;
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
                '<button type="button" class="pad__sign" data-f="sign" title="يُضاف إلى الرصيد / يُطرح منه"></button>' +
                '<input class="pad__in" data-f="a" dir="ltr" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="الرقم الأول" />' +
                '<select class="pad__op" data-f="op" aria-label="العملية">' +
                Object.keys(ops).map(k => `<option value="${k}">${ops[k]}</option>`).join("") + '</select>' +
                '<input class="pad__in" data-f="b" dir="ltr" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="الرقم الثاني" />' +
                '<strong class="pad__res" data-pad-line dir="ltr"></strong>' +
                '<input class="pad__note" data-f="note" autocomplete="off" placeholder="بيان" aria-label="بيان" />' +
                '<b class="pad__bal" data-pad-bal dir="ltr"></b>' +
                '<button type="button" class="pad__del" data-pad-del title="حذف السطر" aria-label="حذف السطر"><i class="bi bi-x-lg" aria-hidden="true"></i></button>';
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
                    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); toggles[0].focus(); }
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
        toggles.forEach(t => {
            t.setAttribute("aria-expanded", String(open));
            t.classList.toggle("is-active", open);
        });
        save();
    }

    // آخر حقل كتابة كنت فيه بالصفحة (خارج الحاسبة والمسودة) ليُنقل إليه الرصيد
    const okTypes = ["", "text", "number", "search", "tel", "url", "email"];
    const remember = event => {
        const field = event.target;
        if (!(field instanceof HTMLElement) || field.closest("[data-pad],[data-calc]")) return;
        const isText = field instanceof HTMLTextAreaElement ||
            (field instanceof HTMLInputElement && okTypes.includes(field.type));
        if (isText && !field.readOnly && !field.disabled) lastField = field;
    };
    document.addEventListener("focusin", remember);
    document.addEventListener("pointerdown", remember);

    panel.querySelector("[data-pad-send]").addEventListener("click", () => {
        if (!lastField || !document.contains(lastField)) { say("اضغط أولًا داخل الحقل المطلوب في الصفحة ثم عُد واضغط الزر.", true); return; }
        lastField.value = String(round(balance));
        lastField.dispatchEvent(new Event("input", { bubbles: true }));
        lastField.dispatchEvent(new Event("change", { bubbles: true }));
        lastField.focus();
        say("نُقل الرصيد " + show(balance) + " إلى الحقل.");
    });

    panel.querySelector("[data-pad-copy]").addEventListener("click", async () => {
        const text = String(round(balance));
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const temp = document.createElement("textarea");
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            try { document.execCommand("copy"); } catch { /* غير متاح */ }
            temp.remove();
        }
        say("نُسخ الرصيد " + show(balance) + ".");
    });

    panel.querySelector("[data-pad-add]").addEventListener("click", addLine);
    panel.querySelector("[data-pad-clear]").addEventListener("click", () => {
        if (lines.some(l => l.a || l.b) && !confirm("مسح كل سطور المسودة؟")) return;
        lines = [blank()];
        build();
    });
    panel.querySelector("[data-pad-close]").addEventListener("click", () => setOpen(false));
    toggles.forEach(t => t.addEventListener("click", () => setOpen(panel.hidden)));

    // سحب النافذة من رأسها (على الشاشات العريضة فقط) وتصغيرها إلى الرأس حتى لا تحجب الصفحة
    const head = panel.querySelector(".calc__head");
    const wide = () => window.innerWidth > 900;
    function applyPos() {
        if (pos && wide()) {
            const w = panel.offsetWidth || 320;
            const x = Math.min(Math.max(0, pos.x), Math.max(0, window.innerWidth - Math.min(w, 120)));
            const y = Math.min(Math.max(0, pos.y), Math.max(0, window.innerHeight - 48));
            panel.style.left = x + "px"; panel.style.top = y + "px";
            panel.style.right = "auto"; panel.style.bottom = "auto";
        } else {
            ["left", "top", "right", "bottom", "insetInlineEnd"].forEach(p => { panel.style[p] = ""; });
        }
    }
    function applyMin() {
        panel.classList.toggle("is-min", min);
        const button = panel.querySelector("[data-pad-min]");
        if (button) button.title = min ? "تكبير" : "تصغير";
    }
    panel.querySelector("[data-pad-min]").addEventListener("click", () => { min = !min; applyMin(); save(); });
    head.addEventListener("pointerdown", event => {
        if (!wide() || event.target.closest("button")) return;
        const box = panel.getBoundingClientRect();
        const dx = event.clientX - box.left, dy = event.clientY - box.top;
        head.setPointerCapture(event.pointerId);
        const move = e => { pos = { x: e.clientX - dx, y: e.clientY - dy }; applyPos(); };
        const up = () => { head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); head.removeEventListener("pointercancel", up); save(); };
        head.addEventListener("pointermove", move); head.addEventListener("pointerup", up); head.addEventListener("pointercancel", up);
        event.preventDefault();
    });
    window.addEventListener("resize", applyPos);

    const saved = store.read();
    pos = saved.pos || null; min = !!saved.min; applyPos(); applyMin();
    lines = Array.isArray(saved.lines) && saved.lines.length
        ? saved.lines.map(l => Object.assign(blank(), l))
        : [blank()];
    build();
    if (saved.open) setOpen(true);
})();
