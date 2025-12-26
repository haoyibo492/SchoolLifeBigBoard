// --- 1. 数据 Mock ---
const mockData = {
    'library': { name: '博文馆 (图书馆)', value: 85, structure: [120, 15, 5, 2], env: [45, 24], type: 'lib' },
    'zhijin':  { name: '知津楼 (教学区A)', value: 35, structure: [80, 25, 3, 1], env: [50, 18], type: 'edu' },
    'gezhi':   { name: '格致楼 (教学区B)', value: 65, structure: [150, 20, 5, 5], env: [65, 26], type: 'edu' },
    'canteen1':{ name: '一食堂', value: 92, structure: [200, 10, 35, 15], env: [75, 30], type: 'food' },
    'canteen2':{ name: '二食堂', value: 55, structure: [90, 8, 20, 5], env: [60, 27], type: 'food' },
    'canteen3':{ name: '三食堂', value: 75, structure: [110, 12, 25, 8], env: [55, 28], type: 'food' }
};

// 全局变量记录当前选中ID，用于切换主题时重绘
let currentSelectedId = 'zhijin'; 
let isLightMode = false; // 默认为黑夜

// --- 2. 主题管理 (核心新增) ---

// 获取当前的 ECharts 主题配置
function getChartTheme() {
    if (isLightMode) {
        // 白天模式配置
        return {
            textStyle: { color: '#64748b' }, // 深灰字
            title: { textStyle: { color: '#1e293b' } }, // 黑标题
            grid: { top: 35, bottom: 25, left: 40, right: 20 },
            categoryAxis: { 
                axisLine: { lineStyle: { color: '#cbd5e1' } }, // 浅灰轴线
                axisTick: { show: false } 
            },
            valueAxis: { 
                splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } } // 极淡的黑色分割线
            }
        };
    } else {
        // 黑夜模式配置 (原配置)
        return {
            textStyle: { color: '#94a3b8' },
            title: { textStyle: { color: '#e2e8f0' } },
            grid: { top: 35, bottom: 25, left: 40, right: 20 },
            categoryAxis: { 
                axisLine: { lineStyle: { color: '#334155' } }, 
                axisTick: { show: false } 
            },
            valueAxis: { 
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } 
            }
        };
    }
}

// 切换主题逻辑
function toggleTheme(manual = true) {
    if (manual) {
        isLightMode = !isLightMode; // 手动切换取反
    }
    
    // 1. 设置 DOM 类名
    const body = document.body;
    const btn = document.getElementById('theme-btn');
    if (isLightMode) {
        body.classList.add('theme-light');
        if(btn) btn.innerText = '🌙 黑夜模式';
    } else {
        body.classList.remove('theme-light');
        if(btn) btn.innerText = '☀️ 明亮模式';
    }

    // 2. 刷新所有图表
    initCharts(); // 重新初始化图表实例的配置
    handleSelect(currentSelectedId); // 重绘数据
}

// 自动根据时间设置主题
function autoSetTheme() {
    const hour = new Date().getHours();
    // 早上6点到晚上18点为白天
    const isDayTime = hour >= 6 && hour < 18;
    
    // 如果当前状态和时间不符，则切换
    if (isDayTime !== isLightMode) {
        isLightMode = isDayTime;
        toggleTheme(false); // false 代表非手动，是自动执行
    }
}

// --- 3. 概览数据初始化 ---
function initOverview() {
    let totalActive = 0;
    Object.values(mockData).forEach(d => {
        totalActive += (d.value * 15); 
    });
    const totalSchool = 15000 + totalActive;
    const genderHtml = `<span style="color:var(--c-blue)">54%</span> <span style="font-size:14px;color:var(--text-secondary)">/</span> <span style="color:#f472b6">46%</span>`;

    const totalEl = document.getElementById('total-num');
    const genderEl = document.getElementById('gender-ratio');
    if(totalEl) totalEl.innerText = totalSchool.toLocaleString();
    if(genderEl) genderEl.innerHTML = genderHtml;
}

// --- 4. 连线逻辑 ---
function drawConnections() {
    const stage = document.getElementById('mapStage');
    const pathEl = document.getElementById('dynamic-connection');
    if(!stage || !pathEl) return;
    const stageRect = stage.getBoundingClientRect();
    const order = ['btn-zhijin', 'btn-gezhi', 'btn-canteen1', 'btn-canteen2', 'btn-canteen3', 'btn-library'];
    let pathD = "";
    order.forEach((id, index) => {
        const el = document.getElementById(id);
        if(el) {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2 - stageRect.left;
            const y = rect.top + rect.height / 2 - stageRect.top;
            pathD += (index === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
        }
    });
    pathD += "Z";
    pathEl.setAttribute('d', pathD);
}

// --- 5. ECharts 初始化 ---
let charts = {};

function initCharts() {
    const theme = getChartTheme(); // 获取当前主题色

    // 如果图表已存在，不需要 dispose，直接 setOption 合并样式即可
    // 但为了确保样式彻底切换，我们把通用配置重新 set 一遍
    
    if(!charts.trend) charts.trend = echarts.init(document.getElementById('chart-trend'));
    charts.trend.setOption({
        ...theme,
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['8:00','10:00','12:00','14:00','16:00'], ...theme.categoryAxis },
        yAxis: { type: 'value', ...theme.valueAxis },
        series: [{
            data: [1200, 3100, 4500, 3800, 4100], type: 'line', smooth: true, itemStyle: { color: '#38bdf8' },
            areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(56,189,248,0.3)'},{offset:1,color:'transparent'}]) }
        }]
    });

    if(!charts.pie) charts.pie = echarts.init(document.getElementById('chart-pie'));
    charts.pie.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie', radius: ['45%', '70%'],
            itemStyle: { 
                borderRadius: 4, 
                borderColor: isLightMode ? '#fff' : '#0b1120', // 饼图边框颜色随主题变
                borderWidth: 2 
            },
            label: { color: theme.textStyle.color },
            data: [{ value: 45, name: '教学区', itemStyle:{color:'#38bdf8'} }, { value: 30, name: '生活区', itemStyle:{color:'#fbbf24'} }, { value: 25, name: '图书区', itemStyle:{color:'#34d399'} }]
        }]
    });

    if(!charts.radar) charts.radar = echarts.init(document.getElementById('chart-radar'));
    charts.radar.setOption({
        radar: {
            indicator: [{name:'门禁卡'}, {name:'访客'}, {name:'车辆'}, {name:'人脸'}, {name:'其他'}],
            axisName: { color: theme.textStyle.color }, 
            splitLine: { lineStyle: { color: theme.categoryAxis.axisLine.lineStyle.color } }, 
            splitArea: { areaStyle: { color: isLightMode ? ['rgba(0,0,0,0.02)', 'transparent'] : ['rgba(255,255,255,0.02)', 'transparent'] } }
        },
        series: [{ type: 'radar', data: [{ value: [90, 40, 50, 80, 20], name: '今日数据' }], itemStyle: { color: '#818cf8' }, areaStyle: { opacity: 0.2 } }]
    });

    if(!charts.gauge) charts.gauge = echarts.init(document.getElementById('chart-gauge'));
    if(!charts.bar) charts.bar = echarts.init(document.getElementById('chart-bar'));
    if(!charts.env) charts.env = echarts.init(document.getElementById('chart-env'));
}

// --- 6. 交互与核心更新 ---

function handleSelect(id) {
    currentSelectedId = id; // 记录当前ID
    const data = mockData[id];
    if(!data) return;

    // UI 更新
    document.querySelectorAll('.node-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + id).classList.add('active');
    document.getElementById('info-name').innerText = data.name;
    document.getElementById('info-status').innerHTML = `实时人数: ${data.value * 15} &nbsp;|&nbsp; 拥挤度: ${data.value}%`;

    updateGauge(data.value);
    updateBar(data.structure);
    updateEnv(data.env);
}

function updateGauge(val) {
    const theme = getChartTheme();
    let color = '#34d399'; 
    if(val > 40) color = '#38bdf8'; 
    if(val > 60) color = '#fbbf24'; 
    if(val > 80) color = '#f87171'; 

    charts.gauge.setOption({
        series: [{
            type: 'gauge', min:0, max:100,
            axisLine: { lineStyle: { width: 10, color: [[1, isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)']] } }, // 仪表盘底色
            progress: { show: true, width: 10, itemStyle: { color: color } },
            pointer: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false },
            detail: { valueAnimation: true, fontSize: 24, offsetCenter: [0,0], formatter: '{value}%', color: theme.title.textStyle.color }, // 文字颜色跟随主题
            data: [{ value: val }]
        }]
    });
}

function updateBar(data) {
    const theme = getChartTheme();
    const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6']; 

    const total = data.reduce((a, b) => a + b, 0);
    const percentData = data.map(val => total === 0 ? 0 : parseFloat(((val / total) * 100).toFixed(1)));

    charts.bar.setOption({
        ...theme,
        grid: { top: 30, bottom: 20, left: 40, right: 10 },
        tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
        xAxis: { 
            type: 'category', 
            data: ['学生', '教职工', '后勤', '访客'], 
            axisLabel: { color: theme.textStyle.color, fontSize: 11 }, // 使用主题色
            axisLine: { lineStyle: { color: theme.categoryAxis.axisLine.lineStyle.color } },
            axisTick: { show: false }
        },
        yAxis: { 
            type: 'value', 
            max: 100, 
            splitLine: { lineStyle: { color: theme.valueAxis.splitLine.lineStyle.color } },
            axisLabel: { color: theme.textStyle.color, formatter: '{value}%' }
        },
        series: [{
            type: 'bar', 
            data: percentData, 
            barWidth: '45%',
            itemStyle: { 
                borderRadius: [4, 4, 0, 0],
                color: function(params) { return colors[params.dataIndex] || '#cbd5e1'; }
            },
            label: { show: true, position: 'top', color: theme.textStyle.color, fontSize: 10, formatter: '{c}%' } // 文字颜色适配
        }]
    });
}

function updateEnv(data) {
    const theme = getChartTheme();
    charts.env.setOption({
        ...theme,
        xAxis: { type: 'value', ...theme.valueAxis },
        yAxis: { type: 'category', data: ['湿度', '温度'], ...theme.categoryAxis },
        series: [{
            type: 'bar', 
            data: data, 
            barWidth: '50%',
            label: { show: true, position: 'right', color: theme.textStyle.color }, // 文字颜色适配
            itemStyle: { 
                borderRadius: [0,4,4,0],
                color: function(params) {
                    const val = params.value;
                    if (params.dataIndex === 1) { 
                        if (val > 30) return '#f87171';
                        if (val > 26) return '#fbbf24';
                        if (val < 15) return '#38bdf8';
                        return '#34d399';
                    } else { 
                        if (val > 70) return '#f87171';
                        if (val > 60) return '#fbbf24';
                        if (val < 30) return '#fbbf24';
                        return '#38bdf8';
                    }
                }
            }
        }]
    });
}

// --- 7. 初始化入口 ---
window.onload = function() {
    // 1. 先检测时间自动设置主题
    autoSetTheme(); 

    // 2. 初始化图表和数据
    initCharts();
    initOverview(); 
    
    setTimeout(() => {
        drawConnections(); 
        handleSelect('zhijin');
    }, 300);

    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('clock');
        if(clockEl) clockEl.innerText = now.toLocaleString('zh-CN');
    }, 1000);

    window.addEventListener('resize', () => {
        Object.values(charts).forEach(c => c.resize());
        drawConnections();
    });
};