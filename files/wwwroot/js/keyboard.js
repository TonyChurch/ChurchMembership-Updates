// التنقل ولوحة المفاتيح في كل البرنامج:
// ١) «رجوع» يعود للصفحة السابقة فعلًا: مسار الصفحات محفوظ في الجلسة، وتغيير الشهر أو الفلتر داخل نفس الصفحة،
//    أو حفظ نموذج ثم العودة لصفحته، لا يُحسب خطوة جديدة.
// ٢) زر «رجوع» يُضاف تلقائيًا لأي صفحة ليس فيها زر.
// ٣) اختصارات لوحة المفاتيح، وتظهر قائمتها بالضغط على «؟».
(function () {
    "use strict";

    // ---------- مسار الصفحات ----------
    const TRAIL_KEY = "app-trail";
    const normalize = path => {
        const value = path.toLowerCase().replace(/\/index$/, "").replace(/\/$/, "");
        return value === "" || value === "/home" ? "/dashboard" : value;
    };
    const readTrail = () => {
        try { return JSON.parse(sessionStorage.getItem(TRAIL_KEY) || "[]"); } catch { return []; }
    };
    const saveTrail = trail => {
        try { sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-30))); } catch { /* تصفح خاص */ }
    };

    const here = { p: normalize(location.pathname), u: location.pathname + location.search };
    if (!here.p.startsWith("/account")) {
        let trail = readTrail();
        const index = trail.findIndex(entry => entry.p === here.p);
        // صفحة مرّت من قبل في المسار (رجوع، أو عودة بعد حفظ نموذج): يُقص ما بعدها
        if (index >= 0) { trail = trail.slice(0, index + 1); trail[index].u = here.u; }
        else trail.push(here);
        saveTrail(trail);
    }

    function goBack(fallback) {
        const trail = readTrail();
        const previous = trail.length >= 2 ? trail[trail.length - 2] : null;
        if (previous) { location.href = previous.u; return true; }
        if (fallback) { location.href = fallback; return true; }
        return false;
    }
    window.appGoBack = goBack;

    document.addEventListener("click", event => {
        const link = event.target.closest("[data-back]");
        if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        goBack(link.getAttribute("href"));
    });

    // ---------- زر «رجوع» لكل صفحة ----------
    function ensureBackButton() {
        if (document.querySelector("[data-back]") || here.p === "/dashboard" || here.p.startsWith("/account")) return;
        const main = document.querySelector(".app-main");
        if (!main) return;
        const bar = document.createElement("div");
        bar.className = "ui-backbar no-print";
        bar.innerHTML = '<a href="/Dashboard" class="ui-back" data-back><i class="bi bi-arrow-right" aria-hidden="true"></i> رجوع</a>';
        // تحت العنوان مثل باقي الصفحات، وإلا أعلى الصفحة
        const title = main.querySelector(".ui-page-header__title > div, .ui-page-header__title");
        if (title) { bar.classList.add("ui-backbar--title"); title.appendChild(bar); }
        else main.insertBefore(bar, main.firstChild);
    }

    // ---------- الاختصارات ----------
    const typing = target => target && target.closest && target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
    const modalOpen = () => document.querySelector(".modal.show, dialog[open], .offcanvas.show");

    // صفوف الجداول: الأسهم تتنقل بينها، وEnter يفتح الصف
    let rowIndex = -1;
    const rows = () => [...document.querySelectorAll(".app-main table tbody tr")].filter(row => row.offsetParent !== null && row.querySelector("a[href]"));
    function selectRow(step) {
        const list = rows();
        if (list.length === 0) return false;
        rowIndex = Math.max(0, Math.min(list.length - 1, rowIndex + step));
        list.forEach(row => row.classList.remove("is-kb-row"));
        const row = list[rowIndex];
        row.classList.add("is-kb-row");
        row.scrollIntoView({ block: "nearest" });
        return true;
    }
    function openRow() {
        const row = rows()[rowIndex];
        const link = row && (row.querySelector("td a[href]:not([href^='tel:']):not([href^='https://wa.me'])") || row.querySelector("a[href]"));
        if (link) { link.click(); return true; }
        return false;
    }

    // الفترة السابقة/التالية (الشهر، الأسبوع، السنة): السهم الأيمن = السابق، الأيسر = التالي
    function period(next) {
        const word = next ? "التالي" : "السابق";
        const link = [...document.querySelectorAll(".app-main a[title]")].find(item => item.title.includes(word) && item.offsetParent !== null);
        if (link) { link.click(); return true; }
        return false;
    }

    function focusSearch() {
        const input = document.querySelector(".app-main input[type=search], .app-main input[name=search], .app-main input[data-servant-search]");
        if (input) { input.focus(); input.select(); return true; }
        return false;
    }

    function addNew() {
        const button = document.querySelector(".app-main [data-shortcut-new], .app-main .members-table-bar__add, .app-main a.ui-btn[href*='/Create'], .app-main a.ui-btn[href*='/Quick']");
        if (button) { button.click(); return true; }
        return false;
    }

    const SHORTCUTS = [
        ["Backspace", "رجوع للصفحة السابقة (مثل زر «رجوع»)"],
        ["Alt + ←  /  Alt + →", "رجوع وتقدّم المتصفح"],
        ["↓  /  ↑", "التنقل بين صفوف الجدول (القائمة)"],
        ["Enter", "فتح الصف المحدد في الجدول"],
        ["↑ ↓ ← →  داخل الخانات", "التنقل بين الخانات: ↑ ↓ لنفس العمود في الصف السابق/التالي (جداول الدرجات وصفوف التعديل) أو للخانة السابقة/التالية، و← → عند طرف النص"],
        ["→  /  ←", "الفترة السابقة / التالية (الشهر أو الأسبوع أو السنة) في صفحات الحضور والتقارير"],
        ["Home  /  End", "أول الصفحة / آخرها"],
        ["Page Up  /  Page Down", "صفحة لأعلى / لأسفل"],
        ["Ctrl + K", "البحث في البرنامج (أي صفحة أو ميزة)"],
        ["/", "البحث داخل الصفحة (خانة البحث في القائمة)"],
        ["N", "إضافة جديد (عضو، أسرة، خادم...) في صفحات القوائم"],
        ["Ctrl + P", "طباعة الصفحة"],
        ["Esc", "إغلاق النافذة المفتوحة، أو إلغاء تحديد الصف"],
        ["؟  أو  Shift + /", "عرض هذه القائمة"]
    ];
    window.appShortcuts = SHORTCUTS;

    function showShortcuts() {
        let dialog = document.getElementById("kbShortcuts");
        if (!dialog) {
            dialog = document.createElement("dialog");
            dialog.id = "kbShortcuts";
            dialog.className = "kb-dialog";
            dialog.innerHTML = '<h2><i class="bi bi-keyboard" aria-hidden="true"></i> اختصارات لوحة المفاتيح</h2><table>'
                + SHORTCUTS.map(([keys, text]) => `<tr><td><kbd>${keys}</kbd></td><td>${text}</td></tr>`).join("")
                + '</table><p>الاختصارات لا تعمل أثناء الكتابة داخل خانة، حتى لا تتعارض مع الكتابة.</p><form method="dialog"><button class="ui-btn">إغلاق</button></form>';
            document.body.appendChild(dialog);
        }
        dialog.showModal();
    }
    window.appShowShortcuts = showShortcuts;

    document.addEventListener("keydown", event => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
        if (event.key === "Escape" && rowIndex >= 0) { rows().forEach(row => row.classList.remove("is-kb-row")); rowIndex = -1; return; }
        if (typing(event.target) || modalOpen()) return;
        if (event.altKey) return;

        let handled = false;
        switch (event.key) {
            case "Backspace": handled = !event.shiftKey && goBack(document.querySelector("[data-back]")?.getAttribute("href")); break;
            case "ArrowDown": handled = selectRow(1); break;
            case "ArrowUp": handled = rowIndex > 0 && selectRow(-1); break;
            case "Enter": handled = rowIndex >= 0 && openRow(); break;
            case "ArrowRight": handled = period(false); break;
            case "ArrowLeft": handled = period(true); break;
        }
        // الحروف بموضعها على لوحة المفاتيح، فتعمل بالعربي والإنجليزي
        if (!handled && event.code === "Slash") { handled = true; if (event.shiftKey) showShortcuts(); else handled = focusSearch(); }
        if (!handled && (event.key === "?" || event.key === "؟")) { handled = true; showShortcuts(); }
        if (!handled && event.code === "KeyN" && !event.shiftKey) handled = addNew();
        if (handled) event.preventDefault();
    });

    // ---------- الأسهم بين الخانات ----------
    // داخل جدول خانات (الدرجات، صفوف التعديل): ↑ ↓ لنفس العمود في الصف السابق/التالي.
    // وفي النماذج العادية: ↑ ↓ للخانة السابقة/التالية. ← → تنتقل عند طرف النص فقط (← للتالية في الصفحات العربية).
    // القوائم المنسدلة ومربعات النص الطويل والخانات ذات الاقتراحات تبقى على سلوكها العادي.
    const FIELD = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=submit]):not([type=button]), select, textarea";
    const fieldsIn = scope => [...scope.querySelectorAll(FIELD)].filter(el => !el.disabled && !el.readOnly && el.offsetParent !== null);
    const gridRow = el => {
        const row = el.closest(".clinic-row:not(.clinic-row--head), tr");
        const grid = row?.parentElement?.closest(".clinic-rows, tbody, table");
        return row && grid ? { row, grid } : null;
    };
    const gridRows = grid => [...grid.querySelectorAll(".clinic-row:not(.clinic-row--head), tr")].filter(row => fieldsIn(row).length > 0);
    function focusField(target) {
        if (!target) return false;
        target.focus();
        if (target.select && /^(text|search|tel|number|email|url)$/.test(target.type || "text")) { try { target.select(); } catch { } }
        return true;
    }
    function moveVertical(el, step) {
        const place = gridRow(el);
        if (place) {
            const rowsList = gridRows(place.grid);
            const index = rowsList.indexOf(place.row);
            const next = rowsList[index + step];
            if (!next) return false;
            const column = fieldsIn(place.row).indexOf(el);
            const targets = fieldsIn(next);
            return focusField(targets[Math.min(column, targets.length - 1)]);
        }
        const list = fieldsIn(el.form || document);
        return focusField(list[list.indexOf(el) + step]);
    }
    function moveSideways(el, step) {
        const scope = gridRow(el)?.row || el.form || document;
        const list = fieldsIn(scope);
        return focusField(list[list.indexOf(el) + step]);
    }
    function atEdge(el, forward) {
        if (el.tagName !== "INPUT") return false;
        if (el.type === "number") return true;
        if (/^(date|time|datetime-local|month|week)$/.test(el.type)) return false;
        try {
            if (el.selectionStart !== el.selectionEnd && el.value) return false;
            return forward ? el.selectionEnd === el.value.length : el.selectionStart === 0;
        } catch { return true; }
    }
    document.addEventListener("keydown", event => {
        const el = event.target;
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
        if (!(el instanceof HTMLElement) || !el.matches(FIELD) || el.tagName === "TEXTAREA") return;
        if (!/^Arrow(Up|Down|Left|Right)$/.test(event.key)) return;
        let handled = false;
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            // القائمة المنسدلة والخانة ذات الاقتراحات تستعمل الأسهم لاختيار عنصر
            if (el.tagName === "SELECT" || el.list) return;
            handled = moveVertical(el, event.key === "ArrowDown" ? 1 : -1);
        } else {
            if (el.tagName === "SELECT") return;
            const rtl = getComputedStyle(el).direction === "rtl";
            const forward = (event.key === "ArrowLeft") === rtl;
            if (!atEdge(el, forward)) return;
            handled = moveSideways(el, forward ? 1 : -1);
        }
        if (handled) event.preventDefault();
    });

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureBackButton);
    else ensureBackButton();
})();
