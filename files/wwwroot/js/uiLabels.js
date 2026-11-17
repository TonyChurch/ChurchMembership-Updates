// مسميات البرنامج المعدّلة (Infrastructure/UiLabels): كل نص في الصفحة يطابق اسمًا أصليًا تمامًا يظهر باسمه الجديد،
// في القائمة الجانبية والتبويبات والعناوين والأزرار وعنوان نافذة المتصفح.
// و«وضع تعديل المسميات» للأمين: يُضغط أي اسم فيُكتب اسمه الجديد ويُحفظ لكل الصفحات.
(function () {
    "use strict";
    const labels = window.uiLabels || {};
    const clean = (text) => (text || "").replace(/\s+/g, " ").trim();
    const skip = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "CODE", "PRE", "NOSCRIPT"]);

    function apply(root) {
        if (!Object.keys(labels).length) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || skip.has(parent.tagName) || parent.isContentEditable || parent.closest("[data-labels-skip]")) return NodeFilter.FILTER_REJECT;
                return labels[clean(node.nodeValue)] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
            const original = clean(node.nodeValue);
            const value = node.nodeValue;
            const lead = value.match(/^\s*/)[0];
            const tail = value.match(/\s*$/)[0];
            node.nodeValue = lead + labels[original] + tail;
            node.parentElement.dataset.labelOriginal = original;
        });
        // النص الإرشادي داخل خانات الإدخال (placeholder)
        const fields = root.matches?.("[placeholder]") ? [root] : [];
        root.querySelectorAll?.("[placeholder]").forEach((field) => fields.push(field));
        fields.forEach((field) => {
            if (field.closest("[data-labels-skip]")) return;
            const original = field.dataset.placeholderOriginal || clean(field.getAttribute("placeholder"));
            if (!labels[original]) return;
            field.dataset.placeholderOriginal = original;
            field.setAttribute("placeholder", labels[original]);
        });
        // عنوان نافذة المتصفح: «اسم الصفحة - اسم البرنامج»
        const parts = document.title.split(" - ");
        if (labels[clean(parts[0])]) { parts[0] = labels[clean(parts[0])]; document.title = parts.join(" - "); }
    }

    apply(document.body);
    // ما يُضاف للصفحة لاحقًا (قوائم منسدلة، نتائج بحث...)
    new MutationObserver((changes) => changes.forEach((change) => change.addedNodes.forEach((node) => {
        if (node.nodeType === 1) apply(node);
    }))).observe(document.body, { childList: true, subtree: true });

    // ---------- وضع تعديل المسميات (للأمين فقط: الشريط موجود في الصفحة لمن له الصلاحية) ----------
    const bar = document.querySelector("[data-label-edit-bar]");
    if (!bar) return;
    const key = "ui-label-edit";
    let on = false;
    try { on = localStorage.getItem(key) === "1"; } catch (e) { }
    const setMode = (value) => {
        on = value;
        try { value ? localStorage.setItem(key, "1") : localStorage.removeItem(key); } catch (e) { }
        document.body.classList.toggle("label-edit-mode", on);
        bar.hidden = !on;
    };
    // زر صغير بجوار عنوان كل صفحة يبدأ وضع التعديل في الصفحة نفسها
    const header = document.querySelector(".app-main .ui-page-header");
    const heading = header?.querySelector("h1, h2");
    if (heading && !document.querySelector("[data-label-edit-start]")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "label-edit-start no-print";
        button.dataset.labelEditStart = "";
        button.dataset.labelsSkip = "";
        button.title = "تعديل المسميات: اضغط بعدها أي عنوان أو اسم حقل في الصفحة واكتب اسمه الجديد";
        button.setAttribute("aria-label", "تعديل المسميات");
        button.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
        heading.appendChild(button);
    }
    setMode(on);
    document.querySelectorAll("[data-label-edit-start]").forEach((button) => button.addEventListener("click", (event) => {
        if (button.tagName === "BUTTON") { event.preventDefault(); event.stopPropagation(); setMode(!on); return; }
        setMode(true);
    }));
    bar.querySelector("[data-label-edit-stop]").addEventListener("click", () => setMode(false));

    // أقرب عنصر نصه المباشر (لا نص عناصره الداخلية) غير فارغ
    function textHolder(target) {
        for (let element = target, depth = 0; element && element !== document.body && depth < 4; element = element.parentElement, depth++) {
            if (element.closest("[data-label-edit-bar]")) return null;
            const own = [...element.childNodes].filter((node) => node.nodeType === 3).map((node) => node.nodeValue).join(" ");
            if (clean(own)) return element;
        }
        return null;
    }

    document.addEventListener("click", async (event) => {
        if (!on || event.target.closest("[data-labels-skip]")) return;
        let current, original;
        const field = event.target.closest("input[placeholder], textarea[placeholder]");
        if (field) {
            // خانة إدخال: يُعدَّل النص الإرشادي الظاهر داخلها
            current = clean(field.getAttribute("placeholder"));
            original = field.dataset.placeholderOriginal || current;
            if (!original) return;
        } else {
            const element = textHolder(event.target);
            if (!element) return;
            const textNodes = [...element.childNodes].filter((node) => node.nodeType === 3 && clean(node.nodeValue));
            current = clean(textNodes.map((node) => node.nodeValue).join(" "));
            original = element.dataset.labelOriginal || current;
        }
        event.preventDefault();
        event.stopPropagation();
        const answer = prompt(`الاسم الجديد لـ «${original}»\n(يتغير في كل مكان يظهر فيه بالبرنامج. اتركه فارغًا ليرجع الاسم الأصلي)`, current);
        if (answer === null) return;
        const body = new URLSearchParams({ original, label: clean(answer), __RequestVerificationToken: bar.dataset.token });
        const response = await fetch(bar.dataset.saveUrl, { method: "POST", body, headers: { "X-Requested-With": "fetch" } });
        if (!response.ok) { alert("تعذر الحفظ. حدّث الصفحة وحاول مرة أخرى."); return; }
        location.reload();
    }, true);
})();
