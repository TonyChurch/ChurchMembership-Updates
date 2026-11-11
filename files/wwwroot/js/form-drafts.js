// حماية نماذج التسجيل من فقد البيانات (لكل البرنامج):
// ١) تنبيه قبل مغادرة صفحة فيها بيانات مكتوبة لم تُحفظ.
// ٢) مسودة تلقائية على هذا الجهاز: لو خرجت قبل الحفظ ورجعت، تُستعاد البيانات لتكمل وتحفظ.
// يشمل نماذج الحفظ (POST) التي فيها خانتان أو أكثر للكتابة أو الاختيار، ولا يشمل البحث والتصفية،
// ولا أي نموذج فيه كلمة مرور، ولا ما عليه data-no-draft. المسودة تُمسح عند الحفظ أو بعد 7 أيام.
(() => {
    const PREFIX = 'cm-draft:';
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
    const storage = (() => { try { const s = window.localStorage; s.setItem('cm-draft-test', '1'); s.removeItem('cm-draft-test'); return s; } catch { return null; } })();
    const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file', 'password']);
    const dirtyForms = new Set();
    let submitting = false;

    const fieldsOf = form => [...form.elements].filter(el => el.name && !el.disabled && !SKIP_TYPES.has(el.type) && el.name !== '__RequestVerificationToken');
    const isEntryForm = form => {
        if ((form.getAttribute('method') || 'get').toLowerCase() !== 'post') return false;
        if (form.hasAttribute('data-no-draft') || form.querySelector('input[type=password]')) return false;
        const typing = fieldsOf(form).filter(el => el.type !== 'checkbox' && el.type !== 'radio');
        return typing.length >= 2;
    };

    // مفتاح المسودة: الصفحة + النموذج (رقمه بين نماذج الصفحة أو id)
    const keyOf = (form, index) => PREFIX + location.pathname + location.search + '|' + (form.getAttribute('id') || form.getAttribute('action') || index);

    const read = form => {
        const data = {};
        fieldsOf(form).forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) (data[el.name] ||= []).push(el.value); }
            else if (el.tagName === 'SELECT' && el.multiple) data[el.name] = [...el.selectedOptions].map(option => option.value);
            else data[el.name] = el.value;
        });
        return data;
    };

    const hasContent = (form, initial) => JSON.stringify(read(form)) !== initial;

    const restore = (form, data) => {
        fieldsOf(form).forEach(el => {
            if (!(el.name in data)) { if (el.type === 'checkbox' || el.type === 'radio') el.checked = false; return; }
            const value = data[el.name];
            if (el.type === 'checkbox' || el.type === 'radio') el.checked = Array.isArray(value) && value.includes(el.value);
            else if (el.tagName === 'SELECT' && el.multiple) [...el.options].forEach(option => option.selected = value.includes(option.value));
            else el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    };

    const ago = time => {
        const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
        return minutes < 60 ? `منذ ${minutes} دقيقة` : minutes < 1440 ? `منذ ${Math.round(minutes / 60)} ساعة` : `منذ ${Math.round(minutes / 1440)} يوم`;
    };

    const notice = (form, saved, key, initialData) => {
        const bar = document.createElement('div');
        bar.className = 'ui-flash form-draft-notice';
        bar.setAttribute('role', 'status');
        bar.innerHTML = '<i class="bi bi-clock-history" aria-hidden="true"></i> <span></span> <button type="button" class="ui-btn ui-btn--ghost">تجاهلها</button>';
        bar.querySelector('span').textContent = `استُعيدت بيانات كتبتها ولم تُحفظ (${ago(saved)}). راجعها ثم اضغط «حفظ».`;
        bar.querySelector('button').addEventListener('click', () => {
            try { storage?.removeItem(key); } catch { }
            restore(form, initialData);
            dirtyForms.delete(form);
            bar.remove();
        });
        form.prepend(bar);
    };

    // تنظيف المسودات القديمة
    if (storage) {
        try {
            Object.keys(storage).filter(key => key.startsWith(PREFIX)).forEach(key => {
                try { if (Date.now() - JSON.parse(storage.getItem(key)).t > MAX_AGE) storage.removeItem(key); } catch { storage.removeItem(key); }
            });
        } catch { }
    }

    document.querySelectorAll('form').forEach((form, index) => {
        if (!isEntryForm(form)) return;
        const key = keyOf(form, index);
        const initialData = read(form);
        const initial = JSON.stringify(initialData);

        // استعادة مسودة سابقة لهذه الصفحة
        if (storage) {
            try {
                const draft = JSON.parse(storage.getItem(key) || 'null');
                if (draft && draft.d && JSON.stringify(draft.d) !== initial) {
                    restore(form, draft.d);
                    notice(form, draft.t, key, initialData);
                    dirtyForms.add(form);
                }
            } catch { }
        }

        let timer = null;
        const remember = () => {
            if (submitting) return;
            if (hasContent(form, initial)) dirtyForms.add(form); else dirtyForms.delete(form);
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (!storage) return;
                try {
                    if (hasContent(form, initial)) storage.setItem(key, JSON.stringify({ t: Date.now(), d: read(form) }));
                    else storage.removeItem(key);
                } catch { }
            }, 400);
        };
        form.addEventListener('input', remember);
        form.addEventListener('change', remember);
        form.addEventListener('submit', event => {
            // إن ألغى المستخدم رسالة التأكيد (data-confirm) لا يُعَد النموذج محفوظًا
            submitting = true;
            clearTimeout(timer);
            setTimeout(() => {
                if (event.defaultPrevented) { submitting = false; return; }
                try { storage?.removeItem(key); } catch { }
                dirtyForms.delete(form);
            }, 0);
        });
    });

    // تنبيه قبل مغادرة صفحة فيها بيانات لم تُحفظ
    window.addEventListener('beforeunload', event => {
        if (!dirtyForms.size || submitting) return;
        event.preventDefault();
        event.returnValue = '';
    });
})();
