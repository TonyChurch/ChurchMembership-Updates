// زر «تثبيت على الموبايل»: شريط صغير أسفل الشاشة على الموبايل فقط، ولا يظهر داخل التطبيق المثبت.
// Android/Chrome: تثبيت بضغطة. iPhone وغيره: خطوات التثبيت من قائمة المتصفح.
(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => { });

    const bar = document.querySelector("[data-install-app]");
    if (!bar) return;
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const mobile = matchMedia("(pointer: coarse)").matches && innerWidth < 1000;
    const key = "install-app-dismissed";
    let dismissedUntil = 0;
    try { dismissedUntil = Number(localStorage.getItem(key) || 0); } catch { }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

    let deferred = null;
    addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferred = event;
    });
    addEventListener("appinstalled", () => { bar.hidden = true; });

    // الشريط لا يظهر إلا على الموبايل، خارج التطبيق المثبت، وبعد أسبوعين من إغلاقه
    if (!standalone && mobile && Date.now() > dismissedUntil) bar.hidden = false;
    // الزر الدائم (مثل بطاقة البوابة) يظهر على الموبايل خارج التطبيق المثبت
    document.querySelectorAll("[data-install-trigger]").forEach((item) => { item.hidden = standalone; });

    const help = bar.querySelector("[data-install-help]");
    const showHelp = () => {
        help.querySelector("[data-install-ios]").hidden = !ios;
        help.querySelector("[data-install-android]").hidden = ios;
        help.hidden = false;
    };

    document.addEventListener("click", async (event) => {
        if (event.target.closest("[data-install-close]")) {
            bar.hidden = true;
            try { localStorage.setItem(key, String(Date.now() + 14 * 24 * 3600 * 1000)); } catch { }
            return;
        }
        if (event.target.closest("[data-install-help-close]")) { help.hidden = true; return; }
        if (!event.target.closest("[data-install-button], [data-install-trigger]")) return;
        event.preventDefault();
        if (deferred) {
            deferred.prompt();
            const choice = await deferred.userChoice;
            deferred = null;
            if (choice.outcome === "accepted") bar.hidden = true;
            return;
        }
        bar.hidden = false;
        showHelp();
    });
})();
