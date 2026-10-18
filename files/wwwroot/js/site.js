// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
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

    const check = async (input, kind) => {
        const value = input.value.trim();
        if (!value) { showMessage(input, true, ""); return; }
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
            else showMessage(input, true, "");
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
// زر «رجوع»: الصفحة السابقة إن كانت من داخل البرنامج، وإلا الرابط الاحتياطي
document.addEventListener("click", event => {
    const link = event.target.closest("[data-back]");
    if (!link) return;
    const previous = document.referrer ? new URL(document.referrer) : null;
    const cameFromApp = previous && previous.origin === location.origin;
    // بعد حفظ نموذج (إضافة/تعديل) لا نعود للنموذج نفسه، بل للرابط الاحتياطي (مثل قائمة الأسر)
    const cameFromForm = previous && /\/(Create|Edit|AddMembers|CreateParents|Delete)\b/i.test(previous.pathname);
    if (cameFromApp && !cameFromForm && history.length > 1) {
        event.preventDefault();
        history.back();
    }
});
// مفتاح Backspace = «رجوع» خطوة للخلف، إلا أثناء الكتابة في خانة أو مع نافذة مفتوحة
document.addEventListener("keydown", event => {
    if (event.key !== "Backspace" || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target.closest && target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;
    if (document.querySelector(".modal.show, dialog[open]")) return;
    event.preventDefault();
    const back = document.querySelector("a[data-back]");
    if (back) back.click();
    else if (history.length > 1) history.back();
});
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
