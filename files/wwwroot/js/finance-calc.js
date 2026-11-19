// آلة حاسبة بسيطة في صفحات الحسابات: زر في شريط الحسابات يفتح لوحة صغيرة عائمة.
// تقبل الأرقام العربية، و«استخدم الناتج» يضع الناتج في آخر خانة رقمية كنت تكتب فيها.
(() => {
    const toggle = document.querySelector("[data-calc-toggle]");
    const panel = document.querySelector("[data-calc]");
    if (!toggle || !panel || panel.dataset.ready) return;
    panel.dataset.ready = "1";

    const display = panel.querySelector("[data-calc-input]");
    const result = panel.querySelector("[data-calc-result]");
    const history = panel.querySelector("[data-calc-history]");
    const useButton = panel.querySelector("[data-calc-use]");
    const storeKey = "finance-calc";
    let lastField = null;
    let lastValue = null;

    const store = {
        read() { try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { return {}; } },
        write(value) { try { localStorage.setItem(storeKey, JSON.stringify(value)); } catch { /* التخزين غير متاح */ } }
    };

    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const normalize = text => String(text || "")
        .replace(/[٠-٩]/g, d => arabicDigits.indexOf(d))
        .replace(/[٫]/g, ".").replace(/[٬،,\s]/g, "")
        .replace(/[×xX]/g, "*").replace(/[÷]/g, "/").replace(/[−–]/g, "-");

    // تقييم آمن للعملية: أرقام و + - * / % وأقواس فقط (بدون eval)
    function evaluate(text) {
        const source = normalize(text);
        if (!source) return null;
        if (/[^0-9.+\-*/%()]/.test(source)) throw new Error("bad");
        let index = 0;
        const peek = () => source[index];
        function number() {
            const match = /^\d*\.?\d+|^\d+\.?/.exec(source.slice(index));
            if (!match) throw new Error("bad");
            index += match[0].length;
            let value = parseFloat(match[0]);
            if (peek() === "%") { index++; value /= 100; }
            return value;
        }
        function factor() {
            if (peek() === "-") { index++; return -factor(); }
            if (peek() === "+") { index++; return factor(); }
            if (peek() === "(") {
                index++;
                const value = expression();
                if (peek() !== ")") throw new Error("bad");
                index++;
                return value;
            }
            return number();
        }
        function term() {
            let value = factor();
            while (peek() === "*" || peek() === "/") {
                const op = source[index++];
                const right = factor();
                if (op === "/" && right === 0) throw new Error("zero");
                value = op === "*" ? value * right : value / right;
            }
            return value;
        }
        function expression() {
            let value = term();
            while (peek() === "+" || peek() === "-") {
                const op = source[index++];
                const right = term();
                value = op === "+" ? value + right : value - right;
            }
            return value;
        }
        const value = expression();
        if (index !== source.length || !isFinite(value)) throw new Error("bad");
        return Math.round(value * 100) / 100;
    }

    const money = value => value.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

    function preview() {
        try {
            const value = evaluate(display.value);
            lastValue = value;
            result.textContent = value === null ? "" : "= " + money(value);
            result.classList.remove("is-bad");
        } catch (error) {
            lastValue = null;
            result.textContent = error.message === "zero" ? "لا قسمة على صفر" : "…";
            result.classList.toggle("is-bad", error.message === "zero");
        }
        useButton.disabled = lastValue === null || !lastField;
        store.write({ open: !panel.hidden, expression: display.value });
    }

    function equals() {
        preview();
        if (lastValue === null) return;
        const line = document.createElement("li");
        line.textContent = `${display.value} = ${money(lastValue)}`;
        history.prepend(line);
        while (history.children.length > 4) history.lastElementChild.remove();
        display.value = String(lastValue);
        preview();
    }

    function press(key) {
        const start = display.selectionStart ?? display.value.length;
        const end = display.selectionEnd ?? display.value.length;
        if (key === "C") display.value = "";
        else if (key === "back") {
            display.value = start === end ? display.value.slice(0, Math.max(0, start - 1)) + display.value.slice(end) : display.value.slice(0, start) + display.value.slice(end);
        } else if (key === "=") { equals(); display.focus(); return; }
        else display.value = display.value.slice(0, start) + key + display.value.slice(end);
        display.focus();
        const caret = key === "C" ? 0 : key === "back" ? Math.max(0, start === end ? start - 1 : start) : start + key.length;
        display.setSelectionRange(caret, caret);
        preview();
    }

    function setOpen(open) {
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.classList.toggle("is-active", open);
        if (open) { display.focus(); preview(); }
        store.write({ open, expression: display.value });
    }

    // آخر خانة رقمية في الصفحة (المبلغ...) ليوضع فيها الناتج
    const remember = event => {
        const field = event.target;
        if (panel.contains(field) || !(field instanceof HTMLInputElement)) return;
        if (field.type === "number" || /amount|value|price|total|المبلغ/i.test(field.name + field.id) || field.inputMode === "decimal" || field.inputMode === "numeric") {
            lastField = field;
            useButton.disabled = lastValue === null;
        }
    };
    document.addEventListener("focusin", remember);
    document.addEventListener("pointerdown", remember);
    document.addEventListener("click", remember);

    useButton.addEventListener("click", () => {
        if (!lastField || lastValue === null) return;
        lastField.value = String(lastValue);
        lastField.dispatchEvent(new Event("input", { bubbles: true }));
        lastField.dispatchEvent(new Event("change", { bubbles: true }));
        lastField.focus();
    });

    panel.querySelectorAll("[data-key]").forEach(button => button.addEventListener("click", () => press(button.dataset.key)));
    display.addEventListener("input", preview);
    display.addEventListener("keydown", event => {
        event.stopPropagation();
        if (event.key === "Enter" || event.key === "=") { event.preventDefault(); equals(); }
        else if (event.key === "Escape") { event.preventDefault(); setOpen(false); toggle.focus(); }
    });
    panel.querySelector("[data-calc-close]").addEventListener("click", () => setOpen(false));
    toggle.addEventListener("click", () => setOpen(panel.hidden));

    const saved = store.read();
    display.value = saved.expression || "";
    if (saved.open) setOpen(true); else preview();
})();
