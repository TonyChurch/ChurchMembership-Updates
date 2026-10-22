// صفحة «إضافة أسرة»: بطاقات الأفراد، لوحة الفرد المختار، الاكتمال، والأسر المشابهة
(() => {
    const form = document.getElementById("familyBuilder");
    if (!form) return;

    const people = form.querySelector("[data-people]");
    const addBox = people.querySelector(".fb-people__add");
    const editor = form.querySelector("[data-editor]");
    const checklist = form.querySelector("[data-checklist]");
    const familyPhone = form.querySelector('[name="PrimaryPhone"]');
    // وضع «إضافة أفراد لأسرة موجودة»: لا بيت أسرة ولا فحص تكرار
    const addMode = form.dataset.mode === "add";
    let counter = 1000;
    let dirty = false;

    const panes = () => [...editor.querySelectorAll("[data-pane]")];
    const field = (pane, name) => pane.querySelector(`[name$="].${name}"]`);
    const val = (pane, name) => (field(pane, name)?.value || "").trim();
    const words = text => text.split(/\s+/).filter(Boolean);
    const bySlot = slot => panes().find(pane => pane.dataset.slot === slot);
    const isParent = pane => pane.dataset.slot === "father" || pane.dataset.slot === "mother";
    const isMobile = value => /^01[0125]\d{8}$/.test(value);

    // الرقم القومي: القرن + تاريخ الميلاد + النوع (الرقم 13 فردي = ذكر)
    const readNid = nid => {
        if (!/^[23]\d{13}$/.test(nid)) return null;
        const year = (nid[0] === "2" ? 1900 : 2000) + Number(nid.slice(1, 3));
        const month = Number(nid.slice(3, 5)), day = Number(nid.slice(5, 7));
        const birth = new Date(year, month - 1, day);
        if (birth.getMonth() !== month - 1 || birth > new Date()) return null;
        const today = new Date();
        let age = today.getFullYear() - year;
        if (today < new Date(today.getFullYear(), month - 1, day)) age--;
        return { birth, age, female: Number(nid[12]) % 2 === 0 };
    };

    const ageText = age => age < 1 ? "أقل من سنة" : age === 1 ? "سنة" : age === 2 ? "سنتان" : age <= 10 ? `${age} سنوات` : `${age} سنة`;

    const roleOf = pane => {
        const info = readNid(val(pane, "NationalId"));
        switch (pane.dataset.slot) {
            case "father": return isDeceased(pane) ? "الأب (متوفى)" : "الأب";
            case "mother": return isDeceased(pane) ? "الأم (متوفاة)" : "الأم";
            case "relative": return "قريب";
            default: return info ? (info.female ? "ابنة" : "ابن") : "ابن / ابنة";
        }
    };

    const tintOf = pane => {
        if (pane.dataset.slot === "father") return "blue";
        if (pane.dataset.slot === "mother") return "pink";
        if (pane.dataset.slot === "relative") return "gold";
        return readNid(val(pane, "NationalId"))?.female ? "violet" : "green";
    };

    const isDeceased = pane => !!pane.querySelector("[data-deceased]")?.checked;

    const isEmpty = pane => !val(pane, "FullName") && !val(pane, "NationalId") && !val(pane, "Phone");

    // ما ينقص الفرد من البيانات الأساسية (المتوفى يكفيه الاسم، والرقم القومي إن كُتب يجب أن يكون صحيحًا)
    const missing = pane => {
        const list = [];
        const nid = val(pane, "NationalId");
        if (words(val(pane, "FullName")).length < 3) list.push("الاسم ثلاثيًا");
        if ((!isDeceased(pane) || nid) && !readNid(nid)) list.push("الرقم القومي");
        // الموبايل مطلوب للأب فقط؛ للأم اختياري، وإن كُتب يجب أن يكون صحيحًا
        const phone = val(pane, "Phone");
        if (pane.dataset.slot === "father" && !isDeceased(pane) && !isMobile(phone)) list.push("الموبايل");
        else if (phone && !isMobile(phone)) list.push("الموبايل");
        if (pane.querySelector("[data-mother-kind]")?.value === "previous" && !val(pane, "PreviousMotherName")) list.push("اسم والدته");
        return list;
    };

    // ---------- بطاقات الأفراد ----------
    const renderCard = pane => {
        if (!pane.card) {
            pane.card = document.createElement("button");
            pane.card.type = "button";
            pane.card.addEventListener("click", () => select(pane));
        }
        const card = pane.card;
        const name = val(pane, "FullName");
        const info = readNid(val(pane, "NationalId"));
        const phone = val(pane, "Phone");
        const empty = isEmpty(pane);
        const done = !empty && missing(pane).length === 0;
        const photo = pane.querySelector("[data-photo-preview] img")?.src;

        card.className = `fb-person fb-person--${tintOf(pane)}`;
        card.classList.toggle("is-active", pane === active);
        card.classList.toggle("is-empty", empty);
        card.classList.toggle("is-done", done);
        card.classList.toggle("is-deceased", isDeceased(pane));
        card.classList.toggle("has-error", pane.classList.contains("has-error"));

        const avatar = photo
            ? `<img src="${photo}" alt="">`
            : empty ? `<i class="bi bi-person-plus" aria-hidden="true"></i>` : (name[0] || "؟");
        const meta = [info ? `${info.female ? "أنثى" : "ذكر"} · ${ageText(info.age)}` : null, phone || null].filter(Boolean).join(" · ");
        card.innerHTML = `
            <span class="fb-person__avatar">${avatar}</span>
            <span class="fb-person__text">
                <small>${roleOf(pane)}</small>
                <strong></strong>
                <em>${meta || (empty ? (isParent(pane) ? "اضغط للإدخال — أو اتركه فارغًا" : "اضغط للإدخال") : "أكمل البيانات")}</em>
            </span>
            <i class="bi ${done ? "bi-check-circle-fill" : "bi-circle"} fb-person__state" aria-hidden="true"></i>`;
        card.querySelector("strong").textContent = name ? words(name).slice(0, 2).join(" ") : (isParent(pane) ? "لم يُسجل" : "فرد جديد");

        // عنوان اللوحة وسطر البيانات المستخرجة من الرقم القومي
        pane.querySelector("[data-pane-title]").textContent = name || roleOf(pane);
        pane.querySelector("[data-derived-line]").textContent = info
            ? `${roleOf(pane)} · ${info.female ? "أنثى" : "ذكر"} · ${ageText(info.age)} · مواليد ${info.birth.toLocaleDateString("en-GB")}`
            : `${roleOf(pane)} — الرقم القومي يملأ النوع والسن تلقائيًا`;
        pane.dataset.tint = tintOf(pane);
    };

    let active = null;
    const renderCards = () => {
        panes().forEach(pane => {
            renderCard(pane);
            people.insertBefore(pane.card, addBox);
        });
    };

    const select = pane => {
        active = pane;
        panes().forEach(item => {
            item.hidden = item !== pane;
            item.card?.classList.toggle("is-active", item === pane);
        });
    };

    // ---------- الاكتمال ----------
    const update = () => {
        panes().forEach(renderCard);
        const father = bySlot("father"), mother = bySlot("mother");
        const parentPhone = [father, mother].map(pane => pane && val(pane, "Phone")).find(isMobile);
        if (familyPhone) familyPhone.placeholder = parentPhone ? `تلقائي: ${parentPhone}` : "رقم الأب تلقائيًا";

        const items = addMode
            ? [{ label: "فرد جديد واحد على الأقل", ok: panes().some(pane => !isEmpty(pane)) }]
            : [{ label: "الأب أو الأم", ok: [father, mother].some(pane => pane && !isEmpty(pane)) }];
        panes().filter(pane => !isEmpty(pane)).forEach(pane => {
            const need = missing(pane);
            items.push({ label: `${roleOf(pane)}: ${words(val(pane, "FullName")).slice(0, 2).join(" ") || "بدون اسم"}`, ok: need.length === 0, hint: need.join("، "), pane });
        });
        if (!addMode) {
            items.push({ label: "هاتف الأسرة", ok: isMobile((familyPhone?.value || "").trim()) || !!parentPhone });
            items.push({ label: "المنطقة أو العنوان", ok: !!form.querySelector("[data-area]").value || !!form.querySelector("[data-address]").value.trim() });
        }
        // زر إضافة الأب/الأم يختفي بعد إضافته
        form.querySelectorAll('[data-add="father"], [data-add="mother"]').forEach(button => button.hidden = !!bySlot(button.dataset.add));

        const percent = Math.round(items.filter(item => item.ok).length * 100 / items.length);
        form.querySelector("[data-progress-bar]").style.width = `${percent}%`;
        form.querySelector("[data-progress-text]").textContent = `${percent}%`;
        form.querySelector(".fb-progress").classList.toggle("is-complete", percent === 100);

        checklist.innerHTML = "";
        items.forEach(item => {
            const li = document.createElement("li");
            li.className = item.ok ? "is-ok" : "";
            li.innerHTML = `<i class="bi ${item.ok ? "bi-check-circle-fill" : "bi-circle"}" aria-hidden="true"></i><span></span>`;
            li.querySelector("span").textContent = item.ok || !item.hint ? item.label : `${item.label} — ينقص: ${item.hint}`;
            if (item.pane) {
                li.classList.add("is-link");
                li.addEventListener("click", () => select(item.pane));
            }
            checklist.appendChild(li);
        });
    };

    // ---------- الأسر المشابهة ----------
    let duplicateTimer;
    const checkDuplicates = () => {
        if (addMode) return;
        clearTimeout(duplicateTimer);
        duplicateTimer = setTimeout(async () => {
            const father = bySlot("father"), mother = bySlot("mother");
            const name = (father && val(father, "FullName")) || (mother && val(mother, "FullName")) || "";
            const phone = (familyPhone?.value || "").trim() || [father, mother].map(pane => pane && val(pane, "Phone")).find(isMobile) || "";
            const box = form.querySelector("[data-duplicates]");
            if (words(name).length < 3 && !isMobile(phone)) { box.hidden = true; return; }
            try {
                const response = await fetch(`/Families/DuplicateCandidates?${new URLSearchParams({ name, phone })}`, { headers: { Accept: "application/json" } });
                if (!response.ok) return;
                const list = await response.json();
                const target = form.querySelector("[data-duplicate-list]");
                target.innerHTML = "";
                list.forEach(item => {
                    const li = document.createElement("li");
                    const link = document.createElement("a");
                    link.href = item.url;
                    link.target = "_blank";
                    link.innerHTML = `<strong></strong><small></small>`;
                    link.querySelector("strong").textContent = item.name;
                    link.querySelector("small").textContent = [item.code, item.area, item.phone].filter(Boolean).join(" · ");
                    li.appendChild(link);
                    target.appendChild(li);
                });
                box.hidden = list.length === 0;
            } catch { /* التنبيه اختياري */ }
        }, 400);
    };

    // ---------- تجهيز لوحة فرد ----------
    const filterClasses = (stageSelect, classSelect) => {
        if (!classSelect) return;
        const stage = stageSelect.value;
        [...classSelect.options].forEach(option => {
            if (!option.value) return;
            option.hidden = option.disabled = option.dataset.stageId !== stage;
        });
        if (classSelect.selectedOptions[0]?.disabled) classSelect.value = "";
        classSelect.options[0].textContent = stage ? (classSelect.options.length > 1 ? "اختر الفصل" : "—") : "اختر المرحلة أولًا";
    };

    // خادم المتابعة: كل خدام المرحلة المختارة بفصولهم (للتأكد من إدراجهم)، ثم خدام الفصل فقط بعد اختياره
    const filterServants = (stageSelect, classSelect, servantSelect) => {
        if (!servantSelect) return;
        const stage = stageSelect.value, cls = classSelect?.value || "";
        let count = 0;
        [...servantSelect.options].forEach(option => {
            if (!option.value) return;
            const visible = !!stage && option.dataset.stageId === stage &&
                (!cls || option.dataset.classId === cls || !option.dataset.classId);
            option.hidden = option.disabled = !visible;
            option.textContent = cls ? option.dataset.name : `${option.dataset.name} · ${option.dataset.className}`;
            if (visible) count++;
        });
        if (servantSelect.selectedOptions[0]?.disabled) servantSelect.value = "";
        servantSelect.options[0].textContent = !stage
            ? "تلقائي — اختر المرحلة لعرض خدامها"
            : count
                ? `تلقائي: خادم الفصل الأقل متابعة (${count} ${cls ? "في الفصل" : "في المرحلة"})`
                : `⚠ لا يوجد خدام مدرجون في ${cls ? "هذا الفصل" : "هذه المرحلة"}`;
    };

    const toggle = (pane, checkbox, selector) => {
        pane.querySelectorAll(selector).forEach(element => element.hidden = !checkbox.checked);
    };

    // ---------- ملف موجود بلا أسرة (مسجل سريعًا) يطابق الاسم المكتوب: يُضم بدل تكرار الشخص ----------
    const setupMatch = pane => {
        const box = pane.querySelector("[data-match]");
        const nameInput = field(pane, "FullName");
        const idInput = pane.querySelector("[data-existing-id]");
        const nameHidden = pane.querySelector("[data-existing-name]");
        if (!box || !nameInput || !idInput) return;
        let timer;

        // فحص الرقم القومي والموبايل الفوري يستثني الملف المضموم نفسه
        const setOwner = id => pane.querySelectorAll("[data-member-id]").forEach(input => input.dataset.memberId = id || "0");
        const line = (title, detail, buttonText, onClick) => {
            const item = document.createElement("div");
            item.className = "fb-match__item";
            item.innerHTML = "<strong></strong><small></small><button type=\"button\"></button>";
            item.querySelector("strong").textContent = title;
            item.querySelector("small").textContent = detail;
            const button = item.querySelector("button");
            button.textContent = buttonText;
            button.addEventListener("click", onClick);
            return item;
        };
        const heading = text => {
            const title = document.createElement("span");
            title.className = "fb-match__title";
            title.textContent = text;
            return title;
        };

        const showAttached = () => {
            box.classList.add("fb-match--attached");
            box.replaceChildren(
                heading("سيُضم الملف الموجود بدل إنشاء فرد جديد"),
                line(nameHidden.value, "يبقى حضوره وخدمته وكوده كما هي، وتُستكمل بياناته من هذه الصفحة.", "إلغاء الضم", () => {
                    idInput.value = "";
                    nameHidden.value = "";
                    setOwner("");
                    lookup();
                }));
            box.hidden = false;
        };

        const lookup = async () => {
            if (idInput.value) return;
            box.classList.remove("fb-match--attached");
            const name = nameInput.value.trim();
            // الاسم أو الرقم القومي أو الموبايل: أيها يطابق ملفًا مسجلًا بلا أسرة يُقترح ضمه
            const nationalId = (field(pane, "NationalId")?.value || "").trim();
            const phone = (field(pane, "Phone")?.value || "").trim();
            if (words(name).length < 2 && nationalId.length < 14 && phone.length < 11) { box.hidden = true; return; }
            try {
                const response = await fetch(`/Validation/Unattached?${new URLSearchParams({ name, nationalId, phone })}`, { headers: { Accept: "application/json" } });
                if (!response.ok || idInput.value || nameInput.value.trim() !== name) return;
                // ملف مضموم لفرد آخر في نفس الصفحة لا يُعرض مرة ثانية
                const taken = panes().map(other => other.querySelector("[data-existing-id]")?.value).filter(Boolean);
                const list = (await response.json()).filter(item => !taken.includes(String(item.id)));
                if (list.length === 0) { box.hidden = true; return; }
                box.replaceChildren(heading("مسجل من قبل بلا أسرة — هل هو نفس الشخص؟"), ...list.map(item =>
                    line(item.name, [item.place, item.servant ? "خادم" : null, item.phone, item.birthDate, item.code].filter(Boolean).join(" · "), "ضمّه لهذه الأسرة", () => {
                        idInput.value = item.id;
                        nameHidden.value = item.name;
                        setOwner(String(item.id));
                        const phone = field(pane, "Phone");
                        if (phone && !phone.value && item.phone) phone.value = item.phone;
                        // يبقى في فصله الحالي: المرحلة والفصل يُملآن من ملفه، ولا يغيّرهما الرقم القومي تلقائيًا
                        const stage = field(pane, "ServiceStageId"), classSelect = field(pane, "ServiceClassId");
                        if (stage && item.stageId) {
                            stage.value = String(item.stageId);
                            delete stage.dataset.auto;
                            stage.dataset.manual = "1";
                            stage.dispatchEvent(new Event("change", { bubbles: true }));
                            if (classSelect) {
                                classSelect.value = item.classId ? String(item.classId) : "";
                                classSelect.dispatchEvent(new Event("change", { bubbles: true }));
                            }
                            // وخادم متابعته كما هو
                            const servant = field(pane, "ServantName");
                            if (servant && item.servantName && [...servant.options].some(option => option.value === item.servantName && !option.disabled))
                                servant.value = item.servantName;
                        }
                        showAttached();
                        dirty = true;
                        update();
                    })));
                box.hidden = false;
            } catch { /* الاقتراح اختياري */ }
        };

        const schedule = () => { clearTimeout(timer); timer = setTimeout(lookup, 450); };
        nameInput.addEventListener("input", schedule);
        nameInput.addEventListener("change", schedule);
        field(pane, "NationalId")?.addEventListener("change", schedule);
        field(pane, "Phone")?.addEventListener("change", schedule);
        if (idInput.value) { setOwner(idInput.value); showAttached(); }
    };

    const setupPane = pane => {
        setupMatch(pane);
        pane.querySelectorAll("[data-tab]").forEach(tab => tab.addEventListener("click", () => {
            pane.querySelectorAll("[data-tab]").forEach(item => item.classList.toggle("is-active", item === tab));
            pane.querySelectorAll("[data-panel]").forEach(panel => panel.hidden = panel.dataset.panel !== tab.dataset.tab);
        }));

        pane.querySelectorAll(".fb-grid").forEach(grid => {
            const stage = grid.querySelector("[data-stage]"), classSelect = grid.querySelector("[data-class]"), servant = grid.querySelector("[data-servant]");
            if (!stage) return;
            stage.addEventListener("change", () => { filterClasses(stage, classSelect); filterServants(stage, classSelect, servant); });
            classSelect?.addEventListener("change", () => filterServants(stage, classSelect, servant));
            // اختيار خادم قبل الفصل يضبط الفصل على فصل هذا الخادم
            servant?.addEventListener("change", () => {
                const classId = servant.selectedOptions[0]?.dataset.classId;
                if (classSelect && !classSelect.value && classId) {
                    classSelect.value = classId;
                    filterServants(stage, classSelect, servant);
                }
            });
            filterClasses(stage, classSelect);
            filterServants(stage, classSelect, servant);
        });

        const confession = pane.querySelector("[data-confession]");
        const syncConfession = () => pane.querySelectorAll("[data-external]").forEach(element => element.hidden = confession.value !== "أب اعتراف آخر");
        confession.addEventListener("change", syncConfession);
        syncConfession();

        // المتوفى: لا نجمة على الرقم القومي والموبايل، ولا تبويب كنسي، والطرف الآخر يصبح «أرمل»
        const deceased = pane.querySelector("[data-deceased]");
        if (deceased) {
            const showDeceased = () => {
                pane.querySelectorAll("[data-required-mark]").forEach(mark => mark.hidden = deceased.checked);
                pane.querySelector('[data-tab="church"]').hidden = deceased.checked;
            };
            deceased.addEventListener("change", () => {
                showDeceased();
                const other = bySlot(pane.dataset.slot === "father" ? "mother" : "father");
                const marital = other?.querySelector("[data-marital]");
                if (deceased.checked && marital?.value === "متزوج") marital.value = "أرمل";
                update();
            });
            showDeceased();
        }

        // والدة الابن: «زوجة سابقة» تُظهر خانتي اسمها وحالتها
        const motherKind = pane.querySelector("[data-mother-kind]");
        if (motherKind) {
            const syncMother = () => pane.querySelectorAll("[data-previous-mother]").forEach(element => element.hidden = motherKind.value !== "previous");
            motherKind.addEventListener("change", () => { syncMother(); update(); });
            field(pane, "PreviousMotherName")?.addEventListener("input", update);
            syncMother();
        }

        const serving = pane.querySelector("[data-serving]");
        serving.addEventListener("change", () => toggle(pane, serving, "[data-serving-fields]"));
        toggle(pane, serving, "[data-serving-fields]");
        const special = pane.querySelector("[data-special]");
        special.addEventListener("change", () => toggle(pane, special, "[data-special-type]"));
        toggle(pane, special, "[data-special-type]");

        const photo = pane.querySelector("[data-photo]");
        photo.addEventListener("change", () => {
            const file = photo.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                pane.querySelector("[data-photo-preview]").innerHTML = `<img src="${reader.result}" alt="">`;
                renderCard(pane);
            };
            reader.readAsDataURL(file);
        });

        // اسم الابن: الاسم الأول يُكمل باسم الأب
        const name = field(pane, "FullName");
        if (pane.dataset.slot === "child") {
            name.addEventListener("blur", () => {
                const father = bySlot("father");
                const fatherWords = words(father ? val(father, "FullName") : form.dataset.fatherName || "");
                if (words(name.value).length === 1 && fatherWords.length >= 2) {
                    name.value = `${name.value.trim()} ${fatherWords.slice(0, 3).join(" ")}`;
                    update();
                }
            });
        }
        if (isParent(pane)) {
            name.addEventListener("blur", checkDuplicates);
            field(pane, "Phone").addEventListener("change", checkDuplicates);
        }

        pane.querySelector("[data-remove]")?.addEventListener("click", () => {
            if (!isEmpty(pane) && !confirm(`حذف ${val(pane, "FullName") || "هذا الفرد"} من الأسرة الجديدة؟`)) return;
            const list = panes();
            const next = list[list.indexOf(pane) - 1] || list[0];
            pane.card?.remove();
            pane.remove();
            if (next && next !== pane) select(next);
            update();
        });

        pane.querySelector("[data-clear]")?.addEventListener("click", () => {
            if (!isEmpty(pane) && !confirm("تفريغ كل بيانات هذا الفرد؟ (أسرة بدون أحد الوالدين)")) return;
            pane.querySelectorAll("input:not([type=hidden]):not([type=checkbox]), textarea").forEach(input => {
                input.value = "";
                input.classList.remove("is-invalid");
                input.setCustomValidity?.("");
            });
            pane.querySelectorAll(".id-check").forEach(note => note.textContent = "");
            pane.querySelectorAll("[data-existing-id], [data-existing-name]").forEach(input => input.value = "");
            pane.querySelectorAll("[data-member-id]").forEach(input => input.dataset.memberId = "0");
            const match = pane.querySelector("[data-match]");
            if (match) match.hidden = true;
            update();
        });
    };

    const addPerson = slot => {
        const template = document.getElementById(`fbPersonTemplate-${slot}`);
        const holder = document.createElement("div");
        holder.innerHTML = template.innerHTML.replaceAll("__i__", String(counter++));
        const pane = holder.firstElementChild;
        editor.appendChild(pane);
        setupPane(pane);
        window.setupIdentityFields?.(pane);
        renderCards();
        select(pane);
        update();
        field(pane, "FullName").focus();
    };

    form.querySelectorAll("[data-add]").forEach(button => button.addEventListener("click", () => addPerson(button.dataset.add)));

    // ---------- الحفظ ----------
    form.addEventListener("input", () => { dirty = true; update(); });
    form.addEventListener("change", () => { dirty = true; update(); });
    familyPhone?.addEventListener("change", checkDuplicates);

    // Enter لا يحفظ الأسرة قبل الانتهاء
    form.addEventListener("keydown", event => {
        if (event.key === "Enter" && event.target.tagName === "INPUT") event.preventDefault();
    });

    form.addEventListener("submit", () => {
        // ترقيم الأفراد تسلسليًا كما يتوقعه الخادم
        panes().forEach((pane, index) => {
            pane.querySelectorAll("[name^='People[']").forEach(input => {
                input.name = input.name.replace(/^People\[[^\]]+\]/, `People[${index}]`);
            });
        });
        dirty = false;
        form.querySelector(".fb-save").disabled = true;
    });

    window.addEventListener("beforeunload", event => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    });

    panes().forEach(setupPane);
    renderCards();
    select(panes().find(pane => pane.classList.contains("has-error")) || panes()[0]);
    update();
})();
