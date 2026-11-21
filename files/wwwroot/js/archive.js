// صفحات التوثيق: فحص حجم الملفات قبل الرفع، وتكبير الصورة في نافذة داخل الصفحة.
(() => {
    const maxBytes = 100 * 1024 * 1024;

    document.querySelectorAll("[data-archive-form]").forEach((form) => {
        const input = form.querySelector("[data-archive-files]");
        const error = form.querySelector("[data-archive-error]");
        const submit = form.querySelector("[data-archive-submit]");
        form.addEventListener("submit", (event) => {
            const tooBig = Array.from(input?.files ?? []).find((file) => file.size > maxBytes);
            if (tooBig) {
                event.preventDefault();
                error.textContent = `الملف «${tooBig.name}» أكبر من 100 ميجابايت.`;
                error.hidden = false;
                return;
            }
            // فحص قبل الإرسال حتى لا ينتظر المستخدم رفعًا سيُرفض، ثم منع الضغط مرتين أثناء الرفع
            if (submit) {
                submit.disabled = true;
                submit.textContent = input?.files.length ? "جارٍ الرفع... لا تغلق الصفحة" : "جارٍ الحفظ...";
            }
        });
    });

    // مكتبة النوافذ (bootstrap) تُحمَّل في آخر الصفحة بعد هذا الملف: يُنتظر اكتمال التحميل
    document.addEventListener("DOMContentLoaded", () => {
        const viewer = document.getElementById("archivePhotoModal");
        if (!viewer || !window.bootstrap) return;
        const modal = new bootstrap.Modal(viewer);
        document.querySelectorAll("[data-archive-photo]").forEach((button) => {
            button.addEventListener("click", () => {
                viewer.querySelector("[data-archive-viewer]").src = button.dataset.archivePhoto;
                viewer.querySelector("[data-archive-viewer-caption]").textContent = button.dataset.archiveCaption || "";
                modal.show();
            });
        });
    });
})();
