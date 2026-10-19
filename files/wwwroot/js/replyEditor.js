// محرر الرد: مساحة كتابة كبيرة مع غامق ومائل وتسطير وتكبير الخط وألوان محددة.
// قبل الإرسال يُحوَّل المحتوى إلى وسوم معروفة فقط (يتحقق منها الخادم أيضًا) في الحقل المخفي name=reply.
(() => {
    const sizes = ["rt-lg", "rt-xl"];
    const colors = ["rt-red", "rt-blue", "rt-green", "rt-gold"];
    const known = [...sizes, ...colors];

    const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // تحويل عناصر المحرر إلى الوسوم المسموحة فقط
    function serialize(node) {
        let html = "";
        node.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) { html += escape(child.textContent.replace(/ /g, " ")); return; }
            if (child.nodeType !== Node.ELEMENT_NODE) return;
            const tag = child.tagName;
            const inner = serialize(child);
            if (tag === "BR") { html += "<br>"; return; }
            let wrapped = inner;
            const style = child.style || {};
            if (tag === "B" || tag === "STRONG" || style.fontWeight === "bold" || Number(style.fontWeight) >= 600) wrapped = `<b>${wrapped}</b>`;
            if (tag === "I" || tag === "EM" || style.fontStyle === "italic") wrapped = `<i>${wrapped}</i>`;
            if (tag === "U" || (style.textDecorationLine || style.textDecoration || "").includes("underline")) wrapped = `<u>${wrapped}</u>`;
            (child.classList ? [...child.classList] : []).filter((name) => known.includes(name)).forEach((name) => { wrapped = `<span class="${name}">${wrapped}</span>`; });
            if (tag === "DIV" || tag === "P" || tag === "LI") wrapped = `<div>${wrapped}</div>`;
            html += wrapped;
        });
        return html;
    }

    // لف التحديد بفئة (حجم أو لون)، وإزالة الفئات المماثلة داخله حتى لا تتراكم
    function wrapSelection(editor, name, group) {
        const selection = getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (range.collapsed || !editor.contains(range.commonAncestorContainer)) return;
        const span = document.createElement("span");
        span.className = name;
        span.appendChild(range.extractContents());
        span.querySelectorAll("span").forEach((inner) => {
            group.forEach((other) => inner.classList.remove(other));
            if (!inner.classList.length) inner.replaceWith(...inner.childNodes);
        });
        range.insertNode(span);
        selection.removeAllRanges();
        const after = document.createRange();
        after.selectNodeContents(span);
        selection.addRange(after);
    }

    function clearSelection(editor) {
        document.execCommand("removeFormat");
        const selection = getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const fragment = range.extractContents();
        const holder = document.createElement("div");
        holder.appendChild(fragment);
        holder.innerHTML = escape(holder.innerText).replace(/\n/g, "<br>");
        const nodes = [...holder.childNodes];
        nodes.reverse().forEach((node) => range.insertNode(node));
        editor.normalize();
    }

    document.querySelectorAll("[data-reply-editor]").forEach((box) => {
        const editor = box.querySelector("[data-reply-area]");
        const field = box.querySelector("input[name=reply]");
        const counter = box.querySelector("[data-reply-count]");
        const form = box.closest("form");
        const limit = Number(box.dataset.limit || 3000);

        const update = () => {
            field.value = serialize(editor);
            if (counter) {
                counter.textContent = `${editor.innerText.trim().length} حرف`;
                counter.classList.toggle("is-over", field.value.length > limit);
            }
        };

        box.querySelector(".reply-editor__tools").addEventListener("mousedown", (event) => {
            // لا يفقد المحرر التحديد عند الضغط على الأزرار
            if (event.target.closest("button")) event.preventDefault();
        });
        box.querySelector(".reply-editor__tools").addEventListener("click", (event) => {
            const button = event.target.closest("button[data-cmd]");
            if (!button) return;
            editor.focus();
            const command = button.dataset.cmd;
            if (command === "bold" || command === "italic" || command === "underline") document.execCommand(command);
            else if (sizes.includes(command)) wrapSelection(editor, command, sizes);
            else if (colors.includes(command)) wrapSelection(editor, command, colors);
            else if (command === "clear") clearSelection(editor);
            update();
        });

        // اللصق نصًّا فقط حتى لا يدخل تنسيق غريب
        editor.addEventListener("paste", (event) => {
            event.preventDefault();
            document.execCommand("insertText", false, (event.clipboardData || window.clipboardData).getData("text/plain"));
        });
        editor.addEventListener("input", update);
        editor.addEventListener("keydown", (event) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            const key = event.code;
            if (key === "KeyB") { event.preventDefault(); document.execCommand("bold"); update(); }
            if (key === "KeyI") { event.preventDefault(); document.execCommand("italic"); update(); }
            if (key === "KeyU") { event.preventDefault(); document.execCommand("underline"); update(); }
        });

        form.addEventListener("submit", (event) => {
            update();
            if (!editor.innerText.trim()) { event.preventDefault(); alert("اكتب الرد أولًا."); editor.focus(); return; }
            if (field.value.length > limit) { event.preventDefault(); alert("الرد أطول من المسموح؛ اختصره قليلًا أو قلّل التنسيق."); }
        });
        update();
    });
})();
