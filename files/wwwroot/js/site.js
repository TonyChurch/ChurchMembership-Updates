// البحث بلا فرق بين طرق كتابة الحروف: أ إ آ ← ا، ى ئ ← ي، ة ← ه، ؤ ← و، بلا تشكيل ولا تطويل
window.arabicKey = (text) => String(text ?? "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/[\u0649\u0626\u06CC]/g, "\u064A")
    .replace(/\u0629/g, "\u0647").replace(/\u0624/g, "\u0648").replace(/\u06A9/g, "\u0643")
    .toLowerCase().replace(/\s+/g, " ").trim();
// كل كلمات البحث موجودة في النص
window.arabicMatch = (text, search) => {
    const haystack = window.arabicKey(text);
    return window.arabicKey(search).split(" ").filter(Boolean).every((word) => haystack.includes(word));
};

﻿// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// توحيد عرض كل حقول التاريخ في التطبيق بصيغة يوم/شهر/سنة،
// مع إبقاء حقل التاريخ الأصلي مسؤولًا عن التقويم والحفظ.
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.lang = "en-GB";
        input.setAttribute("data-date-format", "dd/MM/yyyy");

        const wrapper = document.createElement("span");
        wrapper.className = "app-date-field";
        if (input.closest(".app-date-field")) return;

        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        input.classList.add("app-date-native");

        const display = document.createElement("span");
        display.className = "app-date-display";
        display.setAttribute("aria-hidden", "true");

        const renderDate = () => {
            if (!input.value) {
                display.textContent = "يوم / شهر / سنة";
                display.classList.add("is-empty");
                return;
            }

            const [year, month, day] = input.value.split("-");
            display.textContent = `${day}/${month}/${year}`;
            display.classList.remove("is-empty");
        };

        wrapper.appendChild(display);
        input.addEventListener("input", renderDate);
        input.addEventListener("change", renderDate);
        renderDate();
    });
});
(() => {
    const registryKey = "churchMembership.familiesRegistryUrl";
    const registryScrollKey = "churchMembership.familiesRegistryScroll";
    const registryTableScrollKey = "churchMembership.familiesRegistryTableScroll";
    const registryRestoreKey = "churchMembership.familiesRegistryRestore";
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (window.location.pathname.toLowerCase() === "/families") {
        const savedUrl = sessionStorage.getItem(registryKey);
        const shouldRestore = savedUrl === currentUrl && sessionStorage.getItem(registryRestoreKey) === "1";
        const tableWrap = document.querySelector(".families-registry-table .families-table-wrap");

        if (shouldRestore) {
            const pageScroll = Number(sessionStorage.getItem(registryScrollKey) || 0);
            const tableScroll = Number(sessionStorage.getItem(registryTableScrollKey) || 0);
            requestAnimationFrame(() => {
                window.scrollTo({ top: pageScroll, behavior: "instant" });
                if (tableWrap) tableWrap.scrollTop = tableScroll;
            });
            sessionStorage.removeItem(registryRestoreKey);
        }

        sessionStorage.setItem(registryKey, currentUrl);

        const rememberPosition = () => {
            sessionStorage.setItem(registryScrollKey, String(window.scrollY));
            sessionStorage.setItem(registryTableScrollKey, String(tableWrap?.scrollTop || 0));
        };

        document.querySelectorAll(".families-registry-table a").forEach((link) => {
            link.addEventListener("click", () => {
                rememberPosition();
                sessionStorage.setItem(registryRestoreKey, "1");
            });
        });
        window.addEventListener("pagehide", rememberPosition);
    }

    document.querySelectorAll("[data-family-registry-back]").forEach((link) => {
        link.addEventListener("click", (event) => {
            const savedUrl = sessionStorage.getItem(registryKey);
            if (!savedUrl) return;
            event.preventDefault();
            sessionStorage.setItem(registryRestoreKey, "1");
            window.location.href = savedUrl;
        });
    });
})();

// =========================================================
// الرقم القومي والموبايل على مستوى البرنامج كله:
// تحويل الأرقام العربية، أرقام فقط بالطول الصحيح، وفحص فوري للصيغة والتكرار.
// الرقم القومي الصحيح يملأ تاريخ الميلاد والعمر والنوع تلقائيًا.
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    const toLatinDigits = value => value
        .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06F0));
    const mobileFields = /(^|\.)(Phone|Phone2|PrimaryPhone|SecondaryPhone|WhatsAppNumber|PhoneNumber|ExternalConfessionFatherPhone)$/i;
    const nationalIdFields = /(^|\.)NationalId$/;

    // سياق النموذج: هل هو عضو أو أسرة أو خادم؟ حتى لا يُعتبر رقمه الحالي تكرارًا
    const contextOf = (form, input) => {
        const params = new URLSearchParams();
        // الحقل نفسه قد يحدد صاحبه (مثل أرقام الأفراد في نافذة تواصل الأسرة)
        if (input?.dataset.memberId || input?.dataset.familyId) {
            if (input.dataset.memberId) params.set("memberId", input.dataset.memberId);
            if (input.dataset.familyId) params.set("familyId", input.dataset.familyId);
            if (input.hasAttribute("data-family-phone")) params.set("family", "true");
            return params;
        }
        const action = (form?.getAttribute("action") || location.pathname).toLowerCase();
        const id = form?.querySelector('input[name="Id"]')?.value || "";
        const familyId = form?.querySelector('input[name="FamilyId"]')?.value || "";
        if (action.includes("/members/")) params.set("memberId", id);
        else if (action.includes("/families/") && !action.includes("memberwizard")) { params.set("familyId", id); params.set("family", "true"); }
        else if (action.includes("/servants/")) params.set("servantId", id);
        if (familyId) params.set("familyId", familyId);
        return params;
    };

    const showMessage = (input, ok, message) => {
        let note = input.parentElement.querySelector(".id-check");
        if (!note) {
            note = document.createElement("small");
            note.className = "id-check";
            (input.closest(".input-group, .ui-input-icon") || input).insertAdjacentElement("afterend", note);
        }
        note.textContent = message || "";
        note.classList.toggle("is-error", !ok);
        note.classList.toggle("is-ok", ok && !!message);
        input.classList.toggle("is-invalid", !ok);
        input.setCustomValidity(ok ? "" : message || "قيمة غير صحيحة");
    };

    const fillFromNationalId = (input, data) => {
        const form = input.form || document;
        const prefix = input.name.includes(".") ? input.name.slice(0, input.name.lastIndexOf(".") + 1) : "";
        const set = (name, value) => {
            const target = form.querySelector(`[name="${prefix}${name}"]`) || (!prefix && document.getElementById(name));
            if (!target || value === undefined) return;
            target.value = value;
            target.dispatchEvent(new Event("change", { bubbles: true }));
        };
        set("BirthDate", data.birthDate);
        set("Age", data.age);
        set("Gender", data.gender);
        // المرحلة والفصل حسب السن، ما لم يخترهما المستخدم بيده
        const stage = form.querySelector(`[name="${prefix}ServiceStageId"]`);
        if (stage && !stage.dataset.manual && (!stage.value || stage.dataset.auto) && data.stageId) {
            set("ServiceStageId", String(data.stageId));
            set("ServiceClassId", data.classId ? String(data.classId) : "");
            stage.dataset.auto = "1";
        }
    };

    // اختيار المرحلة أو الفصل باليد يوقف التوزيع التلقائي لهذا الفرد؛ وترك المرحلة فارغة يعيده
    document.addEventListener("change", event => {
        const name = event.target.name || "";
        if (!event.isTrusted || !/(^|\.)Service(Stage|Class)Id$/.test(name)) return;
        const prefix = name.slice(0, name.lastIndexOf(".") + 1);
        const stage = (event.target.form || document).querySelector(`[name="${prefix}ServiceStageId"]`);
        if (!stage) return;
        delete stage.dataset.auto;
        if (stage.value) stage.dataset.manual = "1";
        else delete stage.dataset.manual;
    });

    const roleOf = input => input.closest("[data-pane]")?.dataset.slot
        ?? { "1": "father", "2": "mother" }[input.form?.querySelector('[name="FamilyRole"]')?.value];

    // الأب ذكر والأم (الزوجة) أنثى: الصفة من لوحة «إضافة أسرة» أو من قائمة «صلة العضو بالأسرة»
    const roleGenderError = (input, gender) => {
        const role = roleOf(input);
        if (role === "father" && gender !== "ذكر") return "الرقم القومي لأنثى، ولا يصح تسجيلها أبًا للأسرة.";
        if (role === "mother" && gender !== "أنثى") return "الرقم القومي لذكر، ولا يصح تسجيله أمًّا (زوجة) للأسرة.";
        return "";
    };
    // تغيير الصفة في صفحة تعديل الفرد يعيد فحص الرقم القومي
    document.addEventListener("change", event => {
        if (event.target.name !== "FamilyRole") return;
        const id = event.target.form?.querySelector('[name="NationalId"]');
        if (id?.dataset.identitySetup) check(id, "NationalId");
    });

    // صاحب الرقم إن وُجد: بطاقة صغيرة تحت الخانة بالاسم والكود والأسرة والمكان والهاتف والعنوان ورابط الملف
    const escapeHtml = text => String(text ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    const showOwner = (input, owner) => {
        let card = input.parentElement.querySelector(".id-owner");
        if (!owner) { card?.remove(); return; }
        if (!card) {
            card = document.createElement("div");
            card.className = "id-owner";
            (input.parentElement.querySelector(".id-check") || input).insertAdjacentElement("afterend", card);
        }
        const parts = [owner.code, owner.family ? "أسرة " + owner.family : "", owner.phone, owner.address].filter(Boolean);
        card.innerHTML = `<i class="bi bi-person-vcard-fill" aria-hidden="true"></i><span><b>${escapeHtml(owner.kind)} ${escapeHtml(owner.name)}${owner.hidden ? " (مخفي)" : ""}</b>`
            + (parts.length ? `<small>${parts.map(escapeHtml).join(" · ")}</small>` : "")
            + (owner.place ? `<small class="is-place">${escapeHtml(owner.place)}</small>` : "") + "</span>"
            + (owner.url ? `<a href="${owner.url}" target="_blank" rel="noopener">فتح الملف</a>` : "");
    };
    // في صفحات العضو والأسرة والخادم لا يتكرر الرقم (خطأ يمنع الحفظ)؛ وفي باقي الصفحات يُعرض صاحبه للعلم فقط
    const isStrict = (form, input) => {
        if (input?.dataset.memberId || input?.dataset.familyId) return true;
        const action = (form?.getAttribute("action") || location.pathname).toLowerCase();
        return /\/(members|families|servants)(\/|$|\?)/.test(action);
    };

    const check = async (input, kind) => {
        const value = input.value.trim();
        if (!value) { showMessage(input, true, ""); showOwner(input, null); return; }
        const params = contextOf(input.form, input);
        params.set("value", value);
        // هاتف أب الاعتراف وهاتف حساب المستخدم: الشكل فقط (يتكرران طبيعيًا)
        if (/(ExternalConfessionFather\w*|PhoneNumber)$/.test(input.name)) params.set("formatOnly", "true");
        // الأب والأم البالغان يُقترح لهما مرحلة الأسرة
        if (kind === "NationalId" && ["father", "mother"].includes(roleOf(input))) params.set("parent", "true");
        try {
            const response = await fetch(`/Validation/${kind}?${params}`, { headers: { "Accept": "application/json" } });
            if (!response.ok) return;
            const data = await response.json();
            if (kind === "NationalId" && data.birthDate) fillFromNationalId(input, data);
            const genderError = kind === "NationalId" && data.ok && data.gender ? roleGenderError(input, data.gender) : "";
            if (genderError) { showMessage(input, false, genderError); return; }
            showOwner(input, data.owner);
            if (!data.ok && "owner" in data && !isStrict(input.form, input)) {
                showMessage(input, true, data.owner ? "ℹ️ مسجل في البرنامج:" : "ℹ️ " + data.message.replace("بالفعل ", ""));
                return;
            }
            showMessage(input, data.ok, data.ok ? (kind === "NationalId" && data.birthDate ? `✓ ${data.gender} · ${data.age} سنة` : "✓") : data.message);
        } catch { /* الفحص الفوري اختياري؛ الحفظ يتحقق مرة أخرى */ }
    };

    const setup = (input, kind, length) => {
        if (input.dataset.identitySetup) return;
        input.dataset.identitySetup = "1";
        input.setAttribute("inputmode", "numeric");
        input.setAttribute("maxlength", String(length));
        input.setAttribute("dir", "ltr");
        input.addEventListener("input", () => {
            const clean = toLatinDigits(input.value).replace(/\D/g, "").slice(0, length);
            if (clean !== input.value) input.value = clean;
            if (clean.length === length) check(input, kind);
            else { showMessage(input, true, ""); showOwner(input, null); }
        });
        input.addEventListener("blur", () => {
            if (!input.value) return;
            if (input.value.length !== length) {
                showMessage(input, false, kind === "NationalId"
                    ? "الرقم القومي يجب أن يكون 14 رقمًا."
                    : "رقم الموبايل يجب أن يكون 11 رقمًا ويبدأ بـ 01.");
            } else {
                check(input, kind);
            }
        });
    };

    const scan = root => {
        root.querySelectorAll("input[name]").forEach(input => {
            if (input.type === "hidden" || input.readOnly) return;
            if (nationalIdFields.test(input.name)) {
                setup(input, "NationalId", 14);
                // رقم معروض مسبقًا (بعد محاولة حفظ فيها خطأ): يُفحص فورًا حتى يظهر تعارض النوع مع الصفة
                if (input.closest("[data-pane]") && input.value.length === 14) check(input, "NationalId");
            }
            else if (mobileFields.test(input.name)) setup(input, "Mobile", 11);
        });
    };
    scan(document);
    // للأجزاء التي تُضاف لاحقًا للصفحة (مثل فرد جديد في صفحة إضافة أسرة)
    window.setupIdentityFields = scan;
});
// زر «رجوع» ومفتاح Backspace واختصارات لوحة المفاتيح: في keyboard.js
// نوع احتياج ذوي الهمم: القائمة تملأ الخانة المحفوظة؛ «أخرى» تُظهرها للكتابة
document.addEventListener("change", event => {
    const select = event.target.closest("[data-sn-select]");
    if (!select) return;
    const input = select.closest("[data-sn-picker]").querySelector("[data-sn-other]");
    const other = select.value === "أخرى";
    input.type = other ? "text" : "hidden";
    input.value = other ? "" : select.value;
    if (other) input.focus();
});

// =========================================================
// علامة «صح» خضراء تحت كل خانة مُلئت بلا أخطاء، في كل نماذج الحفظ بالبرنامج.
// تظهر بعد الخروج من الخانة (لا أثناء الكتابة)، وتختفي إن فُرغت الخانة أو صارت خاطئة.
// خانات الرقم القومي والموبايل لها رسالتها الخاصة (✓ أو الخطأ) من فحص الهوية أعلاه.
// في الصفوف والجداول الضيقة تظهر العلامة داخل الخانة نفسها حتى لا يختل الترتيب.
// =========================================================
(() => {
    const SKIP_TYPES = /^(hidden|checkbox|radio|file|submit|button|reset|search|image|range|color)$/;
    const eligible = field => {
        if (!(field instanceof HTMLElement) || !field.matches("input, select, textarea")) return false;
        if (field.tagName === "INPUT" && SKIP_TYPES.test(field.type)) return false;
        if (field.disabled || field.readOnly || field.dataset.identitySetup || field.closest("[data-no-ok]")) return false;
        const form = field.form;
        // نماذج الحفظ فقط داخل محتوى الصفحة (لا البحث والفلاتر ولا الشريط الجانبي)
        return !!form && (form.method || "").toLowerCase() === "post" && !!field.closest(".app-main, main");
    };
    const compact = field => !!field.closest(".clinic-row, td, th, .input-group, .fb-field");
    const anchorOf = field => field.closest(".app-date-field") || field;

    function mark(field) {
        if (!eligible(field)) return;
        const anchor = anchorOf(field);
        let note = anchor.nextElementSibling?.classList.contains("field-ok") ? anchor.nextElementSibling : null;
        const ok = field.value.trim() !== "" && field.checkValidity();
        if (compact(field)) {
            note?.remove();
            field.classList.toggle("is-ok-mark", ok);
            return;
        }
        if (!ok) { note?.remove(); return; }
        if (!note) {
            note = document.createElement("small");
            note.className = "field-ok";
            note.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>';
            note.setAttribute("aria-hidden", "true");
            anchor.insertAdjacentElement("afterend", note);
        }
    }

    document.addEventListener("focusout", event => mark(event.target));
    document.addEventListener("change", event => mark(event.target));
    // أثناء الكتابة: تُزال العلامة إن صارت الخانة فارغة أو خاطئة فقط
    document.addEventListener("input", event => {
        const field = event.target;
        if (!eligible(field)) return;
        if (field.value.trim() === "" || !field.checkValidity()) {
            field.classList.remove("is-ok-mark");
            const anchor = anchorOf(field);
            if (anchor.nextElementSibling?.classList.contains("field-ok")) anchor.nextElementSibling.remove();
        }
    });
})();

// لوحة التحكم: بنود الأرامل وكبار السن والمرضى في «يحتاج انتباهك»، بأعدادها وروابطها من تبويبات صفحة الأعضاء
(() => {
    const grid = document.querySelector(".dashx-attention__grid");
    if (!grid) return;
    fetch("/Members", { headers: { Accept: "text/html" } })
        .then(response => response.ok && !response.redirected ? response.text() : "")
        .then(html => {
            const page = new DOMParser().parseFromString(html, "text/html");
            [["widows", "الأرامل"], ["elderly", "كبار السن"], ["chronic", "المرضى"]].forEach(([key, label]) => {
                const tab = page.querySelector(`a.ui-tabs__item[href*="care=${key}"]`);
                if (!tab) return;
                const count = Number(tab.querySelector("b")?.textContent.trim()) || 0;
                const item = document.createElement("a");
                item.href = tab.getAttribute("href");
                item.className = `dashx-alert ${count ? "is-info" : "is-ok"}`;
                const icon = document.createElement("i");
                icon.className = tab.querySelector("i")?.className || "bi bi-people";
                icon.setAttribute("aria-hidden", "true");
                const text = document.createElement("span");
                text.textContent = label;
                const value = document.createElement("b");
                value.textContent = count || "✓";
                item.append(icon, text, value);
                grid.insertBefore(item, count ? grid.querySelector(".is-ok") : null);
                const total = document.querySelector(".dashx-attention__total");
                if (total && count) total.textContent = `${(parseInt(total.textContent, 10) || 0) + 1} بند`;
            });
        })
        .catch(() => { /* البنود إضافية: اللوحة تعمل بدونها */ });
})();

// جرس الإشعارات للإدارة العامة: ما أضافه المستخدمون الآخرون (يظهر فقط إن أتاح الخادم القائمة لهذا الحساب)
(() => {
    const bar = document.querySelector(".topbar-family-commands");
    const inner = document.querySelector(".topbar__inner");
    if (!bar || !inner) return;
    const seenKey = "activity-seen";
    const readSeen = () => { try { return localStorage.getItem(seenKey) || ""; } catch { return ""; } };
    const writeSeen = value => { try { localStorage.setItem(seenKey, value); } catch { /* يكفي عدّاد هذه الجلسة */ } };
    let button, badge, panel, list = [];

    const when = value => new Date(value).toLocaleString("ar-EG", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" });
    const refreshBadge = () => {
        const seen = readSeen();
        const unread = list.filter(item => item.at > seen).length;
        badge.textContent = unread > 99 ? "99+" : unread;
        badge.hidden = unread === 0;
        button.setAttribute("aria-label", unread ? `الإشعارات: ${unread} جديد` : "الإشعارات");
    };
    const render = () => {
        const seen = readSeen();
        panel.replaceChildren();
        const title = document.createElement("strong");
        title.className = "activity-panel__title";
        title.textContent = "الإضافات الجديدة من المستخدمين";
        panel.append(title);
        if (list.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "لا توجد إضافات في آخر أسبوعين.";
            panel.append(empty);
        }
        list.forEach(item => {
            const row = document.createElement("a");
            row.href = item.url;
            row.className = item.at > seen ? "activity-panel__item is-new" : "activity-panel__item";
            const who = document.createElement("b");
            who.textContent = item.by;
            const what = document.createElement("span");
            what.textContent = item.text;
            const time = document.createElement("small");
            time.textContent = when(item.at);
            row.append(who, what, time);
            panel.append(row);
        });
    };
    const close = () => { panel.hidden = true; button.setAttribute("aria-expanded", "false"); };
    const toggle = () => {
        if (!panel.hidden) { close(); return; }
        render();
        const box = button.getBoundingClientRect();
        panel.style.top = `${Math.round(box.bottom + 8)}px`;
        panel.hidden = false;
        button.setAttribute("aria-expanded", "true");
        if (list.length) writeSeen(list[0].at);
        refreshBadge();
    };
    const build = () => {
        button = document.createElement("button");
        button.type = "button";
        // شريط الأوامر مخفي على الشاشات الصغيرة: يوضع الجرس بجوار زر القائمة
        const compact = !bar.offsetParent;
        button.className = compact ? "activity-bell activity-bell--compact" : "topbar-global-command activity-bell";
        button.setAttribute("aria-expanded", "false");
        button.title = "الإشعارات";
        const icon = document.createElement("i");
        icon.className = "bi bi-bell-fill";
        icon.setAttribute("aria-hidden", "true");
        badge = document.createElement("span");
        badge.className = "activity-bell__badge";
        badge.hidden = true;
        button.append(icon, badge);
        panel = document.createElement("div");
        panel.className = "activity-panel";
        panel.hidden = true;
        if (compact) inner.insertBefore(button, inner.querySelector(".topbar__menu")); else bar.append(button);
        document.body.append(panel);
        button.addEventListener("click", event => { event.stopPropagation(); toggle(); });
        panel.addEventListener("click", event => event.stopPropagation());
        document.addEventListener("click", close);
        document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    };
    const load = () => fetch("/api/activity/recent", { headers: { Accept: "application/json" } })
        .then(response => response.ok ? response.json() : null)
        .then(items => {
            if (!items) return;
            list = items;
            if (!button) build();
            refreshBadge();
        })
        .catch(() => { /* الجرس إضافي: البرنامج يعمل بدونه */ });
    load();
    setInterval(() => { if (!document.hidden) load(); }, 120000);
})();

// صفحات الأسرة: زر ثابت يفتح «إضافة أسرة» مباشرة
(() => {
    const path = location.pathname.toLowerCase();
    if (!/^\/families(\/|$)/.test(path) || path.startsWith("/families/create")) return;
    const link = document.createElement("a");
    link.href = "/Families/Create";
    link.className = "family-add-fab";
    const icon = document.createElement("i");
    icon.className = "bi bi-house-add-fill";
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = "أسرة جديدة";
    link.append(icon, text);
    document.body.append(link);
})();

// صفحة بيانات الأسرة: زر «إضافة مناسبة». المناسبة تتبع أسرة محفوظة، فالأسرة الجديدة تُحفظ أولًا ثم تفتح صفحة المناسبة
(() => {
    const key = "family-add-event";
    const read = () => { try { return Number(sessionStorage.getItem(key)) || 0; } catch { return 0; } };
    const write = value => { try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch { /* تُحفظ الأسرة فقط */ } };
    const eventUrl = id => `/MemberEvents/Create?familyId=${id}&returnUrl=${encodeURIComponent(`/Families/Profile/${id}`)}`;
    const path = location.pathname.toLowerCase();

    const saved = path.match(/^\/families\/profile\/(\d+)/);
    if (saved) {
        const asked = read();
        write(0);
        if (asked && Date.now() - asked < 600000) location.replace(eventUrl(saved[1]));
        return;
    }

    const save = document.querySelector(".fb-top .fb-save");
    if (!save) return;
    const existing = path.match(/^\/families\/addmembers\/(\d+)/);
    const actions = document.createElement("div");
    actions.className = "fb-top__actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-btn fb-add-event";
    button.title = existing ? "فتح صفحة مناسبة لهذه الأسرة" : "تُحفظ الأسرة أولًا ثم تفتح صفحة المناسبة";
    const icon = document.createElement("i");
    icon.className = "bi bi-calendar-heart";
    icon.setAttribute("aria-hidden", "true");
    button.append(icon, " إضافة مناسبة");
    save.replaceWith(actions);
    actions.append(button, save);
    save.addEventListener("click", () => write(0));
    button.addEventListener("click", () => {
        if (existing) { location.href = eventUrl(existing[1]); return; }
        write(Date.now());
        save.form.requestSubmit(save);
    });
})();
