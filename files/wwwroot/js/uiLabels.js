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
    setMode(on);
    document.querySelectorAll("[data-label-edit-start]").forEach((button) => button.addEventListener("click", () => setMode(true)));
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
        if (!on) return;
        const element = textHolder(event.target);
        if (!element) return;
        event.preventDefault();
        event.stopPropagation();
        const textNodes = [...element.childNodes].filter((node) => node.nodeType === 3 && clean(node.nodeValue));
        const current = clean(textNodes.map((node) => node.nodeValue).join(" "));
        const original = element.dataset.labelOriginal || current;
        const answer = prompt(`الاسم الجديد لـ «${original}»\n(يتغير في كل مكان يظهر فيه بالبرنامج. اتركه فارغًا ليرجع الاسم الأصلي)`, current);
        if (answer === null) return;
        const body = new URLSearchParams({ original, label: clean(answer), __RequestVerificationToken: bar.dataset.token });
        const response = await fetch(bar.dataset.saveUrl, { method: "POST", body, headers: { "X-Requested-With": "fetch" } });
        if (!response.ok) { alert("تعذر الحفظ. حدّث الصفحة وحاول مرة أخرى."); return; }
        location.reload();
    }, true);
})();
