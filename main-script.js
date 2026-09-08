// ==UserScript==
// @name         Setadiran Form Auto Filler + Catalog Queue
// @namespace    setadiran-autofiller
// @version      5.0.0
// @description  تکمیل خودکار فیلدهای اجباری فرم مشخصات کالا در ستاد ایران، به‌همراه پردازش خودکار صف چند کاتالوگ
// @match        https://fe.setadiran.ir/item/*
// @match        https://eproc.setadiran.ir/eproc/supplierNeedResponse-load.do*
// @updateURL    https://raw.githubusercontent.com/Avisa-ai/setadiran-FillCataloug/refs/heads/main/main-script.js
// @downloadURL  https://raw.githubusercontent.com/Avisa-ai/setadiran-FillCataloug/refs/heads/main/main-script.js
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    /************************************************
     * ۱) تنظیمات — این بخش را برای هر فیلد جدید ویرایش کنید
     *
     * هر کلید = متن label فیلد (همانی که در صفحه دیده می‌شود، بدون ستاره).
     * مقدار می‌تواند به دو شکل باشد:
     *
     *   ساده (برای Text / Select / Autocomplete):
     *       "طول": "1"
     *       "جنس": "استیل ضد زنگ"
     *       "کشور سازنده": "ایران"
     *
     *   ترکیبی تک‌جفتی (برای فیلدهای عدد+واحد بدون placeholder، مثل «وزن»):
     *       "وزن": { value: "5", unit: "کیلوگرم" }
     *   اگر unit را ننویسید، فقط عدد پر می‌شود و واحد پیش‌فرض صفحه دست‌نخورده می‌ماند.
     *
     *   ترکیبی چندجفتی (فیلدهایی مثل «ابعاد محصول» که چند زیرفیلد با placeholder
     *   جدا مثل طول/عرض/ارتفاع دارند؛ کلید داخلی = همان placeholder):
     *       "ابعاد محصول": {
     *           "طول": "1",
     *           "عرض": { value: "1", unit: "سانتیمتر" }
     *       }
     *
     *   چند مقدار جایگزین برای یک لیبل ثابت (وقتی بسته به فرم فقط یکی از
     *   چند اسم مشابه در لیست گزینه‌ها موجود است — نه انتخاب چندتایی،
     *   بلکه اسکریپت هرکدام را که واقعاً در گزینه‌های همان فرم پیدا شود
     *   انتخاب می‌کند):
     *       "جنس": ["استیل ضد زنگ", "استنلس استیل", "فولاد ضد زنگ"]
     *       "نام تجاری (برند)": ["متفرقه", "لوئیس"]
     *
     * نیازی نیست نوع فیلد (text/select/...) را دستی مشخص کنید؛ اسکریپت
     * خودش از روی ساختار HTML تشخیص می‌دهد. اگر افزودن دستیِ نوع لازم شد،
     * می‌توانید به‌جای رشته، آبجکت {value: "...", type: "text|select|autocomplete"}
     * بدهید.
     ************************************************/
    const CONFIG = {
        autoStart: false,          // true = به‌محض لود صفحه خودکار اجرا شود
        delayBeforeStart: 800,     // مکث قبل از شروع (ms)
        delayBetweenFields: 350,   // مکث بین هر فیلد و فیلد بعدی (ms)
        typingDelay: 60,           // فاصله بین حروف هنگام تایپ در Autocomplete (ms)
        menuWaitTimeout: 4000,     // حداکثر انتظار برای باز شدن منو/لیست گزینه‌ها (ms)
        autocompleteWaitTimeout: 7000, // حداکثر انتظار برای نتایج جست‌وجوی سروری Autocomplete (ms)

        // --- تنظیمات مربوط به پردازش خودکار صف چند کاتالوگ ---
        submitButtonTexts: ["ثبت"],     // متن دکمه‌ی ثبت فرم کاتالوگ؛ اگر دکمه پیدا نشد، این را با HTML واقعی دکمه اصلاح کنید
        submitWatchdogTimeout: 12000,   // اگر بعد از زدن «ثبت» تا این مدت صفحه عوض نشد، یعنی خطا رخ داده (ms)
        afterCatalogSuccessDelay: 800,  // مکث کوتاه بعد از فرود روی صفحه‌ی لیست، قبل از رفتن سراغ کاتالوگ بعدی (ms)

        fields: {
            "MESC Code": "1",
            "کد MESC": "1",
            "مدل": "لوئیس",
            "مرجع سازنده": "لوئیس",
            "اقلام ست": "پنس",
            "تعداد اقلام ست": "1",
            "طول": "1",
            "سایز": "1",
            "سایز سری": "1",
            "تعداد در بسته": "1",
            "رنگ ست": "نقره ای",
            "رنگ": "سفید",
            "نوع": "ساده",
            "نوع سری": "صاف",
            "نوع کاتر": "دابل اکشن",
            "نوع باند": "کنار بافت",
            "کارابین": "دارد",
            "سیم بکسل": "دارد",
            "قابلیت اتوکلاو": "دارد",
            "قابل اتوکلاو": "بله",
            "نوع مصرف پنس": "چندبار مصرف",
            "ضد اشعه UV": "بله",
            "یکبار مصرف": "بله",
            "ضد آب": "بله",
            "آسان برش": "بله",
            "دوطرفه": "بله",
            "ضد حساسیت": "بله",
            "اقلام کیت": "کانولای ایریگیشن",
            "جنس": ["استیل ضد زنگ", "استنلس استیل", "استیل استنلس", "فولاد ضد زنگ"],
            "نام تجاری (برند)": ["متفرقه", "لوئیس"],
            "استریل": ["هست", "بله"],
            "کشور سازنده" :" ایران",
            "وزن": { value: "1", unit: "گرم" },
            "ابعاد محصول": {
                "طول": "1",
                "عرض": "1",
                "ارتفاع": "1"
            }

            // افزودن فیلد جدید در آینده، فقط همین کافی است:
            // "نام فیلد جدید": "مقدار جدید",
        }
    };

    /************************************************
     * ۲) ابزارهای عمومی
     ************************************************/

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function normalizeText(value) {
        return String(value || "")
            .replace(/\u200c/g, " ")   // نیم‌فاصله
            .replace(/\u00a0/g, " ")   // فاصله غیرشکن
            .replace(/[\u066A*]/g, "") // ستاره‌ی الزامی و ٪
            .replace(/:/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    // مقدار می‌تواند یک رشته یا آرایه‌ای از رشته‌های جایگزین باشد؛
    // همیشه به آرایه تبدیلش می‌کنیم تا در matching یکسان رفتار کنیم.
    function toCandidates(value) {
        return (Array.isArray(value) ? value : [value]).map(v => normalizeText(v));
    }

    function log(...args) {
        console.log("%c[Setadiran AutoFiller]", "color:#1976d2;font-weight:bold", ...args);
    }
    function warn(...args) {
        console.warn("[Setadiran AutoFiller]", ...args);
    }

    async function waitFor(fn, { timeout = CONFIG.menuWaitTimeout, interval = 80 } = {}) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const result = fn();
            if (result) return result;
            await sleep(interval);
        }
        return null;
    }

    /**
     * مقداردهی به input/textarea به روشی که React آن را تشخیص بدهد
     * (ست کردن مستقیم .value کافی نیست چون React مقدار قبلی را در
     * یک property توصیف‌گر داخلی نگه می‌دارد و رویداد input را نادیده می‌گیرد)
     */
    function setReactValue(element, value) {
        const proto = element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;

        const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
        if (descriptor && descriptor.set) {
            descriptor.set.call(element, value);
        } else {
            element.value = value;
        }

        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: String(value) }));
    }

    /**
     * شبیه‌سازی کامل یک کلیک واقعی (pointerdown → mousedown → pointerup → mouseup → click).
     *
     * نکته‌ی کلیدی: کامپوننت Select در MUI با element.click() ساده باز نمی‌شود،
     * چون منطق باز شدن منو روی رویداد "mousedown" پیاده‌سازی شده، نه "click".
     * element.click() فقط یک رویداد click می‌سازد و mousedown را نمی‌فرستد؛
     * به همین دلیل در اسکریپت قبلی، انتخاب از dropdown اصلاً کار نمی‌کرد.
     */
    function simulateRealClick(element) {
        const rect = element.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // نکته‌ی مهم: چون این اسکریپت با @grant های GM_* اجرا می‌شود، Tampermonkey
        // آن را در یک sandbox جدا اجرا می‌کند و در آن sandbox، متغیر «window»
        // خودِ window واقعیِ صفحه نیست — همین باعث خطای «Failed to convert
        // value to 'Window'» هنگام ساخت MouseEvent می‌شد. راه‌حل: همیشه
        // window واقعیِ صفحه را از روی خودِ element بگیریم.
        const realWindow = (element.ownerDocument && element.ownerDocument.defaultView) ||
            (typeof unsafeWindow !== "undefined" ? unsafeWindow : window);

        const common = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: realWindow,
            button: 0,
            buttons: 1,
            clientX: cx,
            clientY: cy
        };

        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
            const EventCtor = type.startsWith("pointer") ? realWindow.PointerEvent : realWindow.MouseEvent;
            try {
                element.dispatchEvent(new EventCtor(type, common));
            } catch (e) {
                // برخی مرورگرها PointerEvent را در همه موارد پشتیبانی نمی‌کنند
                element.dispatchEvent(new realWindow.MouseEvent(type, common));
            }
        });
    }

    /************************************************
     * ۲.۱) مدیریت صفِ کاتالوگ‌ها (ذخیره‌سازیِ مشترک بین eproc.setadiran.ir و fe.setadiran.ir)
     *
     * از GM_setValue/GM_getValue استفاده می‌کنیم چون این دو دامنه با هم فرق
     * دارند و localStorage معمولی بین‌شان مشترک نیست؛ اما ذخیره‌سازیِ Tampermonkey
     * برای یک اسکریپت، مستقل از دامنه‌ی صفحه و در همه‌ی match ها یکسان است.
     ************************************************/
    const QUEUE_KEY = "setadiran_af_queue_v1";

    function loadQueue() {
        try {
            const raw = GM_getValue(QUEUE_KEY, null);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            warn("خطا در خواندن صف:", e);
            return null;
        }
    }

    function saveQueue(queue) {
        GM_setValue(QUEUE_KEY, JSON.stringify(queue));
    }

    function clearQueue() {
        GM_deleteValue(QUEUE_KEY);
    }

    /**
     * پنل شناور وضعیت صف — پیام + دکمه‌های اختیاری نشان می‌دهد.
     */
    function showPanel(message, options = {}) {
        removePanel();

        const panel = document.createElement("div");
        panel.id = "setadiran-queue-panel";

        Object.assign(panel.style, {
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: "999999",
            maxWidth: "340px",
            padding: "14px 16px",
            background: "#263238",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "13px",
            fontFamily: "Tahoma, Arial, sans-serif",
            lineHeight: "1.8",
            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
            direction: "rtl"
        });

        const text = document.createElement("div");
        text.textContent = message;
        panel.appendChild(text);

        (options.buttons || []).forEach(({ text: btnText, onClick }) => {
            const btn = document.createElement("button");
            btn.textContent = btnText;
            Object.assign(btn.style, {
                marginTop: "8px",
                marginInlineEnd: "6px",
                padding: "6px 12px",
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                fontSize: "12px",
                cursor: "pointer"
            });
            btn.addEventListener("click", onClick);
            panel.appendChild(btn);
        });

        document.body.appendChild(panel);

        if (options.autoHide) {
            setTimeout(removePanel, options.autoHide === true ? 5000 : options.autoHide);
        }
    }

    function removePanel() {
        const existing = document.getElementById("setadiran-queue-panel");
        if (existing) existing.remove();
    }

    /**
     * پیدا کردن دکمه‌ی «ثبت» (یا هر متن دیگری که در CONFIG.submitButtonTexts بگذارید)
     */
    function findButtonByText(textList) {
        const wanted = textList.map(normalizeText);
        const candidates = [...document.querySelectorAll(
            'button, a[role="button"], div[role="button"], input[type="submit"], input[type="button"]'
        )];

        const visible = el => el.offsetParent !== null && !el.disabled;
        const labelOf = el => normalizeText(
            (el.value !== undefined && el.value !== "" ? el.value : "") ||
            el.getAttribute("data-tooltip") ||
            el.textContent
        );

        return candidates.find(el => visible(el) && wanted.includes(labelOf(el))) ||
            candidates.find(el => visible(el) && wanted.some(w => labelOf(el).includes(w))) ||
            null;
    }

    /************************************************
     * ۳) پیدا کردن container هر فیلد از روی متن label
     ************************************************/

    function hasControl(el) {
        if (!el) return false;
        return Boolean(el.querySelector(
            'input, textarea, div[role="button"][aria-haspopup="listbox"], [role="combobox"]'
        ));
    }

    // فیلدهای دو-تکه‌ی «عدد + واحد» (طول، وزن، ...)
    function findMultiColumnContainer(labelText) {
        const wanted = normalizeText(labelText);
        const wrappers = [...document.querySelectorAll(".multi-column-container")];

        for (const wrapper of wrappers) {
            const labelEl = wrapper.querySelector("label.Label, label");
            if (!labelEl) continue;

            const actual = normalizeText(labelEl.textContent);
            if (actual === wanted || actual.includes(wanted)) {
                return wrapper;
            }
        }
        return null;
    }

    // فیلدهای معمولی (Text / Select / Autocomplete) که label آن‌ها attribute «for» دارد
    function findStandardContainer(labelText) {
        const wanted = normalizeText(labelText);
        const labels = [...document.querySelectorAll("label")];

        for (const label of labels) {
            if (label.closest(".multi-column-container")) continue; // اینها را جدا هندل می‌کنیم

            const actual = normalizeText(label.textContent);
            if (actual !== wanted && !actual.includes(wanted)) continue;

            const forId = label.getAttribute("for");
            if (forId) {
                const control = document.getElementById(forId);
                if (control) {
                    const container =
                        control.closest(".MuiFormControl-root") ||
                        control.closest(".MuiGrid-item") ||
                        control.parentElement;
                    if (hasControl(container)) return container;
                }
            }

            // راه دوم: بالا رفتن در DOM تا رسیدن به کانتینری که کنترل داخلش باشد
            let parent = label;
            for (let i = 0; i < 8 && parent; i++) {
                if (hasControl(parent)) return parent;
                parent = parent.parentElement;
            }
        }
        return null;
    }

    /************************************************
     * ۴) پرکردن Text ساده
     ************************************************/
    async function fillText(container, value) {
        const input = container.querySelector(
            'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea'
        );
        if (!input) return false;

        input.focus();
        setReactValue(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.blur();

        log("متن پر شد:", value);
        return true;
    }

    /************************************************
     * ۵) پرکردن Select سفارشی MUI (باکس + منوی کشویی)
     ************************************************/
    async function fillSelect(container, value) {
        const trigger = container.querySelector(
            'div[role="button"][aria-haspopup="listbox"], .MuiSelect-select'
        );
        if (!trigger) return false;

        // ثبت لیست‌های باز-شده‌ی فعلی قبل از کلیک، تا بعد از کلیک بتوانیم
        // لیستِ تازه اضافه‌شده به body را دقیق تشخیص بدهیم (چون منو در پورتال رندر می‌شود)
        const before = new Set(document.querySelectorAll('ul[role="listbox"]'));

        simulateRealClick(trigger);

        const listbox = await waitFor(() => {
            const lists = [...document.querySelectorAll('ul[role="listbox"]')];
            const fresh = lists.find(ul => !before.has(ul) && ul.offsetParent !== null);
            return fresh || (lists.length === 1 ? lists[0] : null);
        });

        if (!listbox) {
            warn("منوی Select باز نشد:", value);
            return false;
        }

        const candidates = toCandidates(value);
        const options = [...listbox.querySelectorAll('li[role="option"]')];

        const option =
            options.find(o => candidates.includes(normalizeText(o.textContent))) ||
            options.find(o => candidates.includes(normalizeText(o.getAttribute("data-value")))) ||
            options.find(o => candidates.some(c => normalizeText(o.textContent).includes(c)));

        if (!option) {
            warn("گزینه‌ی موردنظر در Select پیدا نشد:", value, "| گزینه‌های موجود:", options.map(o => o.textContent.trim()));
            trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            return false;
        }

        simulateRealClick(option);
        await sleep(150);

        log("Select پر شد:", value);
        return true;
    }

    /************************************************
     * ۶) پرکردن Autocomplete (تایپی + جست‌وجوی سروری)
     ************************************************/
    async function fillAutocomplete(container, value) {
        const input = container.querySelector('input[aria-autocomplete="list"], input[role="combobox"]');
        if (!input) return false;

        // نکته‌ی مهم: خیلی از پیاده‌سازی‌های Autocomplete (مثل Select) منطق
        // باز شدن/فعال‌سازیِ جست‌وجو را روی رویداد mousedown/click واقعی دارند،
        // نه روی input.focus() برنامه‌ای. برای همین قبل از تایپ، یک کلیک واقعی
        // شبیه‌سازی می‌کنیم تا هر رفتار داخلی (باز شدن پاپ‌آپ، شروع حالت جست‌وجو) فعال شود.
        simulateRealClick(input);
        input.focus();
        setReactValue(input, "");
        await sleep(150);

        // تایپ حرف‌به‌حرف با رویدادهای کامل کیبورد (keydown → input → keyup)؛
        // چون جست‌وجو معمولاً سروری/debounce شده و با ست‌کردنِ یک‌باره‌ی
        // کل مقدار، یا فقط با رویداد input، همیشه به‌درستی trigger نمی‌شود.
        let typed = "";
        for (const ch of String(value)) {
            typed += ch;
            input.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
            setReactValue(input, typed);
            input.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));
            await sleep(CONFIG.typingDelay);
        }

        // کمی صبر اضافه بعد از آخرین حرف، تا debounce سرور فرصت پاسخ داشته باشد
        await sleep(400);

        const candidates = toCandidates(value);

        const listbox = await waitFor(() => {
            const list = document.querySelector('.MuiAutocomplete-popper ul[role="listbox"], ul[role="listbox"]');
            return (list && list.querySelectorAll('li[role="option"]').length > 0) ? list : null;
        }, { timeout: CONFIG.autocompleteWaitTimeout });

        if (listbox) {
            const options = [...listbox.querySelectorAll('li[role="option"]')];
            const option =
                options.find(o => candidates.includes(normalizeText(o.textContent))) ||
                options.find(o => candidates.some(c => normalizeText(o.textContent).startsWith(c))) ||
                options.find(o => candidates.some(c => normalizeText(o.textContent).includes(c)));

            if (option) {
                simulateRealClick(option);
                await sleep(150);
                log("Autocomplete با انتخاب از لیست پر شد:", value);
                return true;
            }

            warn("در لیست Autocomplete گزینه‌ی دقیق پیدا نشد، تلاش با کیبورد. گزینه‌های موجود:",
                options.map(o => o.textContent.trim()));
        } else {
            warn("لیست Autocomplete باز نشد یا خالی ماند برای:", value);
        }

        // راه جایگزین: هایلایت اولین گزینه با ArrowDown و تایید با Enter
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true }));
        await sleep(200);
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
        await sleep(150);

        log("Autocomplete با Enter نهایی شد (بررسی دستی توصیه می‌شود):", value);
        return true;
    }

    /************************************************
     * ۷) فیلدهای ترکیبی «عدد + واحد» (طول / وزن / ...)
     ************************************************/
    const NUMBER_INPUT_SELECTOR = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])';

    async function fillMultiColumn(container, fieldValue) {
        const items = [...container.querySelectorAll(".MuiGrid-item")];
        const numberItems = items.filter(i => i.querySelector(NUMBER_INPUT_SELECTOR));

        // آیا این زیرمجموعه چند زیرفیلد جدا با placeholder دارد؟ (مثل «طول»/«عرض» در «ابعاد محصول»)
        const hasPlaceholders = numberItems.some(i => {
            const inp = i.querySelector(NUMBER_INPUT_SELECTOR);
            return inp && inp.getAttribute("placeholder");
        });

        const isMultiPairConfig = fieldValue && typeof fieldValue === "object" &&
            !("value" in fieldValue) && !Array.isArray(fieldValue);

        // --- حالت چندجفتی: هر عدد placeholder خودش را دارد (طول/عرض/ارتفاع) ---
        if (hasPlaceholders && isMultiPairConfig) {
            let ok = true;

            for (const numberItem of numberItems) {
                const inp = numberItem.querySelector(NUMBER_INPUT_SELECTOR);
                const placeholder = (inp.getAttribute("placeholder") || "").trim();
                if (!placeholder) continue;

                const specKey = Object.keys(fieldValue).find(
                    k => normalizeText(k) === normalizeText(placeholder)
                );

                if (!specKey) {
                    warn(`مقداری برای زیرفیلد «${placeholder}» تعریف نشده — رد شد.`);
                    continue;
                }

                const subSpec = fieldValue[specKey];
                const subValue = typeof subSpec === "object" ? subSpec.value : subSpec;
                const subUnit = typeof subSpec === "object" ? subSpec.unit : null;

                if (subValue != null) {
                    ok = await fillText(numberItem, subValue) && ok;
                }

                if (subUnit) {
                    // باکس واحد بلافاصله بعد از باکس عدد در همان ردیف قرار دارد
                    const idx = items.indexOf(numberItem);
                    const unitItem = items[idx + 1];
                    if (unitItem && unitItem.querySelector('div[role="button"][aria-haspopup="listbox"]')) {
                        ok = await fillSelect(unitItem, subUnit) && ok;
                    } else {
                        warn(`باکس واحد کنار «${placeholder}» پیدا نشد.`);
                    }
                }

                await sleep(CONFIG.delayBetweenFields);
            }

            return ok;
        }

        // --- حالت تک‌جفتی: فقط یک عدد + یک واحد (بدون placeholder جدا) ---
        const spec = typeof fieldValue === "object" && !Array.isArray(fieldValue)
            ? fieldValue
            : { value: fieldValue };

        const numberItem = numberItems[0];
        const unitItem = items.find(i => i.querySelector('div[role="button"][aria-haspopup="listbox"]'));

        let ok = true;

        if (numberItem && spec.value != null) {
            ok = await fillText(numberItem, spec.value) && ok;
        }

        if (unitItem && spec.unit) {
            ok = await fillSelect(unitItem, spec.unit) && ok;
        }

        return ok;
    }

    /************************************************
     * ۸) اجرای هر فیلد بر اساس نوع تشخیص‌داده‌شده
     ************************************************/
    async function fillOneField(labelText, rawConfig) {
        // اول چک می‌کنیم آیا فیلد ترکیبی (عدد+واحد) است
        const multiContainer = findMultiColumnContainer(labelText);
        if (multiContainer) {
            log("در حال پردازش (ترکیبی):", labelText);
            return await fillMultiColumn(multiContainer, rawConfig);
        }

        const container = findStandardContainer(labelText);
        if (!container) {
            warn("فیلد پیدا نشد در صفحه:", labelText);
            return false;
        }

        const isPlainConfigObject = rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig);
        const explicitType = isPlainConfigObject ? rawConfig.type : null;
        const value = isPlainConfigObject && "value" in rawConfig ? rawConfig.value : rawConfig;

        const type = explicitType || (
            container.querySelector('input[aria-autocomplete="list"]') ? "autocomplete" :
            container.querySelector('div[role="button"][aria-haspopup="listbox"]') ? "select" :
            "text"
        );

        log("در حال پردازش:", labelText, "| نوع تشخیص‌داده‌شده:", type);

        if (type === "text") return await fillText(container, value);
        if (type === "select") return await fillSelect(container, value);
        if (type === "autocomplete") return await fillAutocomplete(container, value);

        warn("نوع فیلد ناشناخته:", type, labelText);
        return false;
    }

    /************************************************
     * ۹) پیدا کردن همه‌ی فیلدهای الزامی صفحه (برای گزارش فیلدهای پیکربندی‌نشده)
     ************************************************/
    function listAllRequiredLabels() {
        const results = new Set();

        document.querySelectorAll(".multi-column-container label.Label, .multi-column-container label").forEach(l => {
            if (l.querySelector(".MuiFormLabel-asterisk")) {
                results.add(l.textContent.replace(/\*/g, "").trim());
            }
        });

        document.querySelectorAll("label").forEach(l => {
            if (l.closest(".multi-column-container")) return;
            if (l.querySelector(".MuiFormLabel-asterisk")) {
                results.add(l.textContent.replace(/\*/g, "").trim());
            }
        });

        return [...results];
    }

    /************************************************
     * ۱۰) اجرای کامل
     ************************************************/
    async function runAutoFiller() {
        const button = document.getElementById("setadiran-auto-fill-button");
        if (button) {
            button.disabled = true;
            button.textContent = "در حال تکمیل...";
        }

        log("شروع عملیات تکمیل فرم");
        await sleep(CONFIG.delayBeforeStart);

        let successCount = 0;
        let failCount = 0;

        for (const [labelText, fieldConfig] of Object.entries(CONFIG.fields)) {
            const result = await fillOneField(labelText, fieldConfig);
            if (result) successCount++; else failCount++;
            await sleep(CONFIG.delayBetweenFields);
        }

        // گزارش فیلدهای الزامیِ روی صفحه که هنوز در CONFIG تعریف نشده‌اند
        const allRequired = listAllRequiredLabels();
        const configuredNormalized = Object.keys(CONFIG.fields).map(normalizeText);
        const missing = allRequired.filter(label => {
            const n = normalizeText(label);
            return !configuredNormalized.some(c => n === c || n.includes(c) || c.includes(n));
        });

        if (missing.length) {
            warn("این فیلدهای الزامی هنوز در CONFIG.fields تعریف نشده‌اند:", missing);
        }

        log(`عملیات تمام شد. موفق: ${successCount} — ناموفق: ${failCount} — پیکربندی‌نشده: ${missing.length}`);

        if (button) {
            button.disabled = false;
            button.textContent = "شروع تکمیل خودکار";
        }

        alert(
            `عملیات تکمیل فرم تمام شد.\n\n` +
            `موفق: ${successCount}\n` +
            `ناموفق: ${failCount}\n` +
            `فیلدهای الزامی بدون تنظیم: ${missing.length ? missing.join("، ") : "—"}\n\n` +
            `برای جزئیات بیشتر Console مرورگر (F12) را بررسی کنید.`
        );
    }

    /************************************************
     * ۱۱) ساخت دکمه‌ی شناور روی صفحه
     ************************************************/
    function createStartButton() {
        if (document.getElementById("setadiran-auto-fill-button")) return;

        const button = document.createElement("button");
        button.id = "setadiran-auto-fill-button";
        button.type = "button";
        button.textContent = "شروع تکمیل خودکار";

        Object.assign(button.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: "999999",
            padding: "12px 18px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "Tahoma, Arial, sans-serif",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        });

        button.addEventListener("click", runAutoFiller);
        document.body.appendChild(button);
    }

    /************************************************
     * ۱۲) صفحه‌ی فهرست نیازها (eproc.setadiran.ir) — orchestrator صف
     *
     * این صفحه لینک‌های «تکمیل» دارد که هرکدام onclick="showORcompletionCatalog(cartId)"
     * را صدا می‌زنند. ما این تابع را عیناً (از خود صفحه، از طریق unsafeWindow)
     * صدا می‌زنیم تا مسیر رسمی و همیشه‌به‌روز سایت طی شود، بدون بازسازیِ
     * دستیِ URL که با هر تغییر در سایت ممکن است بشکند.
     ************************************************/

    function findCompletionCartIds() {
        const anchors = [...document.querySelectorAll('a[onclick*="showORcompletionCatalog"]')];
        return anchors
            .map(a => {
                const m = a.getAttribute("onclick").match(/showORcompletionCatalog\((\d+)\)/);
                return m ? m[1] : null;
            })
            .filter(Boolean);
    }

    function goToNextCatalog(queue) {
        if (!queue.remaining.length) {
            queue.status = "done";
            saveQueue(queue);
            showPanel(`همه‌ی ${queue.total} کاتالوگ با موفقیت تکمیل شدند ✅`, { autoHide: 6000 });
            clearQueue();
            return;
        }

        const nextId = queue.remaining[0];
        log("در حال رفتن به کاتالوگ:", nextId, "| باقی‌مانده:", queue.remaining.length);

        if (typeof unsafeWindow.showORcompletionCatalog === "function") {
            unsafeWindow.showORcompletionCatalog(Number(nextId));
        } else {
            warn("تابع showORcompletionCatalog روی این صفحه پیدا نشد.");
            showPanel("تابع «تکمیل» روی این صفحه پیدا نشد؛ لطفاً دستی روی «تکمیل» بزنید.");
        }
    }

    function createQueueStartButton(cartIds) {
        if (document.getElementById("setadiran-queue-start-button")) return;

        const button = document.createElement("button");
        button.id = "setadiran-queue-start-button";
        button.type = "button";
        button.textContent = `تکمیل خودکار همه‌ی کاتالوگ‌ها (${cartIds.length} مورد)`;

        Object.assign(button.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: "999999",
            padding: "12px 18px",
            background: "#2e7d32",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "Tahoma, Arial, sans-serif",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        });

        button.addEventListener("click", () => {
            const queue = {
                total: cartIds.length,
                remaining: [...cartIds],
                done: [],
                status: "running",
                listUrl: window.location.href
            };
            saveQueue(queue);
            goToNextCatalog(queue);
        });

        document.body.appendChild(button);
    }

    async function initOrchestrator() {
        const existingQueue = loadQueue();

        // هر برگشتی به این صفحه در حالی که صف باقی‌مانده دارد (چه status
        // «running» و چه «paused») یعنی کاتالوگ قبلی با موفقیت ثبت شد —
        // چون تنها راه رسیدنِ دوباره به این صفحه، ثبتِ موفق (خودکار یا دستی)
        // یا دکمه‌ی «رد کردن این کاتالوگ» است که خودش صف را جلو می‌برد.
        if (existingQueue && existingQueue.remaining && existingQueue.remaining.length &&
            (existingQueue.status === "running" || existingQueue.status === "paused")) {

            existingQueue.done = existingQueue.done || [];
            const justCompleted = existingQueue.remaining.shift();
            if (justCompleted) existingQueue.done.push(justCompleted);
            existingQueue.status = "running";
            saveQueue(existingQueue);

            showPanel(`کاتالوگ تکمیل شد ✅ (${existingQueue.done.length} از ${existingQueue.total}). در حال رفتن به کاتالوگ بعدی…`);
            await sleep(CONFIG.afterCatalogSuccessDelay);
            goToNextCatalog(existingQueue);
            return;
        }

        const cartIds = findCompletionCartIds();
        if (!cartIds.length) {
            log("هیچ کاتالوگ «تکمیل»‌نشده‌ای در این صفحه پیدا نشد.");
            return;
        }

        createQueueStartButton(cartIds);
    }

    /************************************************
     * ۱۳) صفحه‌ی فرم مشخصات کالا (fe.setadiran.ir) — worker صف
     ************************************************/

    async function runQueuedFill(queue) {
        showPanel(`در حال تکمیل کاتالوگ ${queue.done.length + 1} از ${queue.total}…`);

        await sleep(CONFIG.delayBeforeStart);

        for (const [labelText, fieldConfig] of Object.entries(CONFIG.fields)) {
            await fillOneField(labelText, fieldConfig);
            await sleep(CONFIG.delayBetweenFields);
        }

        await sleep(400);

        const submitBtn = findButtonByText(CONFIG.submitButtonTexts);
        if (!submitBtn) {
            warn("دکمه‌ی «ثبت» پیدا نشد.");
            pauseQueueForManualFix(queue, "دکمه‌ی «ثبت» پیدا نشد. لطفاً فرم را بررسی و خودتان ثبت کنید.");
            return;
        }

        log("زدن دکمه‌ی ثبت…");
        simulateRealClick(submitBtn);

        // اگر ثبت موفق باشد، سایت به‌طور خودکار به eproc.setadiran.ir برمی‌گردد
        // و این اسکریپت (چون صفحه عوض می‌شود) دیگر ادامه پیدا نمی‌کند.
        // اگر بعد از این مهلت هنوز همین‌جاییم، یعنی خطایی رخ داده.
        await sleep(CONFIG.submitWatchdogTimeout);

        pauseQueueForManualFix(
            queue,
            "به نظر می‌رسد ثبت با خطا مواجه شده (بعد از مهلت تعیین‌شده صفحه عوض نشد). لطفاً خطا را در فرم برطرف کرده و خودتان روی «ثبت» بزنید."
        );
    }

    function pauseQueueForManualFix(queue, message) {
        queue.status = "paused";
        saveQueue(queue);

        showPanel(message, {
            buttons: [
                {
                    text: "رد کردن این کاتالوگ و ادامه",
                    onClick: () => skipCurrentAndContinue(queue)
                },
                {
                    text: "لغو کامل صف",
                    onClick: () => { clearQueue(); removePanel(); }
                }
            ]
        });
    }

    function skipCurrentAndContinue(queue) {
        // خودِ shift کردنِ آیتم فعلی را به initOrchestrator (بعد از فرود روی
        // صفحه‌ی لیست) می‌سپاریم تا منطق «حذف از remaining» یک‌جا و یکسان باشد.
        const fresh = loadQueue() || queue;
        fresh.status = "paused";
        saveQueue(fresh);
        window.location.href = fresh.listUrl;
    }

    async function initItemPage() {
        await waitFor(() => document.querySelector(".MuiFormLabel-asterisk"), { timeout: 15000, interval: 200 });

        const queue = loadQueue();

        // اگر صف در حال اجراست، خودکار پر کن و ثبت کن؛ وگرنه رفتار قبلی
        // (دکمه‌ی دستیِ تکی) را نشان بده.
        if (queue && queue.status === "running") {
            await runQueuedFill(queue);
            return;
        }

        createStartButton();

        if (CONFIG.autoStart) {
            await sleep(300);
            runAutoFiller();
        }
    }

    /************************************************
     * ۱۴) شروع اسکریپت — بسته به دامنه، مسیر مناسب را اجرا کن
     ************************************************/
    async function init() {
        if (location.hostname === "fe.setadiran.ir") {
            await initItemPage();
        } else if (location.hostname === "eproc.setadiran.ir" && /supplierNeedResponse-load\.do/.test(location.pathname)) {
            await initOrchestrator();
        }
    }

    init();
})();
