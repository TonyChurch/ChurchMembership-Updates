(() => {
    const retreats = Array.from(document.querySelectorAll("[data-daily-retreat]"));
    if (!retreats.length) return;

    const today = new Date();
    const key = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const audioPlayer = new Audio();
    audioPlayer.preload = "none";
    let activeAudioButton = null;
    let activePlaylist = [];
    let activeTrackIndex = 0;

    // الاستماع يستمر بين الصفحات: نحفظ موضع التشغيل كل ثانية أثناء الاستماع، ونكمل منه في الصفحة التالية.
    // لا نعتمد على لحظة مغادرة الصفحة لأن المتصفح يوقف الصوت قبلها.
    const resumeStorageKey = "dailyRetreatAudio";
    let wantsPlayback = false;
    let lastSavedAt = 0;

    const readResumeState = () => {
        try {
            const state = JSON.parse(sessionStorage.getItem(resumeStorageKey) || "null");
            return state && state.dayKey === key ? state : null;
        } catch {
            return null;
        }
    };

    const saveResumeState = () => {
        if (!wantsPlayback || !activeAudioButton || !activePlaylist.length) return;
        try {
            sessionStorage.setItem(resumeStorageKey, JSON.stringify({
                dayKey: key,
                readingId: activeAudioButton.dataset.readingId,
                trackIndex: activeTrackIndex,
                time: audioPlayer.currentTime
            }));
        } catch {
            // التخزين غير متاح؛ يتوقف الصوت كالمعتاد عند الانتقال
        }
    };

    const clearResumeState = () => {
        wantsPlayback = false;
        try {
            sessionStorage.removeItem(resumeStorageKey);
        } catch {
            // لا شيء
        }
    };

    const resumeState = readResumeState();

    audioPlayer.addEventListener("timeupdate", () => {
        const now = Date.now();
        if (now - lastSavedAt < 1000) return;
        lastSavedAt = now;
        saveResumeState();
    });

    const setButtonState = (button, state) => {
        const icon = button.querySelector("i");
        button.classList.toggle("is-playing", state === "playing");
        icon.className = state === "playing" ? "bi bi-pause-fill" : state === "paused" ? "bi bi-play-fill" : "bi bi-volume-up-fill";
        button.title = state === "playing" ? "إيقاف مؤقت" : state === "paused" ? "متابعة الاستماع" : button.dataset.defaultTitle;
    };

    const resetAudioButton = () => {
        if (!activeAudioButton) return;
        setButtonState(activeAudioButton, "idle");
        activeAudioButton = null;
    };

    const playCurrentTrack = () => {
        if (!activePlaylist.length) return;
        audioPlayer.src = activePlaylist[activeTrackIndex];
        audioPlayer.play().catch(() => resetAudioButton());
    };

    audioPlayer.addEventListener("ended", () => {
        if (activeTrackIndex < activePlaylist.length - 1) {
            activeTrackIndex += 1;
            playCurrentTrack();
            return;
        }
        clearResumeState();
        resetAudioButton();
    });

    audioPlayer.addEventListener("error", () => {
        clearResumeState();
        resetAudioButton();
    });

    // يكمل القراءة التي كانت تعمل في الصفحة السابقة من نفس الثانية
    const resumePlayback = () => {
        if (!resumeState) return;
        const button = Array.from(document.querySelectorAll(".topbar-daily-retreat__audio"))
            .find((candidate) => candidate.dataset.readingId === resumeState.readingId);
        if (!button || !button.audioUrls?.[resumeState.trackIndex]) return;

        activeAudioButton = button;
        activePlaylist = button.audioUrls;
        activeTrackIndex = resumeState.trackIndex;
        wantsPlayback = true;
        audioPlayer.preload = "auto";
        audioPlayer.src = activePlaylist[activeTrackIndex];
        audioPlayer.addEventListener("loadedmetadata", () => {
            audioPlayer.currentTime = resumeState.time;
        }, { once: true });

        audioPlayer.play()
            .then(() => setButtonState(button, "playing"))
            // إذا منع المتصفح التشغيل التلقائي يبقى الزر جاهزًا للمتابعة من نفس الموضع بضغطة واحدة
            .catch(() => setButtonState(button, "paused"));
    };

    const renderMessage = (retreat, message) => {
        const readingsHost = retreat.querySelector("[data-daily-retreat-readings]");
        readingsHost.replaceChildren();
        const text = document.createElement("span");
        text.className = "topbar-daily-retreat__loading";
        text.textContent = message;
        readingsHost.append(text);
    };

    fetch("/data/daily-retreat-readings.json?v=2", { cache: "no-cache" })
        .then((response) => {
            if (!response.ok) throw new Error("Daily retreat data is unavailable.");
            return response.json();
        })
        .then((days) => {
            const dailyRetreat = days.find((day) => day.key === key);
            if (!dailyRetreat) {
                retreats.forEach((retreat) => renderMessage(retreat, "لا توجد قراءات مسجلة لهذا اليوم."));
                return;
            }

            retreats.forEach((retreat) => {
                const period = retreat.dataset.retreatPeriod;
                const dateHost = retreat.querySelector("[data-daily-retreat-date]");
                const readingsHost = retreat.querySelector("[data-daily-retreat-readings]");
                dateHost.textContent = `${dailyRetreat.day} ${dailyRetreat.monthName}`;
                readingsHost.replaceChildren();

                dailyRetreat.readings
                    .filter((reading) => reading.period.startsWith(period))
                    .forEach((reading) => {
                        const item = document.createElement("div");
                        const link = document.createElement("a");
                        const icon = document.createElement("i");
                        const text = document.createElement("span");

                        item.className = "topbar-daily-retreat__reading";
                        link.className = "topbar-daily-retreat__reading-link";
                        link.href = reading.url;
                        link.target = "_blank";
                        link.rel = "noopener noreferrer";
                        link.dir = "rtl";
                        link.title = `${reading.period} - ${reading.testament}: ${reading.fullTitle}`;
                        icon.className = "bi bi-bookmark-fill";
                        icon.setAttribute("aria-hidden", "true");
                        text.textContent = reading.title;
                        link.append(icon, text);
                        item.append(link);

                        if (reading.audioUrls?.length) {
                            const audioButton = document.createElement("button");
                            const audioIcon = document.createElement("i");
                            const audioTitle = `استماع إلى ${reading.fullTitle}`;

                            audioButton.type = "button";
                            audioButton.className = "topbar-daily-retreat__audio";
                            audioButton.title = audioTitle;
                            audioButton.dataset.defaultTitle = audioTitle;
                            audioButton.dataset.readingId = `${period}|${reading.fullTitle}`;
                            audioButton.setAttribute("aria-label", audioTitle);
                            audioIcon.className = "bi bi-volume-up-fill";
                            audioIcon.setAttribute("aria-hidden", "true");
                            audioButton.append(audioIcon);
                            audioButton.audioUrls = reading.audioUrls;

                            audioButton.addEventListener("click", () => {
                                if (activeAudioButton === audioButton) {
                                    if (audioPlayer.paused) {
                                        wantsPlayback = true;
                                        audioPlayer.play().catch(() => resetAudioButton());
                                        setButtonState(audioButton, "playing");
                                    } else {
                                        audioPlayer.pause();
                                        clearResumeState();
                                        setButtonState(audioButton, "paused");
                                    }
                                    return;
                                }

                                resetAudioButton();
                                activeAudioButton = audioButton;
                                activePlaylist = reading.audioUrls;
                                activeTrackIndex = 0;
                                wantsPlayback = true;
                                setButtonState(audioButton, "playing");
                                playCurrentTrack();
                            });

                            item.append(audioButton);
                        }

                        readingsHost.append(item);
                    });
            });

            resumePlayback();
        })
        .catch(() => retreats.forEach((retreat) => renderMessage(retreat, "تعذر تحميل قراءات اليوم.")));
})();
