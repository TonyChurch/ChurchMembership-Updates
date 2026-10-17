// مسح كروت الحضور بالكاميرا في صفحة تسجيل حضور الفصل: كل كارت (CM-M:<رقم العضو>) يعلّم صاحبه «حاضر».
// يستخدم BarcodeDetector إن وُجد في المتصفح، وإلا jsQR (wwwroot/lib/jsqr). الكاميرا تحتاج https أو localhost.
(() => {
    const form = document.querySelector("[data-attendance-form]");
    const panel = document.querySelector("[data-scanner]");
    const openButton = document.querySelector("[data-scan-open]");
    if (!form || !panel || !openButton) return;

    const video = panel.querySelector("[data-scan-video]");
    const canvas = panel.querySelector("[data-scan-canvas]");
    const status = panel.querySelector("[data-scan-status]");
    const log = panel.querySelector("[data-scan-log]");
    const present = "حاضر";
    const recent = new Map();
    let stream = null;
    let detector = null;
    let running = false;

    const say = (text) => { status.textContent = text; };

    const beep = () => {
        try {
            const audio = new (window.AudioContext || window.webkitAudioContext)();
            const tone = audio.createOscillator();
            tone.frequency.value = 880;
            tone.connect(audio.destination);
            tone.start();
            tone.stop(audio.currentTime + 0.12);
        } catch { /* بلا صوت */ }
        navigator.vibrate?.(80);
    };

    const mark = (text) => {
        const match = /^CM-M:(\d+)$/.exec((text || "").trim());
        if (!match) { say("هذا ليس كارت حضور من البرنامج"); return; }
        const id = match[1];
        const now = Date.now();
        if (recent.has(id) && now - recent.get(id) < 4000) return;
        recent.set(id, now);

        const row = form.querySelector(`[data-attendance-row][data-member-id="${id}"]`);
        if (!row) { say("صاحب هذا الكارت ليس في هذا الفصل"); return; }
        const radio = [...row.querySelectorAll(".sa-status-input")].find((input) => input.value === present);
        const already = radio?.checked;
        if (radio) radio.checked = true;
        form.dispatchEvent(new Event("change"));
        row.classList.remove("sa-roster__row--scanned");
        void row.offsetWidth;
        row.classList.add("sa-roster__row--scanned");
        const name = row.querySelector(".ui-person__text strong")?.textContent ?? "";
        say(already ? `${name}: مسجل حاضر من قبل` : `✓ ${name}`);
        if (!already) {
            beep();
            const item = document.createElement("li");
            item.textContent = name;
            log.prepend(item);
        }
    };

    const scanFrame = async () => {
        if (!running) return;
        if (video.readyState >= 2) {
            try {
                if (detector) {
                    const codes = await detector.detect(video);
                    if (codes.length) mark(codes[0].rawValue);
                } else if (window.jsQR) {
                    const width = video.videoWidth;
                    const height = video.videoHeight;
                    canvas.width = width;
                    canvas.height = height;
                    const context = canvas.getContext("2d", { willReadFrequently: true });
                    context.drawImage(video, 0, 0, width, height);
                    const image = context.getImageData(0, 0, width, height);
                    const code = window.jsQR(image.data, width, height, { inversionAttempts: "dontInvert" });
                    if (code) mark(code.data);
                }
            } catch { /* إطار غير مقروء */ }
        }
        setTimeout(() => requestAnimationFrame(scanFrame), 120);
    };

    const stop = () => {
        running = false;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        panel.hidden = true;
    };

    openButton.addEventListener("click", async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("المتصفح لا يسمح بالكاميرا هنا. افتح البرنامج من رابط https (رابط الإنترنت) أو من جهاز الكنيسة نفسه.");
            return;
        }
        panel.hidden = false;
        say("جارٍ تشغيل الكاميرا...");
        try {
            if ("BarcodeDetector" in window) {
                const formats = await window.BarcodeDetector.getSupportedFormats?.() ?? [];
                if (formats.includes("qr_code")) detector = new window.BarcodeDetector({ formats: ["qr_code"] });
            }
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            video.srcObject = stream;
            await video.play();
            running = true;
            say("وجّه الكاميرا نحو الكارت");
            panel.scrollIntoView({ block: "start", behavior: "smooth" });
            scanFrame();
        } catch {
            say("لم يُسمح بالكاميرا. اسمح للمتصفح باستخدامها ثم أعد المحاولة.");
        }
    });

    panel.querySelector("[data-scan-close]").addEventListener("click", stop);
    form.addEventListener("submit", stop);
})();
