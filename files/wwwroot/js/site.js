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
// مكانه بجوار «ابحث في البرنامج» في القائمة الجانبية فيبقى ظاهرًا، وعلى الموبايل يظهر العدد على زر القائمة أيضًا
(() => {
    const searches = [...document.querySelectorAll(".right-sidebar__search")];
    if (!searches.length) return;
    const seenKey = "activity-seen";
    const readSeen = () => { try { return localStorage.getItem(seenKey) || ""; } catch { return ""; } };
    const writeSeen = value => { try { localStorage.setItem(seenKey, value); } catch { /* يكفي عدّاد هذه الجلسة */ } };
    let buttons = [], badges = [], panel, opener = null, list = [];

    const when = value => new Date(value).toLocaleString("ar-EG", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" });
    const refreshBadge = () => {
        const seen = readSeen();
        const unread = list.filter(item => item.at > seen).length;
        badges.forEach(badge => {
            badge.textContent = unread > 99 ? "99+" : unread;
            badge.hidden = unread === 0;
        });
        buttons.forEach(button => button.setAttribute("aria-label", unread ? `الإشعارات: ${unread} جديد` : "الإشعارات"));
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
            empty.textContent = "لا توجد إضافات من المستخدمين الآخرين في آخر أسبوعين.";
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
    const close = () => {
        panel.hidden = true;
        buttons.forEach(button => button.setAttribute("aria-expanded", "false"));
        opener = null;
    };
    const toggle = button => {
        if (!panel.hidden && opener === button) { close(); return; }
        render();
        // القائمة تنفتح بجوار القائمة الجانبية من جهة الصفحة، وعلى الموبايل تحت الجرس
        const box = button.getBoundingClientRect();
        const side = button.closest(".right-sidebar")?.getBoundingClientRect();
        const room = side ? side.left : 0;
        panel.style.left = "auto";
        if (room > 300) {
            panel.style.top = `${Math.round(Math.max(8, box.top))}px`;
            panel.style.right = `${Math.round(window.innerWidth - room + 8)}px`;
        } else {
            panel.style.top = `${Math.round(box.bottom + 8)}px`;
            panel.style.right = "12px";
        }
        panel.hidden = false;
        opener = button;
        buttons.forEach(item => item.setAttribute("aria-expanded", item === button ? "true" : "false"));
        if (list.length) writeSeen(list[0].at);
        refreshBadge();
    };
    const build = () => {
        searches.forEach(search => {
            const row = document.createElement("div");
            row.className = "activity-search-row";
            search.before(row);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "activity-bell activity-bell--side";
            button.setAttribute("aria-expanded", "false");
            button.title = "الإشعارات: ما أضافه المستخدمون";
            const icon = document.createElement("i");
            icon.className = "bi bi-bell-fill";
            icon.setAttribute("aria-hidden", "true");
            const badge = document.createElement("span");
            badge.className = "activity-bell__badge";
            badge.hidden = true;
            button.append(icon, badge);
            row.append(search, button);
            button.addEventListener("click", event => { event.stopPropagation(); toggle(button); });
            buttons.push(button);
            badges.push(badge);
        });
        // زر القائمة في الموبايل يحمل العدد نفسه
        const menu = document.querySelector(".topbar__menu");
        if (menu) {
            const badge = document.createElement("span");
            badge.className = "activity-bell__badge activity-bell__badge--menu";
            badge.hidden = true;
            menu.classList.add("activity-bell");
            menu.append(badge);
            badges.push(badge);
        }
        panel = document.createElement("div");
        panel.className = "activity-panel";
        panel.hidden = true;
        document.body.append(panel);
        panel.addEventListener("click", event => event.stopPropagation());
        document.addEventListener("click", close);
        document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    };
    const load = () => fetch("/api/activity/recent", { headers: { Accept: "application/json" } })
        .then(response => response.ok ? response.json() : null)
        .then(items => {
            if (!items) return;
            list = items;
            if (!panel) build();
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

// صفحة بيانات الأسرة: «إضافة مناسبة». المناسبات تُكتب في الاستمارة وتُحفظ بعد حفظ الأسرة مباشرة في ملفها
(() => {
    const queueKey = "family-events", savingKey = "family-events-saving";
    const load = () => { try { return JSON.parse(sessionStorage.getItem(queueKey)) || []; } catch { return []; } };
    const store = list => { try { sessionStorage.setItem(queueKey, JSON.stringify(list)); } catch { /* تبقى في الصفحة فقط */ } };
    const mark = value => { try { if (value) sessionStorage.setItem(savingKey, value); else sessionStorage.removeItem(savingKey); } catch { /* لا شيء */ } };
    const marked = () => { try { return Number(sessionStorage.getItem(savingKey)) || 0; } catch { return 0; } };
    const clear = () => { store([]); mark(0); };
    const eventUrl = id => `/MemberEvents/Create?familyId=${id}&returnUrl=${encodeURIComponent(`/Families/Profile/${id}`)}`;
    const path = location.pathname.toLowerCase();

    // بعد الحفظ: الأسرة صارت لها صفحة، فتُرسل مناسباتها عبر نموذج المناسبة المعتاد
    const saved = path.match(/^\/families\/profile\/(\d+)/);
    if (saved) {
        const justSaved = Date.now() - marked() < 120000 && document.referrer.toLowerCase().includes("/families/create");
        const list = justSaved ? load() : [];
        mark(0);
        if (!list.length) return;
        clear();
        (async () => {
            const failed = [];
            for (const item of list) {
                try {
                    const page = await (await fetch(eventUrl(saved[1]))).text();
                    const form = [...new DOMParser().parseFromString(page, "text/html").forms].find(entry => entry.querySelector('[name="EventType"]'));
                    const data = new FormData(form);
                    const owner = [...form.querySelector('[name="MemberId"]').options].find(option => option.textContent.trim() === item.person);
                    data.set("EventType", item.type);
                    data.set("MemberId", owner ? owner.value : "");
                    data.set("Title", item.person ? item.title : `${item.kind} — ${document.title.split(" - ")[0].replace("ملف ", "")}`);
                    data.set("EventDate", item.date);
                    data.set("Recurrence", item.recurrence);
                    data.set("Notes", item.notes);
                    const response = await fetch(form.getAttribute("action"), { method: "POST", body: new URLSearchParams(data) });
                    if (!response.ok || response.url.includes("/MemberEvents/")) failed.push(item.title);
                } catch { failed.push(item.title); }
            }
            if (!failed.length) { location.reload(); return; }
            const alert = document.createElement("div");
            alert.className = "ui-flash ui-flash--danger";
            alert.setAttribute("role", "alert");
            alert.textContent = `حُفظت الأسرة، لكن لم تُحفظ هذه المناسبات: ${failed.join("، ")}. أضفها من «مناسبات الأسرة».`;
            (document.querySelector(".ui-page") || document.querySelector("main") || document.body).prepend(alert);
        })();
        return;
    }

    const save = document.querySelector(".fb-top .fb-save");
    if (!save) return;
    const actions = document.createElement("div");
    actions.className = "fb-top__actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-btn fb-add-event";
    const icon = document.createElement("i");
    icon.className = "bi bi-calendar-heart";
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    button.append(icon, " ", label);
    save.replaceWith(actions);
    actions.append(button, save);

    const existing = path.match(/^\/families\/addmembers\/(\d+)/);
    if (existing) {
        label.textContent = "إضافة مناسبة";
        button.addEventListener("click", () => { location.href = eventUrl(existing[1]); });
        return;
    }

    // الصفحة بعد ملاحظات الحفظ تحتفظ بالمناسبات، والصفحة الجديدة تبدأ فارغة
    if (!document.querySelector(".fb-errors")) store([]);
    mark(0);
    // عيد الميلاد يُنشأ تلقائيًا من الرقم القومي عند حفظ الأسرة، فلا يُختار هنا
    const types = [[1, "عيد زواج"], [2, "معمودية"], [3, "الميرون"], [4, "أول اعتراف"], [5, "أول تناول"], [6, "سيامة أغنسطس"], [7, "سيامة أبسالتس"],
        [8, "سيامة قارئ"], [9, "سيامة شماس"], [10, "سيامة كاهن"], [11, "سيامة قمص"], [12, "بدء الخدمة"], [14, "نياحة"], [13, "مناسبة أخرى"]];
    const yearly = [1, 14];
    const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    };
    const labelled = (text, control) => {
        const box = make("label", "fb-events__field");
        box.append(make("span", "", text), control);
        return box;
    };
    const fill = (select, items) => {
        select.replaceChildren(...items.map(([value, text]) => {
            const option = make("option", "", text);
            option.value = value;
            return option;
        }));
    };

    const panel = make("section", "ui-card fb-events");
    panel.hidden = true;
    panel.append(make("strong", "fb-events__title", "مناسبات الأسرة"), make("small", "fb-events__hint", "تُحفظ مع الأسرة عند الضغط على «حفظ الأسرة»."));
    const grid = make("div", "fb-events__grid");
    const type = make("select", "form-select"), person = make("select", "form-select"), date = make("input", "form-control"),
        recurrence = make("select", "form-select"), notes = make("input", "form-control");
    fill(type, types);
    fill(recurrence, [["0", "لا يتكرر"], ["1", "سنوي"], ["2", "شهري"], ["3", "أسبوعي"]]);
    date.type = "date";
    recurrence.value = "1";
    notes.placeholder = "اختياري";
    type.addEventListener("change", () => { recurrence.value = yearly.includes(Number(type.value)) ? "1" : "0"; });
    const add = make("button", "ui-btn", "أضف المناسبة");
    add.type = "button";
    grid.append(labelled("نوع المناسبة", type), labelled("صاحب المناسبة", person), labelled("التاريخ", date), labelled("التكرار", recurrence), labelled("ملاحظات", notes), add);
    const rows = make("ul", "fb-events__list");
    panel.append(grid, rows);
    save.closest(".fb-top").after(panel);

    const people = () => [...document.querySelectorAll("[data-slot]")]
        .map(pane => (pane.querySelector('[name$="].FullName"]')?.value || "").trim()).filter(Boolean);
    const draw = () => {
        const list = load();
        label.textContent = list.length ? `إضافة مناسبة (${list.length})` : "إضافة مناسبة";
        rows.replaceChildren(...list.map((item, index) => {
            const row = make("li", "", `${item.title} — ${item.date}`);
            const remove = make("button", "fb-events__remove", "حذف");
            remove.type = "button";
            remove.addEventListener("click", () => { const next = load(); next.splice(index, 1); store(next); draw(); });
            row.append(remove);
            return row;
        }));
    };
    button.addEventListener("click", () => {
        fill(person, [["", "الأسرة كلها (مناسبة عامة)"], ...people().map(name => [name, name])]);
        panel.hidden = !panel.hidden;
    });
    add.addEventListener("click", () => {
        if (!date.value) { date.focus(); return; }
        const kind = types.find(([value]) => value === Number(type.value))[1];
        const owner = person.value || `أسرة ${people()[0] || ""}`.trim();
        store([...load(), { kind, type: type.value, person: person.value, date: date.value, recurrence: recurrence.value, notes: notes.value.trim(), title: `${kind} — ${owner}` }]);
        date.value = notes.value = "";
        draw();
    });
    // يعمل بعد فحص الاستمارة: الحفظ الموقوف بملاحظات لا يُحتسب
    document.addEventListener("submit", event => {
        if (event.target === save.form && !event.defaultPrevented && load().length) mark(Date.now());
    });
    draw();
})();

// الحضانة: صورة الطفل في نموذج التسجيل وملفه. تُصغَّر في المتصفح، وصورة الطفل الجديد تُرفع بعد حفظ بياناته
(() => {
    const path = location.pathname.toLowerCase();
    if (!path.startsWith("/nursery")) return;
    const key = "nursery-new-photo";
    const url = id => `/api/activity/nursery-photo/${id}`;
    const read = () => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
    const write = value => { try { if (value) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); } catch { /* تُضاف الصورة من ملف الطفل */ } };
    const send = (id, blob, method = "POST") => fetch(url(id), { method, headers: { "X-Nursery-Photo": "1", "Content-Type": "image/jpeg" }, body: blob });

    const shrink = file => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, 800 / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(image.src);
            resolve(canvas.toDataURL("image/jpeg", .85));
        };
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
    });
    const toBlob = async data => (await fetch(data)).blob();

    // بعد الحفظ: يُعرف الطفل الجديد من صفحة ملفه، أو من أحدث رابط باسمه في القائمة
    const pending = read();
    const form = document.querySelector("form.nursery-child-form");
    const onChild = path.match(/^\/nursery\/child\/(\d+)/);
    const saved = onChild ? onChild[1] : [...document.querySelectorAll('a[href^="/Nursery/Child/"]')]
        .filter(link => pending && link.textContent.includes(pending.name))
        .map(link => Number(link.getAttribute("href").split("/").pop())).sort((a, b) => b - a)[0];
    const fresh = pending && Date.now() - pending.at < 120000 && document.referrer.toLowerCase().includes("/nursery");
    if (pending) write(null);
    const uploaded = fresh && saved
        ? toBlob(pending.data).then(blob => send(saved, blob)).catch(() => null)
        : Promise.resolve(null);

    if (!form) return;
    const id = form.querySelector('[name="id"]')?.value;
    const childId = onChild && id && id !== "0" ? id : "";
    const box = document.createElement("div");
    box.className = "nursery-photo";
    const preview = document.createElement("img");
    preview.alt = "صورة الطفل";
    preview.hidden = true;
    const empty = document.createElement("i");
    empty.className = "bi bi-person-bounding-box";
    empty.setAttribute("aria-hidden", "true");
    const pick = document.createElement("label");
    pick.className = "ui-btn ui-btn--ghost";
    pick.textContent = "صورة الطفل";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    pick.append(input);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "nursery-photo__remove";
    remove.textContent = "حذف الصورة";
    remove.hidden = true;
    const status = document.createElement("small");
    box.append(preview, empty, pick, remove, status);
    form.prepend(box);

    // في ملف الطفل تظهر الصورة أيضًا بجوار اسمه
    const heading = childId ? document.querySelector("h1") : null;
    const avatar = document.createElement("img");
    avatar.className = "nursery-photo__head";
    avatar.alt = "صورة الطفل";
    avatar.hidden = true;
    heading?.parentElement.prepend(avatar);
    const show = source => {
        preview.src = source;
        preview.hidden = !source;
        avatar.src = source;
        avatar.hidden = !source;
        empty.hidden = !!source;
        remove.hidden = !source;
    };
    let chosen = "";
    if (childId) {
        uploaded.finally(() => {
            preview.onerror = () => show("");
            show(`${url(childId)}?t=${Date.now()}`);
        });
    }
    input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        status.textContent = "";
        try {
            chosen = await shrink(file);
            show(chosen);
            if (childId) {
                const response = await send(childId, await toBlob(chosen));
                status.textContent = response.ok ? "حُفظت الصورة." : "تعذر حفظ الصورة.";
            }
        } catch { status.textContent = "تعذر قراءة الصورة، اختر صورة أخرى."; }
        input.value = "";
    });
    remove.addEventListener("click", async () => {
        chosen = "";
        show("");
        if (childId) await fetch(url(childId), { method: "DELETE", headers: { "X-Nursery-Photo": "1" } });
    });
    form.addEventListener("submit", () => {
        if (chosen && !childId) write({ name: form.querySelector('[name="name"]').value.trim(), data: chosen, at: Date.now() });
    });
})();

// الحضانة: الأطفال في جدول على مثال سجل الأسر، مع بحث بالاسم أو الهاتف
(() => {
    const list = document.querySelector(".nursery-children");
    if (!list || location.pathname.toLowerCase().replace(/\/$/, "") !== "/nursery") return;
    const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    };
    const cell = (...content) => {
        const box = make("td");
        box.append(...content);
        return box;
    };
    const rows = [...list.querySelectorAll(".nursery-child")].map((card, index) => {
        const name = card.querySelector("strong").textContent.trim();
        const href = card.getAttribute("href");
        const id = href.split("/").pop();
        const [age, guardian = ""] = card.querySelector("small").textContent.split("· ولي الأمر:").map(item => item.trim());
        const phone = card.querySelector('small[dir="ltr"]')?.textContent.trim() || "";
        const health = card.querySelector(".nursery-health")?.textContent.trim() || "";
        const group = card.querySelector(".workshop-chip")?.textContent.trim() || "—";

        const avatar = make("span", "ui-avatar", name[0]);
        avatar.setAttribute("aria-hidden", "true");
        const photo = make("img", "nursery-table__photo");
        photo.alt = "";
        photo.loading = "lazy";
        photo.src = `/api/activity/nursery-photo/${id}`;
        photo.addEventListener("load", () => avatar.replaceChildren(photo));
        const link = make("a", "", name);
        link.href = href;
        const text = make("span", "ui-person__text");
        text.append(link);
        if (health) text.append(make("small", "nursery-table__health", health));
        const person = make("div", "ui-person");
        person.append(avatar, text);

        const phoneLink = phone ? make("a", "", phone) : document.createTextNode("—");
        if (phone) { phoneLink.href = `tel:${phone}`; phoneLink.dir = "ltr"; }
        const open = make("a", "ui-btn ui-btn--ghost nursery-table__open", "فتح الملف");
        open.href = href;

        const row = make("tr");
        row.append(cell(make("span", "", String(index + 1))), cell(person), cell(guardian || "—"), cell(age), cell(make("span", "workshop-chip", group)), cell(phoneLink), cell(open));
        row.lastChild.className = "no-print";
        row.dataset.search = `${name} ${guardian} ${phone}`;
        return row;
    });

    const table = make("table", "ui-table members-table nursery-table");
    const head = make("tr");
    ["م", "الطفل", "ولي الأمر", "السن", "الفصل", "الهاتف", "الإجراءات"].forEach((title, index) => {
        head.append(make("th", index === 6 ? "no-print" : "", title));
    });
    const thead = make("thead"), tbody = make("tbody");
    thead.append(head);
    tbody.append(...rows);
    table.append(thead, tbody);
    const wrap = make("div", "table-responsive");
    wrap.append(table);

    const bar = make("div", "nursery-table__bar no-print");
    const search = make("input", "form-control");
    search.type = "search";
    search.placeholder = "ابحث باسم الطفل أو ولي الأمر أو الهاتف";
    const count = make("small", "", `${rows.length} طفل`);
    bar.append(search, count);
    search.addEventListener("input", () => {
        const value = search.value.trim();
        let shown = 0;
        rows.forEach(row => {
            row.hidden = !!value && !row.dataset.search.includes(value);
            if (!row.hidden) shown++;
        });
        count.textContent = `${shown} طفل`;
    });
    list.replaceWith(bar, wrap);
})();

// الحضانة: زر «حفظ الملف» في نموذج طفل جديد، ثم رسالة تأكيد والرجوع إلى النموذج لتسجيل طفل آخر
(() => {
    if (location.pathname.toLowerCase().replace(/\/$/, "") !== "/nursery") return;
    const form = document.querySelector("form.nursery-child-form");
    if (!form) return;
    const key = "nursery-child-saved";
    const button = form.querySelector('button[type="submit"]');
    if (button) {
        const icon = document.createElement("i");
        icon.className = "bi bi-check2-circle";
        icon.setAttribute("aria-hidden", "true");
        button.replaceChildren(icon, " حفظ الملف");
    }
    form.addEventListener("submit", () => {
        try { sessionStorage.setItem(key, JSON.stringify({ name: form.querySelector('[name="name"]').value.trim(), at: Date.now() })); } catch { /* يبقى الحفظ كالمعتاد */ }
    });
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(key)); sessionStorage.removeItem(key); } catch { /* لا رسالة */ }
    if (!saved || Date.now() - saved.at > 60000 || !saved.name) return;
    const known = [...document.querySelectorAll('a[href^="/Nursery/Child/"]')].some(link => link.textContent.includes(saved.name));
    if (!known) return;
    const notice = document.createElement("div");
    notice.className = "nursery-saved";
    notice.setAttribute("role", "status");
    notice.textContent = `تم حفظ ملف الطفل: ${saved.name}`;
    document.body.append(notice);
    setTimeout(() => notice.remove(), 8000);
    // ورسالة ثابتة فوق نموذج الطفل الجديد تبقى حتى تبدأ الكتابة
    const inline = document.createElement("div");
    inline.className = "nursery-saved-inline";
    inline.setAttribute("role", "status");
    inline.textContent = `✓ تم الحفظ: ${saved.name}. يمكنك تسجيل طفل آخر الآن.`;
    form.before(inline);
    form.addEventListener("input", () => inline.remove(), { once: true });
    // بعد اكتمال رسم الصفحة والجدول، وإلا يرجع المتصفح لموضعه السابق
    const jump = () => setTimeout(() => {
        form.closest("#new-child")?.scrollIntoView({ block: "start" });
        form.querySelector('[name="name"]')?.focus({ preventScroll: true });
    }, 250);
    if (document.readyState === "complete") jump(); else window.addEventListener("load", jump);
})();

// ملف الخادم: إضافة مناسبة له من بطاقة «مناسباته القادمة»
(() => {
    if (location.pathname.toLowerCase() !== "/servants/profile") return;
    const memberId = Number(new URLSearchParams(location.search).get("memberId"));
    const card = document.querySelector('[aria-labelledby="spOccasionsTitle"]');
    if (!memberId || !card) return;
    const url = "/api/activity/servant-event";
    const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    };
    const fill = (select, items) => select.append(...items.map(([value, text]) => {
        const option = make("option", "", text);
        option.value = value;
        return option;
    }));
    const labelled = (text, control) => {
        const box = make("label", "fb-events__field");
        box.append(make("span", "", text), control);
        return box;
    };
    fetch(url).then(response => {
        if (!response.ok) return;
        const types = [[1, "عيد زواج"], [2, "معمودية"], [3, "الميرون"], [4, "أول اعتراف"], [5, "أول تناول"], [6, "سيامة أغنسطس"], [7, "سيامة أبسالتس"], [8, "سيامة قارئ"],
            [9, "سيامة شماس"], [10, "سيامة كاهن"], [11, "سيامة قمص"], [12, "بدء الخدمة"], [14, "نياحة"], [13, "مناسبة أخرى"], [0, "عيد ميلاد"]];
        const open = make("button", "ui-btn ui-btn--ghost servant-event__open", "إضافة مناسبة");
        open.type = "button";
        card.querySelector(".sp-card__head").append(open);
        const panel = make("div", "fb-events__grid servant-event");
        panel.hidden = true;
        const type = make("select", "form-select"), date = make("input", "form-control"), recurrence = make("select", "form-select"), notes = make("input", "form-control");
        fill(type, types);
        fill(recurrence, [["1", "سنوي"], ["0", "لا يتكرر"], ["2", "شهري"], ["3", "أسبوعي"]]);
        date.type = "date";
        notes.placeholder = "اختياري";
        const save = make("button", "ui-btn", "حفظ المناسبة");
        save.type = "button";
        const status = make("small", "servant-event__status");
        panel.append(labelled("نوع المناسبة", type), labelled("التاريخ", date), labelled("التكرار", recurrence), labelled("ملاحظات", notes), save, status);
        card.querySelector(".sp-card__head").after(panel);
        open.addEventListener("click", () => { panel.hidden = !panel.hidden; });
        save.addEventListener("click", async () => {
            if (!date.value) { date.focus(); return; }
            const name = (document.querySelector("h1")?.textContent || "").trim();
            const kind = type.selectedOptions[0].textContent;
            save.disabled = true;
            status.textContent = "";
            try {
                const result = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-Servant-Event": "1" },
                    body: JSON.stringify({ memberId, type: Number(type.value), title: `${kind} — ${name}`, date: date.value, recurrence: Number(recurrence.value), notes: notes.value })
                });
                if (result.ok) { location.reload(); return; }
                status.textContent = "تعذر حفظ المناسبة، راجع البيانات وحاول مرة أخرى.";
            } catch { status.textContent = "تعذر الاتصال، حاول مرة أخرى."; }
            save.disabled = false;
        });
    }).catch(() => { /* الزر إضافي */ });
})();

// سجل الخدام: زر «المناسبات» بجوار «عرض الكل» يفتح مناسبات الخدام
(() => {
    const all = document.querySelector(".servants-title__all");
    if (!all) return;
    const link = document.createElement("a");
    link.className = "ui-btn ui-btn--ghost no-print";
    link.href = "/MemberEvents?servants=true&period=upcoming";
    link.title = "مناسبات الخدام القادمة";
    const icon = document.createElement("i");
    icon.className = "bi bi-calendar-heart";
    icon.setAttribute("aria-hidden", "true");
    link.append(icon, " المناسبات");
    all.before(link);
})();

// سجل الخدام: عدد مناسبات الخدام القادمة على زر «المناسبات»، من تبويبات صفحة المناسبات نفسها
(() => {
    const link = document.querySelector('a[href^="/MemberEvents?servants=true&period=upcoming"]');
    if (!link) return;
    fetch(link.href)
        .then(response => response.ok ? response.text() : "")
        .then(html => {
            const tab = new DOMParser().parseFromString(html, "text/html").querySelector('a[href*="period=upcoming"][href*="servants=true"]');
            const count = tab?.textContent.match(/\d+/)?.[0];
            if (!count) return;
            const badge = document.createElement("span");
            badge.className = "servants-events__count";
            badge.textContent = count;
            link.append(" ", badge);
            link.title = `${count} مناسبة قادمة للخدام`;
        })
        .catch(() => { /* الزر يعمل بدون العدد */ });
})();

// الصيدلية: «حسابات الصيدلية» لكل أسر الكنيسة، منفصلة عن علاج إخوة الرب. بحث في الأسر، روشتة، وحساب كل صيدلية في الشهر
(() => {
    if (location.pathname.toLowerCase().replace(/\/$/, "") !== "/pharmacy") return;
    const page = document.querySelector(".ui-page");
    const anchor = document.querySelector(".fin-nav") || page?.querySelector("header");
    if (!page || !anchor) return;
    const api = "/api/activity/pharmacy-accounts";
    const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const field = (label, control) => {
        const box = make("label", "pha-field");
        box.append(make("span", "", label), control);
        return box;
    };
    const money = value => Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });
    const toast = text => {
        const notice = make("div", "nursery-saved", text);
        notice.setAttribute("role", "status");
        document.body.append(notice);
        setTimeout(() => notice.remove(), 5000);
    };
    const send = (path, method, body) => fetch(`${api}${path}`, {
        method, headers: { "Content-Type": "application/json", "X-Pharmacy-Account": "1" }, body: body ? JSON.stringify(body) : undefined
    });

    fetch(api).then(response => {
        if (!response.ok) return;
        const today = new Date();
        let year = today.getFullYear(), month = today.getMonth() + 1, families = [], chosen = null;

        const section = make("section", "ui-card pha");
        const head = make("div", "pha__head");
        const title = make("h2", "pha__title", "حسابات الصيدلية — كل أسر الكنيسة");
        const note = make("small", "pha__note", "منفصلة عن علاج إخوة الرب، ولا تُفتح بها ملفات هناك.");
        const nav = make("div", "pha__month");
        const prev = make("button", "ui-btn ui-btn--ghost", "‹ السابق"), next = make("button", "ui-btn ui-btn--ghost", "التالي ›"), label = make("strong");
        prev.type = next.type = "button";
        nav.append(prev, label, next);
        head.append(title, note, nav);

        const strip = make("div", "pha__strip");
        const form = make("form", "pha__form");
        const search = make("input", "form-control");
        search.type = "search";
        search.autocomplete = "off";
        search.placeholder = "ابحث باسم الأسرة أو كودها";
        const list = make("ul", "med-family__list");
        list.hidden = true;
        const familyBox = make("div", "med-family");
        familyBox.append(search, list);
        const member = make("select", "form-select");
        const patient = make("input", "form-control");
        patient.placeholder = "إن لم يكن من أفراد الأسرة";
        const date = make("input", "form-control");
        date.type = "date";
        date.value = today.toISOString().slice(0, 10);
        const pharmacy = make("input", "form-control");
        pharmacy.setAttribute("list", "phaPharmacies");
        pharmacy.placeholder = "اسم الصيدلية";
        const pharmacies = make("datalist");
        pharmacies.id = "phaPharmacies";
        const invoice = make("input", "form-control");
        invoice.placeholder = "اختياري";
        const items = make("input", "form-control");
        items.placeholder = "الأدوية (اختياري)";
        const amount = make("input", "form-control");
        amount.type = "number";
        amount.min = "0";
        amount.step = "0.01";
        const save = make("button", "ui-btn", "حفظ الروشتة");
        save.type = "submit";
        const status = make("small", "med-family__status");
        const patientField = field("اسم المريض", patient);
        const memberField = field("لمن الروشتة؟", member);
        form.append(field("الأسرة أو الاسم", familyBox), memberField, patientField, field("التاريخ", date), field("الصيدلية", pharmacy),
            field("رقم الفاتورة", invoice), field("الأدوية", items), field("المبلغ", amount), save, status, pharmacies);

        const tableWrap = make("div", "table-responsive");
        section.append(head, strip, form, tableWrap);
        anchor.after(section);

        const resetMembers = () => {
            member.replaceChildren(new Option("الأسرة كلها", ""));
            memberField.hidden = false;
            patientField.hidden = false;
        };
        // اسم غير مسجل في البرنامج: الروشتة باسمه فقط، بلا أسرة ولا أفراد
        const chooseOutsider = name => {
            chosen = { outsider: true, name };
            search.value = name;
            list.hidden = true;
            status.textContent = "";
            resetMembers();
            memberField.hidden = patientField.hidden = true;
            pharmacy.focus();
        };
        resetMembers();
        member.addEventListener("change", () => { patientField.hidden = member.value !== ""; });

        const choose = async item => {
            chosen = item;
            search.value = item.name;
            list.hidden = true;
            status.textContent = "";
            resetMembers();
            try {
                const people = await (await fetch(`${api}/members?familyId=${item.familyId}`)).json();
                people.forEach(person => member.append(new Option(person.name, person.id)));
            } catch { /* يُكتب اسم المريض يدويًا */ }
            pharmacy.focus();
        };
        const draw = () => {
            const text = search.value.trim();
            chosen = chosen && chosen.name === text ? chosen : null;
            const found = families.filter(item => !text || item.name.includes(text) || (item.code || "").includes(text)).slice(0, 30);
            list.replaceChildren(...found.map(item => {
                const row = make("li");
                const button = make("button", "", item.name);
                button.type = "button";
                if (item.code) button.append(make("small", "", item.code));
                button.addEventListener("click", () => choose(item));
                row.append(button);
                return row;
            }));
            if (!found.length) list.append(make("li", "med-family__empty", "لا توجد أسرة بهذا الاسم."));
            if (text) {
                const row = make("li");
                const button = make("button", "med-family__outsider");
                button.type = "button";
                button.append(make("span", "", `＋ «${text}»`), make("small", "", "اسم غير مسجل بالبرنامج"));
                button.addEventListener("click", () => chooseOutsider(text));
                row.append(button);
                list.append(row);
            }
            list.hidden = false;
        };
        search.addEventListener("input", draw);
        search.addEventListener("focus", draw);
        document.addEventListener("click", event => { if (!familyBox.contains(event.target)) list.hidden = true; });

        const load = async () => {
            label.textContent = new Date(year, month - 1, 1).toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
            const data = await (await fetch(`${api}?year=${year}&month=${month}`)).json();
            pharmacies.replaceChildren(...data.pharmacies.map(name => new Option(name)));
            const total = data.entries.reduce((sum, entry) => sum + entry.amount, 0);
            const paid = data.entries.filter(entry => entry.paid).reduce((sum, entry) => sum + entry.amount, 0);
            strip.replaceChildren(...[["روشتات الشهر", data.entries.length], ["علاج الشهر", money(total)], ["سُدِّد للصيدليات", money(paid)],
                ["لم يُسدَّد من الشهر", money(total - paid)], ["المتأخر من كل الشهور", money(data.unpaidAll)]].map(([name, value]) => {
                const card = make("div", "pha__stat");
                card.append(make("small", "", name), make("b", "", String(value)));
                return card;
            }));
            if (!data.entries.length) { tableWrap.replaceChildren(make("p", "pha__empty", "لا توجد روشتات مسجلة في هذا الشهر.")); return; }
            const table = make("table", "ui-table pha__table");
            const header = make("tr");
            ["التاريخ", "الأسرة", "المريض", "الصيدلية", "الفاتورة", "الأدوية", "المبلغ", "سُدِّد", ""].forEach(name => header.append(make("th", "", name)));
            const thead = make("thead"), tbody = make("tbody");
            thead.append(header);
            data.entries.forEach(entry => {
                const row = make("tr");
                const paidBox = make("input", "form-check-input");
                paidBox.type = "checkbox";
                paidBox.checked = entry.paid;
                paidBox.title = "سُدِّد للصيدلية";
                paidBox.addEventListener("change", async () => {
                    const result = await send("/pay", "POST", { id: entry.id, paid: paidBox.checked });
                    if (result.ok) load(); else paidBox.checked = !paidBox.checked;
                });
                const remove = make("button", "pha__remove", "حذف");
                remove.type = "button";
                remove.addEventListener("click", async () => {
                    if (!confirm(`حذف روشتة ${entry.family} بمبلغ ${money(entry.amount)}؟`)) return;
                    if ((await send(`/${entry.id}`, "DELETE")).ok) { toast("✓ تم الحذف"); load(); }
                });
                const cells = [entry.date, `${entry.family}${entry.code ? ` · ${entry.code}` : ""}`, entry.patient, entry.pharmacy || "—", entry.invoice || "—", entry.items || "—", money(entry.amount)];
                cells.forEach(text => row.append(make("td", "", text)));
                const paidCell = make("td"), removeCell = make("td", "no-print");
                paidCell.append(paidBox);
                removeCell.append(remove);
                row.append(paidCell, removeCell);
                tbody.append(row);
            });
            table.append(thead, tbody);
            tableWrap.replaceChildren(table);
        };
        prev.addEventListener("click", () => { month--; if (month < 1) { month = 12; year--; } load(); });
        next.addEventListener("click", () => { month++; if (month > 12) { month = 1; year++; } load(); });

        form.addEventListener("submit", async event => {
            event.preventDefault();
            status.textContent = "";
            // لم تُختر أسرة: الاسم المكتوب في البحث أو في «اسم المريض» يُسجَّل اسمًا غير مسجل بالبرنامج
            if (!chosen) {
                const typed = search.value.trim() || patient.value.trim();
                if (!typed) { status.textContent = "اختر الأسرة من نتائج البحث، أو اكتب اسم المريض إن لم يكن مسجلًا بالبرنامج."; search.focus(); return; }
                chosen = { outsider: true, name: typed };
            }
            if (!(Number(amount.value) > 0)) { status.textContent = "اكتب مبلغ الروشتة."; amount.focus(); return; }
            save.disabled = true;
            const result = await send("", "POST", {
                familyId: chosen.outsider ? 0 : chosen.familyId, memberId: !chosen.outsider && member.value ? Number(member.value) : null,
                patientName: chosen.outsider ? chosen.name : patient.value,
                date: date.value, pharmacy: pharmacy.value, invoiceNumber: invoice.value, items: items.value, amount: Number(amount.value)
            }).catch(() => null);
            save.disabled = false;
            if (!result?.ok) { status.textContent = "تعذر حفظ الروشتة، راجع البيانات."; return; }
            toast("✓ تم حفظ الروشتة");
            amount.value = invoice.value = items.value = patient.value = "";
            // الاسم غير المسجل لا يبقى للروشتة التالية
            if (chosen?.outsider) { chosen = null; search.value = ""; resetMembers(); }
            const saved = new Date(date.value);
            year = saved.getFullYear();
            month = saved.getMonth() + 1;
            load();
        });

        fetch("/api/activity/pharmacy-families").then(answer => answer.ok ? answer.json() : []).then(all => {
            families = all.filter(item => item.familyId);
            search.placeholder = `ابحث في ${families.length} أسرة بالاسم أو الكود، أو اكتب اسمًا غير مسجل`;
            // الدخول من زر «صيدلية» في ملف الأسرة: الأسرة مختارة
            const wanted = Number(new URLSearchParams(location.search).get("familyId"));
            const preset = families.find(item => item.familyId === wanted);
            if (preset) choose(preset);
        });
        load();
    }).catch(() => { /* القسم يظهر لمن له صلاحية الصيدلية فقط */ });
})();

// رسالة «تم الحفظ» بعد أي حفظ أو تعديل أو حذف من نموذج في البرنامج
(() => {
    const key = "form-saved";
    document.addEventListener("submit", event => {
        const form = event.target;
        if (event.defaultPrevented || !(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "post" || form.target === "_blank") return;
        const action = (form.getAttribute("action") || location.pathname).toLowerCase();
        if (action.includes("/account/")) return;
        try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), removed: /delete|remove/.test(action) })); } catch { /* بدون رسالة */ }
    });
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(key)); } catch { /* لا شيء */ }
    const forget = () => { try { sessionStorage.removeItem(key); } catch { /* لا شيء */ } };
    if (!saved || Date.now() - saved.at > 60000 || document.querySelector(".nursery-saved")) { forget(); return; }
    // رجوع الصفحة بأخطاء يعني أن الحفظ لم يتم
    if (document.querySelector(".validation-summary-errors, .field-validation-error, .input-validation-error, .fb-errors, .ui-flash--danger")) { forget(); return; }
    // بعض الصفحات تعيد تحميل نفسها بعد الحفظ: تبقى العلامة حتى تستقر الصفحة
    setTimeout(forget, 1500);
    const notice = document.createElement("div");
    notice.className = "nursery-saved";
    notice.setAttribute("role", "status");
    notice.textContent = saved.removed ? "✓ تم الحذف" : "✓ تم الحفظ";
    document.body.append(notice);
    setTimeout(() => notice.remove(), 5000);
})();

// تصدير أي صفحة: زر في رأس الصفحة فيه «Excel» (كل جداول الصفحة الظاهرة في ملف واحد) و«طباعة / PDF».
// يُضاف تلقائيًا لكل صفحة داخل البرنامج؛ ولا يُكرَّر Excel في صفحة لها زر تصدير خاص بها.
(() => {
    if (document.body.classList.contains("portal-body") || document.body.classList.contains("no-export") || location.pathname.toLowerCase().startsWith("/account")) return;
    const page = document.querySelector("main .ui-page, main .container-fluid, main");
    const header = page?.querySelector(".ui-page-header") || page?.querySelector("h1")?.parentElement;
    if (!page || !header || header.querySelector(".page-export")) return;

    const visibleTables = () => [...page.querySelectorAll("table")].filter(table => table.offsetParent !== null && !table.closest(".no-print, .modal, [hidden]") && table.rows.length > 0);
    const hasOwnExcel = [...page.querySelectorAll("a, button")].some(item => /excel/i.test(item.textContent) && !item.closest(".page-export"));
    const title = (document.querySelector("h1")?.textContent || document.title || "صفحة").trim().replace(/\s+/g, " ");

    const box = document.createElement("div");
    box.className = "page-export no-print";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ui-btn ui-btn--ghost page-export__toggle";
    toggle.innerHTML = '<i class="bi bi-box-arrow-up" aria-hidden="true"></i> تصدير';
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "page-export__menu";
    menu.hidden = true;
    const item = (icon, label, action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i> ${label}`;
        button.addEventListener("click", () => { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); action(); });
        menu.append(button);
        return button;
    };

    // Excel: ملف CSV بترميز UTF-8 يفتحه Excel بالعربي؛ كل جدول بعنوانه، وتُحذف أعمدة الأزرار (no-print)
    const cellText = cell => {
        const copy = cell.cloneNode(true);
        copy.querySelectorAll(".no-print, button, .visually-hidden, script").forEach(node => node.remove());
        copy.querySelectorAll("input, select, textarea").forEach(control => {
            const value = control.type === "checkbox" ? (control.checked ? "✓" : "") : control.tagName === "SELECT" ? (control.selectedOptions[0]?.textContent || "") : control.value;
            control.replaceWith(document.createTextNode(value));
        });
        return copy.textContent.replace(/\s+/g, " ").trim();
    };
    const csv = value => /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const exportExcel = () => {
        const tables = visibleTables();
        if (!tables.length) return;
        const lines = [csv(title), csv("تاريخ التصدير: " + new Date().toLocaleDateString("ar-EG")), ""];
        tables.forEach((table, index) => {
            const section = table.closest("section, .ui-card, .ui-section");
            const heading = table.caption?.textContent || section?.querySelector("h2, h3")?.textContent;
            if (tables.length > 1 && heading) lines.push(csv(heading.replace(/\s+/g, " ").trim()));
            [...table.rows].forEach(row => {
                if (row.offsetParent === null || row.classList.contains("no-print")) return;
                const cells = [...row.cells].filter(cell => !cell.classList.contains("no-print"));
                const values = [];
                cells.forEach(cell => { values.push(csv(cellText(cell))); for (let span = 1; span < (cell.colSpan || 1); span++) values.push(""); });
                if (values.some(Boolean)) lines.push(values.join(","));
            });
            if (index < tables.length - 1) lines.push("");
        });
        const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80)} ${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.append(link);
        link.click();
        setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
    };

    const excel = hasOwnExcel ? null : item("bi-file-earmark-excel", "Excel (جداول الصفحة)", exportExcel);
    item("bi-printer", "طباعة / حفظ PDF", () => window.print());
    const sync = () => { if (excel) excel.hidden = visibleTables().length === 0; };

    toggle.addEventListener("click", () => {
        sync();
        menu.hidden = !menu.hidden;
        toggle.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", event => { if (!box.contains(event.target)) { menu.hidden = true; toggle.setAttribute("aria-expanded", "false"); } });
    box.append(toggle, menu);
    (header.querySelector(".ui-page-header__actions, .fin-actions") || header).append(box);
})();
