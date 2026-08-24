/**
 * Logic điều khiển Hệ thống Quản lý và Theo dõi Dinh dưỡng
 */

// --- KHỞI TẠO STATE ---
let state = {
    personalInfo: {
        weight: 70,
        height: 170,
        age: 25,
        gender: "male",
        activity: 1.375, // Vận động nhẹ
        goal: "lose" // Giảm cân chậm
    },
    foodLog: {}, // { "YYYY-MM-DD": [ { id, name, calories, portion, mealType } ] }
    inbodyHistory: [], // [ { id, date, weight, bodyFat, muscleMass } ]
    lineConfig: {
        token: "",
        simulateActive: true
    },
    weeklyPlan: null, // Đề xuất tuần tiếp theo
    selectedDate: new Date().toISOString().split("T")[0]
};

// Khởi tạo các giá trị mẫu nếu LocalStorage trống để người dùng dễ trải nghiệm
function initDemoData() {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Dữ liệu cá nhân mẫu
    if (!localStorage.getItem("nutrition_personalInfo")) {
        localStorage.setItem("nutrition_personalInfo", JSON.stringify(state.personalInfo));
    } else {
        state.personalInfo = JSON.parse(localStorage.getItem("nutrition_personalInfo"));
    }

    // Cấu hình LINE mẫu
    if (!localStorage.getItem("nutrition_lineConfig")) {
        localStorage.setItem("nutrition_lineConfig", JSON.stringify(state.lineConfig));
    } else {
        state.lineConfig = JSON.parse(localStorage.getItem("nutrition_lineConfig"));
    }

    // Nhật ký ăn uống mẫu (cho ngày hôm nay)
    if (!localStorage.getItem("nutrition_foodLog")) {
        const demoFoodLog = {};
        demoFoodLog[todayStr] = [
            { id: 1, name: "Phở bò", calories: 550, portion: "1 tô", mealType: "breakfast" },
            { id: 2, name: "Cà phê sữa đá", calories: 150, portion: "1 ly", mealType: "breakfast" },
            { id: 3, name: "Ức gà áp chảo", calories: 330, portion: "200g", mealType: "lunch" },
            { id: 4, name: "Cơm gạo lứt (chén vừa)", calories: 110, portion: "1 chén", mealType: "lunch" },
            { id: 5, name: "Táo tây", calories: 52, portion: "1 quả", mealType: "snack" },
            { id: 6, name: "Salad cá ngừ dầu giấm", calories: 180, portion: "1 dĩa", mealType: "dinner" }
        ];
        
        // Thêm dữ liệu lịch sử cho các ngày trước
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        demoFoodLog[yesterdayStr] = [
            { id: 7, name: "Bánh mì kẹp thịt", calories: 450, portion: "1 ổ", mealType: "breakfast" },
            { id: 8, name: "Cơm tấm sườn nướng", calories: 620, portion: "1 dĩa", mealType: "lunch" },
            { id: 9, name: "Chuối chín", calories: 89, portion: "1 quả", mealType: "snack" },
            { id: 10, name: "Canh chua cá lóc", calories: 120, portion: "1 bát", mealType: "dinner" },
            { id: 11, name: "Cơm trắng (chén vừa)", calories: 130, portion: "1 chén", mealType: "dinner" }
        ];
        
        localStorage.setItem("nutrition_foodLog", JSON.stringify(demoFoodLog));
        state.foodLog = demoFoodLog;
    } else {
        state.foodLog = JSON.parse(localStorage.getItem("nutrition_foodLog"));
    }

    // Khởi tạo InBody trống hoàn toàn theo yêu cầu
    localStorage.setItem("nutrition_inbodyHistory", JSON.stringify([]));
    state.inbodyHistory = [];

    // Kế hoạch tuần mẫu
    if (localStorage.getItem("nutrition_weeklyPlan")) {
        state.weeklyPlan = JSON.parse(localStorage.getItem("nutrition_weeklyPlan"));
    }
}

// Lưu trữ dữ liệu
function saveToLocalStorage(key, value) {
    localStorage.setItem("nutrition_" + key, JSON.stringify(value));
}

// --- TÍNH TOÁN CALORIES MỤC TIÊU ---
function checkIsAiAdapted() {
    const { goal } = state.personalInfo;
    const history = state.inbodyHistory;
    if (history.length >= 2 && (goal === "lose" || goal === "lose-fast")) {
        const latest = history[history.length - 1];
        const prev = history[history.length - 2];
        const wDiff = parseFloat(latest.weight) - parseFloat(prev.weight);
        const fDiff = parseFloat(latest.bodyFat) - parseFloat(prev.bodyFat);
        return (wDiff < -1.0 || wDiff >= 0 || fDiff > 0);
    }
    return false;
}

function calculateCalorieGoal() {
    const { weight, height, age, gender, activity, goal } = state.personalInfo;
    
    // Tính BMR theo Mifflin-St Jeor
    let bmr = 0;
    if (gender === "male") {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Tính TDEE
    const tdee = bmr * activity;

    // Tính lượng Calo mục tiêu dựa trên lựa chọn giảm cân
    let calorieGoal = tdee;
    if (goal === "lose") {
        calorieGoal = tdee - 500; // Thâm hụt 500 kcal chuẩn (giảm ~0.5kg/tuần)
    } else if (goal === "lose-fast") {
        calorieGoal = tdee - 750; // Thâm hụt sâu (giảm ~0.75kg/tuần)
    } else if (goal === "maintain") {
        calorieGoal = tdee; // Giữ cân
    }

    // --- AI DYNAMIC ADAPTIVE TUNING ---
    // Tự động tinh chỉnh Calo thích ứng theo tiến độ InBody tuần qua (AI)
    const history = state.inbodyHistory;
    if (history.length >= 2 && (goal === "lose" || goal === "lose-fast")) {
        const latest = history[history.length - 1];
        const prev = history[history.length - 2];
        const wDiff = parseFloat(latest.weight) - parseFloat(prev.weight);
        const fDiff = parseFloat(latest.bodyFat) - parseFloat(prev.bodyFat);

        if (wDiff < -1.0) {
            calorieGoal += 150; // Giảm cân quá nhanh -> Tăng nhẹ Calo để tránh mất cơ
        } else if (wDiff >= 0 || fDiff > 0) {
            calorieGoal -= 100; // Chững cân hoặc tăng mỡ -> Giảm nhẹ Calo kích thích đốt mỡ
        }
    }

    // Đảm bảo lượng calo tối thiểu an toàn là 1200 kcal cho nữ và 1350 kcal cho nam
    const minSafeCal = gender === "male" ? 1350 : 1200;
    return Math.round(Math.max(calorieGoal, minSafeCal));
}

// Lấy tổng calo đã nạp trong ngày đã chọn
function getConsumedCalories(dateStr) {
    const dayLog = state.foodLog[dateStr] || [];
    return dayLog.reduce((total, item) => total + parseInt(item.calories || 0), 0);
}

// Lấy lượng calo đã nạp theo bữa ăn
function getMealCalories(dateStr, mealType) {
    const dayLog = state.foodLog[dateStr] || [];
    return dayLog
        .filter(item => item.mealType === mealType)
        .reduce((total, item) => total + parseInt(item.calories || 0), 0);
}

// --- ĐIỀU KHIỂN GIAO DIỆN (UI CONTROLLER) ---
document.addEventListener("DOMContentLoaded", () => {
    initDemoData();
    setupNavigation();
    setupDatePicker();
    setupDashboard();
    setupFoodSearch();
    setupInBodyTracker();
    setupLINEAndReports();
    setupSettings();
    checkSundayNotification();
    updateHeaderSummary();
});

// Chuyển Tab
function setupNavigation() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const targetPanelId = tab.dataset.tab;
            document.querySelectorAll(".tab-panel").forEach(panel => {
                panel.classList.remove("active");
            });
            const targetPanel = document.getElementById(targetPanelId);
            if (targetPanel) {
                targetPanel.classList.add("active");
                
                // Nếu chuyển qua tab InBody, vẽ lại biểu đồ để khớp kích thước
                if (targetPanelId === "inbody") {
                    setTimeout(renderInBodyChart, 100);
                }
            }
        });
    });
}

// Bộ chọn ngày
function setupDatePicker() {
    const datePicker = document.getElementById("selected-date-picker");
    const prevDayBtn = document.getElementById("prev-day-btn");
    const nextDayBtn = document.getElementById("next-day-btn");

    datePicker.value = state.selectedDate;

    // Lắng nghe sự thay đổi ngày
    datePicker.addEventListener("change", (e) => {
        state.selectedDate = e.target.value;
        onDateChanged();
    });

    prevDayBtn.addEventListener("click", () => {
        const d = new Date(state.selectedDate);
        d.setDate(d.getDate() - 1);
        state.selectedDate = d.toISOString().split("T")[0];
        datePicker.value = state.selectedDate;
        onDateChanged();
    });

    nextDayBtn.addEventListener("click", () => {
        const d = new Date(state.selectedDate);
        d.setDate(d.getDate() + 1);
        state.selectedDate = d.toISOString().split("T")[0];
        datePicker.value = state.selectedDate;
        onDateChanged();
    });
}

function onDateChanged() {
    updateHeaderSummary();
    renderDailyFoodLog();
    checkSundayNotification();
}

// Cập nhật các chỉ số nhanh ở Header
function updateHeaderSummary() {
    const consumed = getConsumedCalories(state.selectedDate);
    const goal = calculateCalorieGoal();
    const remaining = goal - consumed;

    // Hiển thị nhãn AI tối ưu nếu có điều chỉnh thích ứng
    const isAiAdapted = checkIsAiAdapted();
    const goalLabelBubble = document.querySelector(".header-summary .summary-bubble:nth-child(2) .label");
    if (goalLabelBubble) {
        goalLabelBubble.innerHTML = isAiAdapted ? "Mục tiêu <span style='color:var(--accent-indigo);font-weight:600;'>[AI]</span>" : "Mục tiêu";
    }

    document.getElementById("hdr-consumed").innerText = `${consumed} kcal`;
    document.getElementById("hdr-goal").innerText = `${goal} kcal`;
    
    const remDisplay = document.getElementById("hdr-remaining");
    if (remaining >= 0) {
        remDisplay.innerText = `${remaining} kcal`;
        remDisplay.style.color = "var(--accent-emerald)";
    } else {
        remDisplay.innerText = `${Math.abs(remaining)} kcal (Vượt)`;
        remDisplay.style.color = "var(--accent-rose)";
    }
}

// --- PHÂN HỆ 1 & 2: NHẬT KÝ ĂN UỐNG & THỐNG KÊ ---
function setupDashboard() {
    renderDailyFoodLog();

    // Lắng nghe sự kiện thêm món ăn thủ công
    const addCustomForm = document.getElementById("add-food-form");
    if (addCustomForm) {
        addCustomForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("food-name-input").value.trim();
            const cal = parseInt(document.getElementById("food-cal-input").value);
            const portion = document.getElementById("food-portion-input").value.trim() || "1 phần";
            const mealType = document.getElementById("food-meal-select").value;

            if (name && cal >= 0) {
                addFoodToLog(name, cal, portion, mealType);
                addCustomForm.reset();
            }
        });
    }
}

// Hiển thị danh sách thực phẩm trong ngày
function renderDailyFoodLog() {
    const dateStr = state.selectedDate;
    const consumed = getConsumedCalories(dateStr);
    const goal = calculateCalorieGoal();
    
    // Cập nhật các hộp thống kê calo
    const isAiAdapted = checkIsAiAdapted();
    const goalBoxLabel = document.querySelector("#dashboard .calorie-status-box:nth-child(1) .label");
    if (goalBoxLabel) {
        goalBoxLabel.innerHTML = isAiAdapted ? "Mục tiêu <span style='color:var(--accent-indigo);font-weight:600;'>[AI]</span>" : "Mục tiêu";
    }
    document.getElementById("stat-goal").innerText = `${goal} kcal`;
    document.getElementById("stat-consumed").innerText = `${consumed} kcal`;
    
    const statRem = document.getElementById("stat-remaining");
    const diff = goal - consumed;
    if (diff >= 0) {
        statRem.innerText = `${diff} kcal`;
        statRem.parentElement.querySelector(".label").innerText = "Còn lại nên nạp";
        statRem.style.color = "var(--accent-emerald)";
    } else {
        statRem.innerText = `${Math.abs(diff)} kcal`;
        statRem.parentElement.querySelector(".label").innerText = "Đã nạp quá mức";
        statRem.style.color = "var(--accent-rose)";
    }

    // Cập nhật Vòng tròn Calorie SVG
    const percentage = Math.min(100, Math.round((consumed / goal) * 100)) || 0;
    document.getElementById("ring-percentage").innerText = `${percentage}%`;
    document.getElementById("ring-consumed-display").innerText = `${consumed}/${goal} kcal`;
    
    const svgCircle = document.getElementById("progress-circle");
    if (svgCircle) {
        const radius = svgCircle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        svgCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        // Tính toán offset
        const offset = circumference - (Math.min(consumed, goal) / goal) * circumference;
        svgCircle.style.strokeDashoffset = offset;
        
        // Đổi màu vòng tròn nếu vượt chỉ tiêu
        if (consumed > goal) {
            svgCircle.style.stroke = "var(--accent-rose)";
        } else {
            svgCircle.style.stroke = "var(--accent-indigo)";
        }
    }

    // Hiển thị danh sách theo từng bữa ăn
    const meals = ["breakfast", "lunch", "dinner", "snack"];
    const mealDisplayNames = {
        breakfast: "Bữa sáng",
        lunch: "Bữa trưa",
        dinner: "Bữa tối",
        snack: "Bữa phụ / Ăn vặt"
    };

    meals.forEach(meal => {
        const mealLog = (state.foodLog[dateStr] || []).filter(item => item.mealType === meal);
        const mealCal = getMealCalories(dateStr, meal);
        
        // Cập nhật tiêu đề bữa ăn
        const mealBlock = document.getElementById(`meal-${meal}-block`);
        if (!mealBlock) return;

        mealBlock.querySelector(".calories").innerText = `${mealCal} kcal`;
        
        const listContainer = mealBlock.querySelector(".food-list");
        listContainer.innerHTML = "";

        if (mealLog.length === 0) {
            listContainer.innerHTML = `<div class="empty-state">Chưa ghi nhận món ăn</div>`;
        } else {
            mealLog.forEach(item => {
                const itemEl = document.createElement("div");
                itemEl.className = "food-item";
                itemEl.innerHTML = `
                    <div class="food-item-info">
                        <span class="name">${item.name}</span>
                        <span class="portion">${item.portion}</span>
                    </div>
                    <div class="food-item-actions">
                        <span class="cal">${item.calories} kcal</span>
                        <button class="btn-danger-text" onclick="deleteFoodFromLog(${item.id})">
                            ✕
                        </button>
                    </div>
                `;
                listContainer.appendChild(itemEl);
            });
        }
    });
}

// Thêm thực phẩm vào nhật ký
function addFoodToLog(name, calories, portion, mealType) {
    const dateStr = state.selectedDate;
    if (!state.foodLog[dateStr]) {
        state.foodLog[dateStr] = [];
    }

    const newItem = {
        id: Date.now(),
        name,
        calories,
        portion,
        mealType
    };

    state.foodLog[dateStr].push(newItem);
    saveToLocalStorage("foodLog", state.foodLog);
    
    // Đồng bộ lại UI
    onDateChanged();
}

// Xóa thực phẩm khỏi nhật ký
window.deleteFoodFromLog = function(id) {
    const dateStr = state.selectedDate;
    if (!state.foodLog[dateStr]) return;

    state.foodLog[dateStr] = state.foodLog[dateStr].filter(item => item.id !== id);
    saveToLocalStorage("foodLog", state.foodLog);
    
    onDateChanged();
};

// Tra cứu nhanh (Search Autocomplete) thực phẩm
function setupFoodSearch() {
    const searchInput = document.getElementById("food-name-input");
    const suggestionsBox = document.getElementById("search-suggestions");
    const calInput = document.getElementById("food-cal-input");
    const portionInput = document.getElementById("food-portion-input");

    if (!searchInput || !suggestionsBox) return;

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        suggestionsBox.innerHTML = "";
        
        if (!query) {
            suggestionsBox.style.display = "none";
            return;
        }

        // Tìm kiếm các món ăn trong cơ sở dữ liệu mặc định
        const matches = window.defaultFoodDatabase.filter(food => 
            food.name.toLowerCase().includes(query)
        ).slice(0, 5); // Tối đa 5 kết quả gợi ý

        if (matches.length === 0) {
            suggestionsBox.style.display = "none";
            return;
        }

        suggestionsBox.style.display = "block";
        matches.forEach(food => {
            const item = document.createElement("div");
            item.className = "suggestion-item";
            item.innerHTML = `
                <span>${food.name}</span>
                <span class="item-cal">${food.calories} kcal (${food.unit})</span>
            `;
            item.addEventListener("click", () => {
                searchInput.value = food.name;
                calInput.value = food.calories;
                portionInput.value = food.unit;
                suggestionsBox.style.display = "none";
            });
            suggestionsBox.appendChild(item);
        });
    });

    // Ẩn hộp gợi ý khi click ra ngoài
    document.addEventListener("click", (e) => {
        if (e.target !== searchInput) {
            suggestionsBox.style.display = "none";
        }
    });
}


// --- PHÂN HỆ 5 & 6: THEO DÕI CHỈ SỐ INBODY & ĐỀ XUẤT TUẦN KẾ ---

// Biến lưu tạm ảnh đã upload và kết quả phân tích
let inbodyImageDataUrl = null;
let inbodyAnalysisResult = null;

function setupInBodyTracker() {
    renderInBodyHistoryTable();
    setupInBodyImageUpload();

    // Xử lý sự kiện gửi form InBody
    const inbodyForm = document.getElementById("inbody-form");
    if (inbodyForm) {
        inbodyForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const date = document.getElementById("inbody-date-input").value;
            const weight = parseFloat(document.getElementById("inbody-weight-input").value);
            const fat = parseFloat(document.getElementById("inbody-fat-input").value);
            const muscle = parseFloat(document.getElementById("inbody-muscle-input").value);

            if (date && weight > 0 && fat >= 0 && muscle >= 0) {
                state.inbodyHistory = state.inbodyHistory.filter(item => item.date !== date);

                state.inbodyHistory.push({
                    id: Date.now(),
                    date,
                    weight: weight.toFixed(1),
                    bodyFat: fat.toFixed(1),
                    muscleMass: muscle.toFixed(1),
                    imageUrl: inbodyImageDataUrl || null  // lưu kèm ảnh nếu có
                });

                state.inbodyHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
                saveToLocalStorage("inbodyHistory", state.inbodyHistory);

                // Reset form & ảnh
                inbodyForm.reset();
                document.getElementById("inbody-date-input").value = new Date().toISOString().split("T")[0];
                resetInBodyImageUpload();

                renderInBodyHistoryTable();
                renderInBodyChart();
                checkSundayNotification();
            }
        });
    }

    // Đặt ngày mặc định là hôm nay
    const ibDate = document.getElementById("inbody-date-input");
    if (ibDate) ibDate.value = new Date().toISOString().split("T")[0];

    // Nút kích hoạt đề xuất tuần mới
    const generateBtn = document.getElementById("generate-plan-btn");
    if (generateBtn) {
        generateBtn.addEventListener("click", () => generateNextWeekPlan());
    }

    renderWeeklyPlanUI();
}

// Khởi tạo toàn bộ logic upload ảnh InBody
function setupInBodyImageUpload() {
    const uploadZone  = document.getElementById("inbody-upload-zone");
    const imageInput  = document.getElementById("inbody-image-input");
    const previewWrap = document.getElementById("inbody-image-preview-wrap");
    const previewImg  = document.getElementById("inbody-image-preview");
    const removeBtn   = document.getElementById("remove-image-btn");
    const analyzeBtn  = document.getElementById("analyze-inbody-btn");
    const resultPanel = document.getElementById("analysis-result-panel");
    const applyBtn    = document.getElementById("apply-analysis-btn");

    if (!uploadZone || !imageInput) return;

    // --- Chọn file qua input ---
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) loadInBodyImage(file);
    });

    // --- Drag & Drop ---
    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("dragover");
    });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
    uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) loadInBodyImage(file);
    });

    // --- Xóa ảnh ---
    removeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        resetInBodyImageUpload();
    });

    // --- Phân tích ảnh ---
    analyzeBtn.addEventListener("click", () => analyzeInBodyImage());

    // --- Áp dụng kết quả vào form ---
    applyBtn.addEventListener("click", () => {
        if (!inbodyAnalysisResult) return;
        const r = inbodyAnalysisResult;
        if (r.weight)  document.getElementById("inbody-weight-input").value = r.weight;
        if (r.bodyFat) document.getElementById("inbody-fat-input").value   = r.bodyFat;
        if (r.muscle)  document.getElementById("inbody-muscle-input").value = r.muscle;

        // Cuộn xuống form
        document.getElementById("inbody-form").scrollIntoView({ behavior: "smooth", block: "start" });

        // Flash hiệu ứng các ô đã điền
        ["inbody-weight-input", "inbody-fat-input", "inbody-muscle-input"].forEach(id => {
            const el = document.getElementById(id);
            el.style.transition = "box-shadow 0.3s";
            el.style.boxShadow  = "0 0 0 3px rgba(99,102,241,0.5)";
            setTimeout(() => { el.style.boxShadow = ""; }, 1500);
        });
    });
}

// Đọc file ảnh → base64 và hiển thị preview
function loadInBodyImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        inbodyImageDataUrl = e.target.result;

        const previewWrap = document.getElementById("inbody-image-preview-wrap");
        const previewImg  = document.getElementById("inbody-image-preview");
        const uploadZone  = document.getElementById("inbody-upload-zone");
        const analyzeBtn  = document.getElementById("analyze-inbody-btn");
        const resultPanel = document.getElementById("analysis-result-panel");

        previewImg.src = inbodyImageDataUrl;
        previewWrap.style.display = "block";
        uploadZone.style.display  = "none";
        analyzeBtn.style.display  = "flex";
        resultPanel.style.display = "none";
        inbodyAnalysisResult = null;
    };
    reader.readAsDataURL(file);
}

// Reset toàn bộ trạng thái upload
function resetInBodyImageUpload() {
    inbodyImageDataUrl   = null;
    inbodyAnalysisResult = null;

    const previewWrap = document.getElementById("inbody-image-preview-wrap");
    const previewImg  = document.getElementById("inbody-image-preview");
    const uploadZone  = document.getElementById("inbody-upload-zone");
    const analyzeBtn  = document.getElementById("analyze-inbody-btn");
    const resultPanel = document.getElementById("analysis-result-panel");
    const imageInput  = document.getElementById("inbody-image-input");

    if (previewImg)  previewImg.src = "";
    if (previewWrap) previewWrap.style.display = "none";
    if (uploadZone)  uploadZone.style.display  = "";
    if (analyzeBtn)  analyzeBtn.style.display  = "none";
    if (resultPanel) resultPanel.style.display = "none";
    if (imageInput)  imageInput.value = "";
}

// Phân tích ảnh InBody (AI simulation)
function analyzeInBodyImage() {
    if (!inbodyImageDataUrl) return;

    const analyzeBtn    = document.getElementById("analyze-inbody-btn");
    const btnText       = document.getElementById("analyze-btn-text");
    const resultPanel   = document.getElementById("analysis-result-panel");
    const resultBody    = document.getElementById("analysis-result-body");

    // Hiện spinner loading
    btnText.innerHTML = `<span class="analyze-spinner"></span> Đang phân tích ảnh...`;
    analyzeBtn.disabled = true;

    // Giả lập thời gian xử lý AI (1.8 giây)
    setTimeout(() => {
        // Trích xuất giá trị giả lập từ ảnh InBody
        // Trong môi trường thật, đây là nơi gọi Vision API (Google Vision / OpenAI GPT-4o)
        inbodyAnalysisResult = extractInBodyValuesFromImage();

        // Render kết quả
        const r = inbodyAnalysisResult;
        resultBody.innerHTML = `
            <div class="analysis-row highlight">
                <span class="row-label">⚖️ Cân nặng</span>
                <span class="row-value">${r.weight} kg</span>
            </div>
            <div class="analysis-row">
                <span class="row-label">🔥 Tỷ lệ mỡ</span>
                <span class="row-value" style="color:var(--accent-rose)">${r.bodyFat}%</span>
            </div>
            <div class="analysis-row">
                <span class="row-label">💪 Cơ xương</span>
                <span class="row-value" style="color:var(--accent-emerald)">${r.muscle} kg</span>
            </div>
            <div class="analysis-row">
                <span class="row-label">💧 Nước cơ thể</span>
                <span class="row-value">${r.bodyWater} lít</span>
            </div>
            <div class="analysis-row">
                <span class="row-label">🦴 Khoáng xương</span>
                <span class="row-value">${r.bone} kg</span>
            </div>
            <div class="analysis-row">
                <span class="row-label">📊 Chỉ số BMI</span>
                <span class="row-value">${r.bmi}</span>
            </div>
            <div class="analysis-notes">
                💡 <strong>Nhận xét AI:</strong> ${r.note}
            </div>
        `;

        resultPanel.style.display = "block";

        // Reset nút
        btnText.innerHTML = `🔍 Phân tích lại`;
        analyzeBtn.disabled = false;
    }, 1800);
}

// Trích xuất dữ liệu từ ảnh InBody — Simulation thông minh
// Trong triển khai thật: gọi Google Cloud Vision OCR + regex để đọc số trực tiếp từ ảnh
function extractInBodyValuesFromImage() {
    // Lấy thông tin cá nhân để tạo kết quả phân tích hợp lý
    const info    = state.personalInfo;
    const baseW   = parseFloat(info.weight) || 68;
    const history = state.inbodyHistory;

    // Nếu có lịch sử, dựa vào lần đo gần nhất để tạo biến động thực tế
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;
    const lastW   = lastEntry ? parseFloat(lastEntry.weight)    : baseW;
    const lastFat = lastEntry ? parseFloat(lastEntry.bodyFat)   : 22.0;
    const lastMu  = lastEntry ? parseFloat(lastEntry.muscleMass): 30.0;

    // Sinh giá trị thay đổi ngẫu nhiên (±0.3 đến ±0.8 kg) giống thực tế
    const rnd  = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(1));
    const sign = () => Math.random() > 0.35 ? -1 : 1; // 65% xu hướng giảm

    const weight   = parseFloat((lastW   + sign() * rnd(0.2, 0.8)).toFixed(1));
    const bodyFat  = parseFloat((lastFat + sign() * rnd(0.1, 0.5)).toFixed(1));
    const muscle   = parseFloat((lastMu  + (sign() === -1 ? rnd(0.0, 0.2) : -rnd(0.0, 0.1))).toFixed(1));
    const bodyWater= parseFloat((weight * 0.60).toFixed(1));
    const bone     = parseFloat((weight * 0.043).toFixed(1));
    const bmi      = parseFloat((weight / Math.pow((info.height || 170) / 100, 2)).toFixed(1));

    // Nhận xét tự động dựa trên biến động
    const wDiff = weight - lastW;
    let note = "";
    if (wDiff < -0.5)      note = `Cân nặng giảm ${Math.abs(wDiff).toFixed(1)} kg so với lần đo trước. Tiến độ giảm cân đang rất tốt! Duy trì chế độ ăn và luyện tập hiện tại.`;
    else if (wDiff < 0)    note = `Cân nặng giảm nhẹ ${Math.abs(wDiff).toFixed(1)} kg. Hãy tiếp tục kiên trì — kết quả tích lũy theo tuần.`;
    else if (wDiff === 0)  note = `Cân nặng giữ nguyên. Xem xét tăng cường vận động hoặc điều chỉnh nhẹ chế độ ăn.`;
    else                   note = `Cân nặng tăng ${wDiff.toFixed(1)} kg. Hệ thống AI đang tự động điều chỉnh mức Calo khuyến nghị cho tuần tới.`;

    return { weight, bodyFat, muscle, bodyWater, bone, bmi, note };
}

// Kiểm tra lời nhắc cập nhật InBody vào Chủ Nhật
function checkSundayNotification() {
    const today = new Date(state.selectedDate);
    const isSunday = today.getDay() === 0;
    const reminderBox = document.getElementById("sunday-reminder");
    
    if (!reminderBox) return;

    if (isSunday) {
        // Kiểm tra xem trong ngày hôm nay đã có chỉ số InBody được cập nhật chưa
        const todayStr = today.toISOString().split("T")[0];
        const hasTodayRecord = state.inbodyHistory.some(item => item.date === todayStr);

        if (!hasTodayRecord) {
            reminderBox.style.display = "flex";
            return;
        }
    }
    reminderBox.style.display = "none";
}

// Đi đến Tab InBody khi ấn vào lời nhắc
window.goToInBodyTab = function() {
    const inbodyTab = document.querySelector('[data-tab="inbody"]');
    if (inbodyTab) {
        inbodyTab.click();
    }
};

// Hiển thị lịch sử InBody dạng bảng (có thumbnail ảnh)
function renderInBodyHistoryTable() {
    const tableBody = document.querySelector("#inbody-table tbody");
    const tableHead = document.querySelector("#inbody-table thead tr");
    if (!tableBody) return;

    // Cập nhật header — thêm cột Ảnh nếu chưa có
    if (tableHead && !document.getElementById("inbody-th-image")) {
        const thImg = document.createElement("th");
        thImg.id = "inbody-th-image";
        thImg.textContent = "Ảnh";
        tableHead.insertBefore(thImg, tableHead.firstChild);
    }

    tableBody.innerHTML = "";

    if (state.inbodyHistory.length === 0) {
        const colspan = tableHead ? tableHead.children.length : 6;
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state" style="text-align:center;">Chưa có lịch sử đo InBody — hãy upload ảnh phiếu hoặc nhập thủ công bên trên</td></tr>`;
        return;
    }

    // Hiển thị từ mới nhất đến cũ nhất
    [...state.inbodyHistory].reverse().forEach(item => {
        const tr = document.createElement("tr");

        // Cột ảnh thumbnail (hoặc dấu gạch nếu không có ảnh)
        const tdImg = document.createElement("td");
        if (item.imageUrl) {
            const thumb = document.createElement("img");
            thumb.src       = item.imageUrl;
            thumb.alt       = "Phiếu InBody";
            thumb.className = "inbody-thumb";
            thumb.title     = "Nhấp để xem ảnh to";
            thumb.addEventListener("click", () => openLightbox(item.imageUrl));
            tdImg.appendChild(thumb);
        } else {
            tdImg.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem;">—</span>`;
        }
        tr.appendChild(tdImg);

        // Các cột dữ liệu
        tr.insertAdjacentHTML("beforeend", `
            <td>${formatDateVN(item.date)}</td>
            <td><strong>${item.weight}</strong> kg</td>
            <td style="color:var(--accent-rose)">${item.bodyFat}%</td>
            <td style="color:var(--accent-emerald)">${item.muscleMass} kg</td>
            <td>
                <button class="btn-danger-text" onclick="deleteInBodyRecord(${item.id})" title="Xóa bản ghi">✕</button>
            </td>
        `);

        tableBody.appendChild(tr);
    });

    // Cập nhật các chỉ số nhanh ở header InBody
    const latest = state.inbodyHistory[state.inbodyHistory.length - 1];
    if (latest) {
        document.getElementById("latest-weight").innerText = `${latest.weight} kg`;
        document.getElementById("latest-fat").innerText    = `${latest.bodyFat}%`;
        document.getElementById("latest-muscle").innerText = `${latest.muscleMass} kg`;
    }
}

// Lightbox xem ảnh to
function openLightbox(imageUrl) {
    // Xóa lightbox cũ nếu đang mở
    const existing = document.getElementById("inbody-lightbox");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "inbody-lightbox";
    overlay.className = "lightbox-overlay";
    overlay.innerHTML = `
        <button class="lightbox-close" title="Đóng">✕</button>
        <img src="${imageUrl}" alt="Phiếu InBody">
    `;

    // Đóng khi click nền hoặc nút X
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay || e.target.classList.contains("lightbox-close")) {
            overlay.remove();
        }
    });

    document.body.appendChild(overlay);
}

// Xóa bản ghi InBody
window.deleteInBodyRecord = function(id) {
    state.inbodyHistory = state.inbodyHistory.filter(item => item.id !== id);
    saveToLocalStorage("inbodyHistory", state.inbodyHistory);
    renderInBodyHistoryTable();
    renderInBodyChart();
    checkSundayNotification();
};

// Vẽ biểu đồ InBody bằng Canvas
function renderInBodyChart() {
    const canvas = document.getElementById("inbody-trend-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;
    
    // Tự động scale canvas theo độ rộng container để nét vẽ sắc sảo
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    const history = state.inbodyHistory;
    if (history.length < 2) {
        // Không đủ dữ liệu vẽ đường xu hướng
        ctx.fillStyle = "#6b7280";
        ctx.font = "14px 'Outfit', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Nhập tối thiểu 2 bản ghi InBody để vẽ đường xu hướng", width / 2, height / 2);
        return;
    }

    // Thiết lập biên và khoảng cách vẽ đồ thị
    const padding = { top: 30, right: 40, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Tìm giá trị min/max để scale tọa độ
    const weights = history.map(h => parseFloat(h.weight));
    const fats = history.map(h => parseFloat(h.bodyFat));

    const minWeight = Math.floor(Math.min(...weights) - 1);
    const maxWeight = Math.ceil(Math.max(...weights) + 1);
    const minFat = Math.floor(Math.min(...fats) - 1);
    const maxFat = Math.ceil(Math.max(...fats) + 1);

    const pointsCount = history.length;
    const xStep = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

    // Hàm quy đổi giá trị sang trục Y đồ thị
    const getY = (val, min, max) => {
        return padding.top + chartHeight - ((val - min) / (max - min)) * chartHeight;
    };

    // --- Vẽ lưới tọa độ ngang ---
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px 'Outfit', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Nhãn trục Y bên trái (Cân nặng)
        const wVal = maxWeight - ((maxWeight - minWeight) / gridLines) * i;
        ctx.fillText(`${wVal.toFixed(1)}kg`, padding.left - 8, y);
    }

    // --- Vẽ trục X (Ngày đo) ---
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#9ca3af";
    
    history.forEach((item, index) => {
        const x = padding.left + index * xStep;
        
        // Đường dọc mờ
        ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();

        // Chữ nhãn ngày
        const labelDate = new Date(item.date);
        const labelStr = `${labelDate.getDate()}/${labelDate.getMonth() + 1}`;
        ctx.fillText(labelStr, x, padding.top + chartHeight + 8);
    });

    // --- Vẽ đường xu hướng Cân nặng (Weight) - Indigo ---
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    history.forEach((item, index) => {
        const x = padding.left + index * xStep;
        const y = getY(parseFloat(item.weight), minWeight, maxWeight);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Vẽ chấm tròn Cân nặng
    ctx.fillStyle = "#6366f1";
    ctx.strokeStyle = "#0b0f19";
    ctx.lineWidth = 2;
    history.forEach((item, index) => {
        const x = padding.left + index * xStep;
        const y = getY(parseFloat(item.weight), minWeight, maxWeight);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // --- Vẽ đường xu hướng Tỷ lệ mỡ (Body Fat) - Rose ---
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    history.forEach((item, index) => {
        const x = padding.left + index * xStep;
        const y = getY(parseFloat(item.bodyFat), minFat, maxFat);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Vẽ chấm tròn Tỷ lệ mỡ
    ctx.fillStyle = "#f43f5e";
    ctx.strokeStyle = "#0b0f19";
    ctx.lineWidth = 2;
    history.forEach((item, index) => {
        const x = padding.left + index * xStep;
        const y = getY(parseFloat(item.bodyFat), minFat, maxFat);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });

    // --- Chú thích biểu đồ (Legend) ---
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "11px 'Outfit', sans-serif";

    // Legend Cân nặng
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(padding.left + 10, padding.top - 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3f4f6";
    ctx.fillText("Cân nặng (kg)", padding.left + 20, padding.top - 15);

    // Legend Mỡ
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(padding.left + 130, padding.top - 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3f4f6";
    ctx.fillText("Tỷ lệ mỡ (%)", padding.left + 140, padding.top - 15);
}

// --- THUẬT TOÁN ĐỀ XUẤT KẾ HOẠCH DINH DƯỠNG TUẦN TỚI ---
function generateNextWeekPlan() {
    const history = state.inbodyHistory;
    if (history.length < 1) {
        alert("Vui lòng cập nhật ít nhất 1 bản ghi InBody trước khi yêu cầu đề xuất kế hoạch.");
        return;
    }

    const latest = history[history.length - 1];
    const prev = history.length >= 2 ? history[history.length - 2] : null;

    // Calo nền tảng (TDEE deficit tiêu chuẩn)
    const baseCal = calculateCalorieGoal();
    let analysisMsg = "";
    let recommendations = [];
    let adjustment = 0; // Điều chỉnh calo khuyến nghị thêm

    if (prev) {
        const wDiff = parseFloat(latest.weight) - parseFloat(prev.weight);
        const fDiff = parseFloat(latest.bodyFat) - parseFloat(prev.bodyFat);
        const mDiff = parseFloat(latest.muscleMass) - parseFloat(prev.muscleMass);

        analysisMsg = `Phân tích tiến độ (so với tuần trước): Cân nặng ${wDiff > 0 ? '+' : ''}${wDiff.toFixed(1)}kg, Tỷ lệ mỡ ${fDiff > 0 ? '+' : ''}${fDiff.toFixed(1)}%, Khối lượng cơ ${mDiff > 0 ? '+' : ''}${mDiff.toFixed(1)}kg.`;

        if (wDiff < -0.4 && wDiff >= -1.0) {
            // Giảm cân an toàn hiệu quả
            analysisMsg += " Tiến độ giảm cân của bạn đang cực kỳ lý tưởng và an toàn.";
            recommendations.push("Duy trì lượng calo thâm hụt hiện tại vì cơ thể đang đáp ứng rất tốt.");
            recommendations.push("Tiếp tục rèn luyện thể lực 3-4 buổi/tuần để duy trì cơ bắp.");
        } else if (wDiff < -1.0) {
            // Giảm cân quá nhanh (nguy cơ mất cơ xương)
            analysisMsg += " Bạn đang giảm cân hơi nhanh. Hãy cẩn thận để tránh mất cơ xương.";
            adjustment = 150; // Tăng calo lên một chút cho an toàn
            recommendations.push("Tăng nhẹ calo (+150 kcal/ngày) để giảm tốc độ xuống mức an toàn, bảo vệ cơ bắp.");
            recommendations.push("Tăng tỷ lệ Protein nạp vào để giữ cơ.");
        } else if (wDiff >= 0 || fDiff > 0) {
            // Chững cân hoặc tăng mỡ
            analysisMsg += " Cân nặng đang chững hoặc tỷ lệ mỡ tăng nhẹ. Hãy tối ưu hóa trao đổi chất.";
            adjustment = -100; // Giảm calo nhẹ hoặc áp dụng Carb Cycling
            recommendations.push("Áp dụng phương pháp Carb-Cycling (Xoay vòng tinh bột) để kích thích trao đổi chất.");
            recommendations.push("Giảm nhẹ calo tiêu thụ trung bình xuống 100 kcal để gia tăng thâm hụt.");
            recommendations.push("Tăng cường các bài tập Cardio hoặc kháng lực cường độ cao hơn.");
        } else if (wDiff < 0 && mDiff < -0.2) {
            // Giảm cân nhưng mất nhiều cơ
            analysisMsg += " Bạn đang giảm cân nhưng bị sụt giảm lượng cơ xương đáng lo ngại.";
            adjustment = 100;
            recommendations.push("Tăng lượng đạm (Protein) lên tối thiểu 1.8g/kg trọng lượng cơ thể.");
            recommendations.push("Giảm bớt thời lượng Cardio kéo dài, chuyển sang tập tạ (kháng lực).");
        }
    } else {
        analysisMsg = `Phân tích chỉ số hiện tại: Cân nặng ${latest.weight}kg, Mỡ ${latest.bodyFat}%, Cơ ${latest.muscleMass}kg. Hệ thống bắt đầu thiết kế chu kỳ calo tối ưu cho bạn.`;
        recommendations.push("Bắt đầu tuần đầu tiên với phương pháp thâm hụt calo thích ứng.");
        recommendations.push("Theo dõi sát sao cân nặng và mỡ cơ thể vào mỗi Chủ Nhật.");
        recommendations.push("Đảm bảo uống đủ 2-2.5 lít nước mỗi ngày để hỗ trợ chuyển hóa chất béo.");
    }

    // Tạo kế hoạch Carb-Cycling (Xoay vòng calo) 7 ngày cho tuần tới
    // Phân bổ:
    // Thứ 2: Low-Carb (Calo thấp)
    // Thứ 3: Medium-Carb (Calo vừa)
    // Thứ 4: Low-Carb (Calo thấp)
    // Thứ 5: Medium-Carb (Calo vừa)
    // Thứ 6: Low-Carb (Calo thấp)
    // Thứ 7: High-Carb/Refeed (Calo cao, nạp năng lượng)
    // Chủ Nhật: Medium-Carb (Calo vừa)

    const targetBase = baseCal + adjustment;
    const daysData = [
        { day: "Thứ hai", type: "low", cal: Math.round(targetBase - 150), carbs: "100g", protein: "125g", fat: "40g" },
        { day: "Thứ ba", type: "medium", cal: Math.round(targetBase), carbs: "150g", protein: "120g", fat: "45g" },
        { day: "Thứ tư", type: "low", cal: Math.round(targetBase - 150), carbs: "100g", protein: "125g", fat: "40g" },
        { day: "Thứ năm", type: "medium", cal: Math.round(targetBase), carbs: "150g", protein: "120g", fat: "45g" },
        { day: "Thứ sáu", type: "low", cal: Math.round(targetBase - 150), carbs: "100g", protein: "125g", fat: "40g" },
        { day: "Thứ bảy", type: "high", cal: Math.round(targetBase + 250), carbs: "220g", protein: "115g", fat: "50g" },
        { day: "Chủ nhật", type: "medium", cal: Math.round(targetBase), carbs: "150g", protein: "120g", fat: "45g" }
    ];

    state.weeklyPlan = {
        weekStartDate: new Date().toISOString().split("T")[0],
        analysis: analysisMsg,
        recommendations: recommendations,
        days: daysData
    };

    saveToLocalStorage("weeklyPlan", state.weeklyPlan);
    renderWeeklyPlanUI();
}

// Hiển thị kế hoạch tuần trên giao diện
function renderWeeklyPlanUI() {
    const container = document.getElementById("weekly-plan-container");
    if (!container) return;

    if (!state.weeklyPlan) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 3rem 0; text-align: center; font-size: 1rem;">
                <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">Chưa có kế hoạch đề xuất cho tuần tới.</p>
                <button class="btn btn-primary" id="generate-plan-btn-empty" onclick="generateNextWeekPlan()">
                    <span style="font-size: 1.1rem;">⚡</span> Phân tích & Tự động đề xuất kế hoạch tuần tới
                </button>
            </div>
        `;
        return;
    }

    const { analysis, recommendations, days } = state.weeklyPlan;

    // Loại nhãn hiển thị
    const typeNames = {
        low: "Calo Thấp (Low)",
        medium: "Calo Vừa (Medium)",
        high: "Calo Cao (Refeed)"
    };

    let daysHtml = "";
    days.forEach(d => {
        daysHtml += `
            <div class="day-plan-card">
                <div class="day-name">${d.day}</div>
                <span class="day-type ${d.type}">${typeNames[d.type]}</span>
                <div class="day-cal">${d.cal} kcal</div>
                <div class="day-macros">
                    P: ${d.protein}<br>
                    C: ${d.carbs}<br>
                    F: ${d.fat}
                </div>
            </div>
        `;
    });

    let recsHtml = "";
    recommendations.forEach(r => {
        recsHtml += `<li>${r}</li>`;
    });

    container.innerHTML = `
        <div class="recommendation-banner">
            <span class="recommendation-banner-icon">💡</span>
            <div class="recommendation-banner-text">
                <h3>Phân tích dữ liệu & Tối ưu hóa chuyển hóa</h3>
                <p>${analysis}</p>
            </div>
        </div>

        <h4 style="margin-bottom: 1rem; font-weight: 600; font-size: 1.1rem;">Kế hoạch Calorie Cycling 7 ngày sắp tới</h4>
        <div class="week-plan-grid">
            ${daysHtml}
        </div>

        <div class="rec-advice-box">
            <h4>Khuyến khuyến nghị dinh dưỡng & vận động hỗ trợ giảm mỡ</h4>
            <ul class="rec-advice-list">
                ${recsHtml}
                <li>Nên ưu tiên nạp carbs phức hợp (khoai lang, yến mạch, cơm gạo lứt) vào những ngày Calo Cao (Refeed) để tích trữ glycogen cơ bắp hiệu quả.</li>
                <li>Uống một cốc nước lọc lớn ngay khi thức dậy và duy trì đủ lượng nước để hỗ trợ gan chuyển hóa mỡ thừa.</li>
            </ul>
        </div>
    `;
}


// --- PHÂN HỆ 3 & 4: XUẤT BÁO CÁO EXCEL VÀ GỬI THÔNG BÁO QUA LINE ---
function setupLINEAndReports() {
    // Lưu cấu hình token LINE Notify
    const tokenInput = document.getElementById("line-token-input");
    const saveTokenBtn = document.getElementById("save-line-token");

    if (tokenInput && saveTokenBtn) {
        tokenInput.value = state.lineConfig.token || "";
        
        saveTokenBtn.addEventListener("click", () => {
            state.lineConfig.token = tokenInput.value.trim();
            saveToLocalStorage("lineConfig", state.lineConfig);
            alert("Đã lưu cấu hình LINE Notify Token thành công.");
        });
    }

    // Lắng nghe sự kiện xuất file Excel (CSV UTF-8)
    const exportBtn = document.getElementById("export-excel-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            exportDailyReportExcel(state.selectedDate);
        });
    }

    // Lắng nghe sự kiện gửi LINE (mô phỏng hoặc thật)
    const sendLineBtn = document.getElementById("send-line-btn");
    if (sendLineBtn) {
        sendLineBtn.addEventListener("click", () => {
            triggerLINENotification();
        });
    }

    // Thiết lập giả lập nhập tin nhắn trong điện thoại
    const phoneSendBtn = document.querySelector(".smartphone-send-btn");
    const phoneInput = document.querySelector(".smartphone-input");
    if (phoneSendBtn && phoneInput) {
        phoneSendBtn.addEventListener("click", () => {
            const val = phoneInput.value.trim();
            if (val) {
                appendUserMessageToSimulator(val);
                phoneInput.value = "";
                
                // Trả lời tự động giả lập sau 1 giây
                setTimeout(() => {
                    handleSimulatorAutoReply(val);
                }, 1000);
            }
        });
        
        phoneInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                phoneSendBtn.click();
            }
        });
    }
}

// Hàm xuất báo cáo Excel (CSV UTF-8 với BOM hỗ trợ tiếng Việt)
function exportDailyReportExcel(dateStr) {
    const dayLog = state.foodLog[dateStr] || [];
    if (dayLog.length === 0) {
        alert(`Không có dữ liệu dinh dưỡng để xuất báo cáo cho ngày ${formatDateVN(dateStr)}.`);
        return;
    }

    const goal = calculateCalorieGoal();
    const consumed = getConsumedCalories(dateStr);
    const diff = goal - consumed;

    // Xây dựng nội dung CSV
    let csvContent = "";
    
    // Header báo cáo
    csvContent += `BÁO CÁO DINH DƯỠNG HẰNG NGÀY,,,\n`;
    csvContent += `Ngày theo dõi: ${formatDateVN(dateStr)},,,\n`;
    csvContent += `Calo tiêu thụ mục tiêu: ${goal} kcal,,,\n`;
    csvContent += `Tổng calo đã nạp: ${consumed} kcal,,,\n`;
    csvContent += `Chênh lệch: ${diff >= 0 ? 'Dưới mục tiêu thâm hụt ' + diff : 'Vượt quá thâm hụt ' + Math.abs(diff)} kcal,,,\n\n`;

    // Tiêu đề bảng thực phẩm
    csvContent += `Bữa ăn,Tên món ăn,Khẩu phần/Khối lượng,Lượng Calo (kcal)\n`;

    const mealNames = {
        breakfast: "Bữa sáng",
        lunch: "Bữa trưa",
        dinner: "Bữa tối",
        snack: "Ăn vặt"
    };

    // Đổ dữ liệu từng bữa
    ["breakfast", "lunch", "dinner", "snack"].forEach(meal => {
        const items = dayLog.filter(i => i.mealType === meal);
        if (items.length > 0) {
            items.forEach(item => {
                csvContent += `"${mealNames[meal]}","${item.name.replace(/"/g, '""')}","${item.portion.replace(/"/g, '""')}",${item.calories}\n`;
            });
        }
    });

    csvContent += `\nTỔNG CALO NẠP TRONG NGÀY,,,${consumed} kcal\n`;

    // Tạo blob dữ liệu CSV và đính kèm UTF-8 BOM
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_dinh_duong_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Xử lý gửi thông báo qua LINE
function triggerLINENotification() {
    const dateStr = state.selectedDate;
    const dayLog = state.foodLog[dateStr] || [];
    const goal = calculateCalorieGoal();
    const consumed = getConsumedCalories(dateStr);
    const remaining = goal - consumed;

    // Tạo thông điệp báo cáo tóm tắt
    let messageText = `📊 BÁO CÁO DINH DƯỠNG (${formatDateVN(dateStr)})\n\n`;
    messageText += `🔥 Mục tiêu: ${goal} kcal\n`;
    messageText += `🍽️ Đã nạp: ${consumed} kcal\n`;
    
    if (remaining >= 0) {
        messageText += `✅ Bạn còn lại ${remaining} kcal có thể nạp trong ngày.\n\n`;
    } else {
        messageText += `⚠️ Bạn đã vượt quá mục tiêu thâm hụt ${Math.abs(remaining)} kcal.\n\n`;
    }

    messageText += `Chi tiết các bữa ăn:\n`;
    const breakfastCal = getMealCalories(dateStr, "breakfast");
    const lunchCal = getMealCalories(dateStr, "lunch");
    const dinnerCal = getMealCalories(dateStr, "dinner");
    const snackCal = getMealCalories(dateStr, "snack");

    if (breakfastCal > 0) messageText += `🍳 Sáng: ${breakfastCal} kcal\n`;
    if (lunchCal > 0) messageText += `🍱 Trưa: ${lunchCal} kcal\n`;
    if (dinnerCal > 0) messageText += `🍲 Tối: ${dinnerCal} kcal\n`;
    if (snackCal > 0) messageText += `🍎 Phụ: ${snackCal} kcal\n`;

    if (dayLog.length === 0) {
        messageText += `(Chưa ghi nhận thực phẩm hôm nay)`;
    }

    // 1. Thực hiện gửi thật qua LINE Notify nếu có Token
    if (state.lineConfig.token) {
        sendRealLineNotify(state.lineConfig.token, messageText);
    }

    // 2. Luôn kích hoạt Simulator giả lập trên giao diện để trực quan hóa
    appendSystemMessageToSimulator(messageText, dateStr);
}

// Gửi thật qua API LINE Notify
function sendRealLineNotify(token, message) {
    // Do cơ chế CORS của trình duyệt có thể chặn cuộc gọi trực tiếp đến LINE Notify từ client-side,
    // chúng tôi sử dụng kỹ thuật fetch và xử lý thông báo lỗi đẹp mắt cho người dùng.
    const url = "https://notify-api.line.me/api/notify";
    
    // Tạo form data theo đặc tả API LINE Notify
    const params = new URLSearchParams();
    params.append("message", message);

    fetch(url, {
        method: "POST",
        mode: "no-cors", // Thiết lập no-cors để gửi tin đi (LINE nhận được nhưng trình duyệt không đọc được response)
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${token}`
        },
        body: params
    })
    .then(() => {
        alert("Đã kích hoạt gửi lệnh qua LINE Notify API. Vui lòng kiểm tra điện thoại của bạn.");
    })
    .catch((err) => {
        console.error("Lỗi CORS gửi LINE Notify trực tiếp:", err);
        alert("Có lỗi kết nối. Hãy đảm bảo Token của bạn chính xác hoặc sử dụng proxy gửi tin.");
    });
}

// Thêm tin nhắn hệ thống gửi vào LINE Simulator
function appendSystemMessageToSimulator(text, dateStr) {
    const chatArea = document.getElementById("line-chat-box");
    if (!chatArea) return;

    // Phát âm thanh beep tin nhắn LINE nhận bằng Web Audio API cực xịn
    playLineBeepSound();

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgHtml = `
        <div class="line-message">
            <div class="line-avatar">Nutri</div>
            <div class="line-bubble-wrapper">
                <span class="line-sender-name">Trợ lý Dinh dưỡng</span>
                <div class="line-bubble">${text}</div>
                <div class="line-bubble rich" style="margin-top: 5px;">
                    <div class="line-rich-header">BÁO CÁO DINH DƯỠNG FILE EXCEL</div>
                    <div class="line-rich-body">
                        Tệp chi tiết: Bao_cao_dinh_duong_${dateStr}.xlsx<br>
                        Nhấn để tải báo cáo Excel tổng hợp thực phẩm.
                    </div>
                    <div class="line-rich-action" onclick="exportDailyReportExcel('${dateStr}')">Tải Excel 📥</div>
                </div>
            </div>
            <span class="line-message-time">${timeStr}</span>
        </div>
    `;

    chatArea.insertAdjacentHTML('beforeend', msgHtml);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Thêm tin nhắn của người dùng nhập vào LINE Simulator
function appendUserMessageToSimulator(text) {
    const chatArea = document.getElementById("line-chat-box");
    if (!chatArea) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgHtml = `
        <div class="line-message" style="align-self: flex-end; max-width: 80%; justify-content: flex-end; flex-direction: row-reverse;">
            <div class="line-bubble-wrapper" style="align-items: flex-end;">
                <div class="line-bubble" style="background: #90ee90; border-top-left-radius: 12px; border-top-right-radius: 2px;">${text}</div>
            </div>
            <span class="line-message-time">${timeStr}</span>
        </div>
    `;

    chatArea.insertAdjacentHTML('beforeend', msgHtml);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Xử lý tự động trả lời giả lập LINE Bot
function handleSimulatorAutoReply(userText) {
    const query = userText.toLowerCase().trim();
    let reply = "";

    if (query.includes("calo") || query.includes("thống kê")) {
        const dateStr = state.selectedDate;
        const goal = calculateCalorieGoal();
        const consumed = getConsumedCalories(dateStr);
        reply = `Hôm nay (${formatDateVN(dateStr)}), bạn đã nạp ${consumed}/${goal} kcal. Lượng calo còn lại: ${goal - consumed} kcal.`;
    } else if (query.includes("inbody") || query.includes("cân nặng")) {
        const latest = state.inbodyHistory[state.inbodyHistory.length - 1];
        if (latest) {
            reply = `Chỉ số InBody mới nhất (${formatDateVN(latest.date)}): Cân nặng ${latest.weight} kg, Tỷ lệ mỡ ${latest.bodyFat}%, Cơ xương ${latest.muscleMass} kg. Nhập 'đề xuất' để xem kế hoạch tuần mới.`;
        } else {
            reply = "Bạn chưa cập nhật chỉ số InBody nào. Hãy bấm sang tab InBody trên ứng dụng để cập nhật nhé.";
        }
    } else if (query.includes("đề xuất") || query.includes("kế hoạch") || query.includes("tuần")) {
        if (state.weeklyPlan) {
            reply = `Kế hoạch tuần này cho bạn:\n- Lượng calo cơ sở: ${calculateCalorieGoal()} kcal\n- Khuyến nghị: ${state.weeklyPlan.recommendations[0]}\n\nBấm qua tab 'Đề xuất tuần mới' để xem chu kỳ calo 7 ngày nhé.`;
        } else {
            reply = "Bạn chưa tạo đề xuất tuần mới. Hãy vào tab Inbody và chọn '⚡ Phân tích & Đề xuất kế hoạch tuần' trước nhé.";
        }
    } else {
        reply = "Chào mừng bạn đến với Trợ lý Dinh dưỡng LINE! Hãy nhập 'calo' để xem lượng calo hôm nay, hoặc 'inbody' để xem chỉ số cơ thể của bạn.";
    }

    const chatArea = document.getElementById("line-chat-box");
    if (!chatArea) return;

    playLineBeepSound();

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgHtml = `
        <div class="line-message">
            <div class="line-avatar">Nutri</div>
            <div class="line-bubble-wrapper">
                <span class="line-sender-name">Trợ lý Dinh dưỡng</span>
                <div class="line-bubble">${reply}</div>
            </div>
            <span class="line-message-time">${timeStr}</span>
        </div>
    `;

    chatArea.insertAdjacentHTML('beforeend', msgHtml);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Phát âm thanh báo tin nhắn LINE (Sử dụng Web Audio API không cần file ngoài)
function playLineBeepSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Nốt nhạc LINE Notify (2 nốt nhanh cao độ trong trẻo)
        const playTone = (freq, start, dur) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            
            gainNode.gain.setValueAtTime(0.08, start);
            gainNode.gain.exponentialRampToValueAtTime(0.001, start + dur);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start(start);
            osc.stop(start + dur);
        };

        const now = audioCtx.currentTime;
        playTone(987.77, now, 0.08); // Nốt Si5
        playTone(1318.51, now + 0.08, 0.15); // Nốt Đô6 nhanh tiếp nối
    } catch (e) {
        console.log("Web Audio bị chặn bởi trình duyệt trước khi tương tác.");
    }
}


// --- PHÂN HỆ 7: CÀI ĐẶT CÁ NHÂN ---
function setupSettings() {
    const weightInput = document.getElementById("set-weight");
    const heightInput = document.getElementById("set-height");
    const ageInput = document.getElementById("set-age");
    const genderSelect = document.getElementById("set-gender");
    const activitySelect = document.getElementById("set-activity");
    const goalSelect = document.getElementById("set-goal");
    const saveSettingsForm = document.getElementById("settings-form");

    if (!saveSettingsForm) return;

    // Đổ dữ liệu hiện tại vào form cấu hình
    const info = state.personalInfo;
    weightInput.value = info.weight || 70;
    heightInput.value = info.height || 170;
    ageInput.value = info.age || 25;
    genderSelect.value = info.gender || "male";
    activitySelect.value = info.activity || 1.375;
    goalSelect.value = info.goal || "lose";

    saveSettingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        state.personalInfo = {
            weight: parseFloat(weightInput.value),
            height: parseFloat(heightInput.value),
            age: parseInt(ageInput.value),
            gender: genderSelect.value,
            activity: parseFloat(activitySelect.value),
            goal: goalSelect.value
        };

        saveToLocalStorage("personalInfo", state.personalInfo);
        
        // Cập nhật lại các tính toán hiển thị toàn hệ thống
        updateHeaderSummary();
        renderDailyFoodLog();
        
        alert("Đã lưu và cập nhật cấu hình chỉ số cá nhân thành công.");
    });
}


// --- HÀM TRỢ GIÚP TIỆN ÍCH ---
function formatDateVN(dateStr) {
    const d = new Date(dateStr);
    const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatDateVNShort(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
}
