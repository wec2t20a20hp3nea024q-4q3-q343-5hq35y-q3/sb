// script.js — 离子反应模拟器 (支持所有离子完全沉淀)
(function(){
    // ---------- 离子列表 (新增可沉淀所有离子的特殊离子) ----------
    const cations = ['K', 'Na', 'Ca', 'Mg', 'Al', 'Zn', 'Fe', 'Pb', 'Cu', 'Ag', 'NH4', 'TPA'];
    const anions = ['NO3', 'NO2', 'SO4', 'SO3', 'Cl', 'Br', 'OH', 'TPB', 'HXA'];

    // 离子化合价 (正电荷数)
    const cationCharge = {
        K: 1, Na: 1, Ca: 2, Mg: 2, Al: 3, Zn: 2, Fe: 2, Pb: 2, Cu: 2, Ag: 1, NH4: 1, TPA: 1
    };
    const anionCharge = {
        NO3: 1, NO2: 1, SO4: 2, SO3: 2, Cl: 1, Br: 1, OH: 1, TPB: 1, HXA: 1
    };

    // 阳离子显示名称映射
    const cationName = {
        K: 'K⁺', Na: 'Na⁺', Ca: 'Ca²⁺', Mg: 'Mg²⁺', Al: 'Al³⁺', Zn: 'Zn²⁺',
        Fe: 'Fe²⁺', Pb: 'Pb²⁺', Cu: 'Cu²⁺', Ag: 'Ag⁺', NH4: 'NH₄⁺',
        TPA: 'TPA⁺ '
    };
    // 阴离子显示名称
    const anionName = {
        NO3: 'NO₃⁻', NO2: 'NO₂⁻', SO4: 'SO₄²⁻', SO3: 'SO₃²⁻', Cl: 'Cl⁻', Br: 'Br⁻', OH: 'OH⁻',
        TPB: 'TPB⁻ ', HXA: 'HXA⁻ '
    };

    // 沉淀规则映射:  (阳离子, 阴离子) -> 沉淀名称
    const precipitationRules = new Map();

    // --- 原有沉淀规则 ---
    // OH⁻ 沉淀 (除 K, Na, NH4, TPA 外)
    for (let cat of cations) {
        if (cat !== 'K' && cat !== 'Na' && cat !== 'NH4' && cat !== 'TPA') {
            let formula = '';
            if (cat === 'Ca') formula = 'Ca(OH)₂';
            else if (cat === 'Mg') formula = 'Mg(OH)₂';
            else if (cat === 'Al') formula = 'Al(OH)₃';
            else if (cat === 'Zn') formula = 'Zn(OH)₂';
            else if (cat === 'Fe') formula = 'Fe(OH)₂';
            else if (cat === 'Pb') formula = 'Pb(OH)₂';
            else if (cat === 'Cu') formula = 'Cu(OH)₂';
            else if (cat === 'Ag') formula = 'AgOH (Ag₂O)';
            else formula = `${cat}OH`;
            precipitationRules.set(`${cat},OH`, formula);
        }
    }
    // SO₄²⁻ 沉淀: PbSO₄, CaSO₄(微溶视为沉淀), Ag₂SO₄(微溶)
    precipitationRules.set('Pb,SO4', 'PbSO₄');
    precipitationRules.set('Ca,SO4', 'CaSO₄ (微溶)');
    precipitationRules.set('Ag,SO4', 'Ag₂SO₄');
    // Cl⁻ 沉淀: AgCl
    precipitationRules.set('Ag,Cl', 'AgCl');
    // Br⁻ 沉淀: AgBr
    precipitationRules.set('Ag,Br', 'AgBr');
    // SO₃²⁻ 沉淀: PbSO₃, Ag₂SO₃
    precipitationRules.set('Pb,SO3', 'PbSO₃');
    precipitationRules.set('Ag,SO3', 'Ag₂SO₃');

    // --- 新增沉淀规则 (确保所有离子都能被沉淀) ---
    // 1. TPB⁻ (四苯基硼酸根) 沉淀 K⁺ 和 NH₄⁺
    precipitationRules.set('K,TPB', 'K[B(C₆H₅)₄]');
    precipitationRules.set('NH4,TPB', 'NH₄[B(C₆H₅)₄]');
    // 2. HXA⁻ (六羟基锑酸根) 沉淀 Na⁺
    precipitationRules.set('Na,HXA', 'Na[Sb(OH)₆]');
    // 3. TPA⁺ (四苯基砷阳离子) 沉淀 NO₃⁻ 和 NO₂⁻
    precipitationRules.set('TPA,NO3', 'TPA·NO₃');
    precipitationRules.set('TPA,NO2', 'TPA·NO₂');

    // 反应消耗比例 (用于沉淀时计算)
    function getConsumeRatios(cat, an) {
        let cationRatio = 1, anionRatio = 1;
        if (an === 'OH') {
            if (cat === 'Al') { cationRatio = 1; anionRatio = 3; }
            else if (cat === 'Ca' || cat === 'Mg' || cat === 'Zn' || cat === 'Fe' || cat === 'Pb' || cat === 'Cu') { cationRatio = 1; anionRatio = 2; }
            else if (cat === 'Ag') { cationRatio = 1; anionRatio = 1; }
        }
        else if (an === 'SO4' && cat === 'Ag') { cationRatio = 2; anionRatio = 1; }
        else if (an === 'SO3' && cat === 'Ag') { cationRatio = 2; anionRatio = 1; }
        else if ((an === 'Cl' || an === 'Br') && cat === 'Ag') { cationRatio = 1; anionRatio = 1; }
        else if (an === 'SO4' && cat === 'Ca') { cationRatio = 1; anionRatio = 1; }
        else if (an === 'SO4' && cat === 'Pb') { cationRatio = 1; anionRatio = 1; }
        else if (an === 'SO3' && cat === 'Pb') { cationRatio = 1; anionRatio = 1; }
        return { cationRatio, anionRatio };
    }

    // ---------- 状态 ----------
    let ions = {
        cations: {},
        anions: {}
    };
    cations.forEach(c => ions.cations[c] = 0);
    anions.forEach(a => ions.anions[a] = 0);

    let solids = {};
    let gases = {};

    // DOM 元素
    const cationsDiv = document.getElementById('cationsList');
    const anionsDiv = document.getElementById('anionsList');
    const solidsDiv = document.getElementById('solidsList');
    const gasesDiv = document.getElementById('gasesList');
    const cationSelect = document.getElementById('cationSelect');
    const anionSelect = document.getElementById('anionSelect');
    const addBtn = document.getElementById('addSaltBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 更新所有UI (只显示摩尔数 > 0 的离子)
    function updateUI() {
        // 阳离子
        cationsDiv.innerHTML = '';
        let hasCation = false;
        for (let c of cations) {
            const val = ions.cations[c];
            if (val > 0) {
                hasCation = true;
                const badge = document.createElement('div');
                badge.className = 'ion-badge';
                badge.innerHTML = `${cationName[c]} <span>${val.toFixed(3)}</span>`;
                cationsDiv.appendChild(badge);
            }
        }
        if (!hasCation) {
            cationsDiv.innerHTML = '<span style="color:#a28e6b; font-style:italic;">No cation</span>';
        }

        // 阴离子
        anionsDiv.innerHTML = '';
        let hasAnion = false;
        for (let a of anions) {
            const val = ions.anions[a];
            if (val > 0) {
                hasAnion = true;
                const badge = document.createElement('div');
                badge.className = 'ion-badge';
                badge.innerHTML = `${anionName[a]} <span>${val.toFixed(3)}</span>`;
                anionsDiv.appendChild(badge);
            }
        }
        if (!hasAnion) {
            anionsDiv.innerHTML = '<span style="color:#a28e6b; font-style:italic;">No anion</span>';
        }

        // 沉淀
        solidsDiv.innerHTML = '';
        const solidEntries = Object.entries(solids).filter(([_, mol]) => mol > 0);
        if (solidEntries.length === 0) {
            solidsDiv.innerHTML = '<span style="color:#a28e6b;">No solids</span>';
        } else {
            for (let [name, mol] of solidEntries) {
                const item = document.createElement('div');
                item.className = 'precipitate-item';
                item.innerHTML = `<strong>${name}</strong> ${mol.toFixed(3)} mol`;
                solidsDiv.appendChild(item);
            }
        }

        // 气体
        gasesDiv.innerHTML = '';
        const gasEntries = Object.entries(gases).filter(([_, mol]) => mol > 0);
        if (gasEntries.length === 0) {
            gasesDiv.innerHTML = '<span style="color:#a28e6b;">No gas</span>';
        } else {
            for (let [name, mol] of gasEntries) {
                const item = document.createElement('div');
                item.className = 'gas-item';
                item.innerHTML = `<strong>${name}</strong> ${mol.toFixed(3)} mol`;
                gasesDiv.appendChild(item);
            }
        }
    }

    // 核心反应引擎
    function runReactions() {
        let changed = true;
        let maxLoop = 50;
        let loop = 0;
        while (changed && loop++ < maxLoop) {
            changed = false;

            // 气体反应: NH₄⁺ + OH⁻ → NH₃↑ + H₂O
            const nh4 = ions.cations['NH4'] || 0;
            const oh = ions.anions['OH'] || 0;
            if (nh4 > 0 && oh > 0) {
                const react = Math.min(nh4, oh);
                if (react > 0) {
                    ions.cations['NH4'] -= react;
                    ions.anions['OH'] -= react;
                    gases['NH₃(g)'] = (gases['NH₃(g)'] || 0) + react;
                    changed = true;
                }
            }

            // 沉淀反应
            const cationList = cations.filter(c => ions.cations[c] > 0);
            const anionList = anions.filter(a => ions.anions[a] > 0);
            outer: for (let cat of cationList) {
                for (let an of anionList) {
                    const key = `${cat},${an}`;
                    if (precipitationRules.has(key)) {
                        const precipName = precipitationRules.get(key);
                        const molCat = ions.cations[cat];
                        const molAn = ions.anions[an];
                        if (molCat > 0 && molAn > 0) {
                            const { cationRatio, anionRatio } = getConsumeRatios(cat, an);
                            const maxPrecip = Math.min(
                                molCat / cationRatio,
                                molAn / anionRatio
                            );
                            if (maxPrecip > 0) {
                                ions.cations[cat] -= maxPrecip * cationRatio;
                                ions.anions[an] -= maxPrecip * anionRatio;
                                solids[precipName] = (solids[precipName] || 0) + maxPrecip;
                                changed = true;
                                break outer;
                            }
                        }
                    }
                }
            }

            // 清理极小误差
            for (let c of cations) if (Math.abs(ions.cations[c]) < 1e-8) ions.cations[c] = 0;
            for (let a of anions) if (Math.abs(ions.anions[a]) < 1e-8) ions.anions[a] = 0;
            for (let s in solids) if (Math.abs(solids[s]) < 1e-8) delete solids[s];
            for (let g in gases) if (Math.abs(gases[g]) < 1e-8) delete gases[g];
        }
        updateUI();
    }

    // 添加 1 摩尔盐 (按化学计量比添加离子)
    function addSalt(cation, anion) {
        if (!cations.includes(cation) || !anions.includes(anion)) return;

        const cCharge = cationCharge[cation];
        const aCharge = anionCharge[anion];
        const addCation = 1;
        const addAnion = cCharge / aCharge;

        ions.cations[cation] = (ions.cations[cation] || 0) + addCation;
        ions.anions[anion] = (ions.anions[anion] || 0) + addAnion;

        runReactions();
    }

    // 清空所有内容
    function resetLab() {
        cations.forEach(c => ions.cations[c] = 0);
        anions.forEach(a => ions.anions[a] = 0);
        solids = {};
        gases = {};
        updateUI();
    }

    // 填充下拉框
    function populateSelects() {
        cationSelect.innerHTML = '';
        for (let c of cations) {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = cationName[c];
            cationSelect.appendChild(option);
        }
        anionSelect.innerHTML = '';
        for (let a of anions) {
            const option = document.createElement('option');
            option.value = a;
            option.textContent = anionName[a];
            anionSelect.appendChild(option);
        }
    }

    // 事件绑定
    function bindEvents() {
        addBtn.addEventListener('click', () => {
            const cation = cationSelect.value;
            const anion = anionSelect.value;
            addSalt(cation, anion);
        });
        resetBtn.addEventListener('click', resetLab);
    }

    // 初始化
    function init() {
        populateSelects();
        bindEvents();
        updateUI();
    }
    init();
})();