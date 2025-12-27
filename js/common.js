// --- 1. 数据 Mock ---
// 模拟校园各区域的数据，包括名称、人数、人员结构、环境数据等
const mockData = {
    // 图书馆数据：名称、拥挤度、人员结构[学生, 教职工, 后勤, 访客]、环境数据[湿度, 温度]、类型
    'library': { name: '博文馆 (图书馆)', value: 85, structure: [120, 15, 5, 2], env: [45, 24], type: 'lib' },
    // 知津楼数据：教学区A
    'zhijin':  { name: '知津楼 (教学区A)', value: 35, structure: [80, 25, 3, 1], env: [50, 18], type: 'edu' },
    // 格致楼数据：教学区B
    'gezhi':   { name: '格致楼 (教学区B)', value: 65, structure: [150, 20, 5, 5], env: [65, 26], type: 'edu' },
    // 一食堂数据
    'canteen1':{ name: '一食堂', value: 92, structure: [200, 10, 35, 15], env: [75, 30], type: 'food' },
    // 二食堂数据
    'canteen2':{ name: '二食堂', value: 55, structure: [90, 8, 20, 5], env: [60, 27], type: 'food' },
    // 三食堂数据
    'canteen3':{ name: '三食堂', value: 75, structure: [110, 12, 25, 8], env: [55, 28], type: 'food' }
};

// 全局变量记录当前选中ID，用于切换主题时重绘
let currentSelectedId = 'zhijin'; 
let isLightMode = false; // 默认为黑夜模式

// --- 2. 主题管理 (核心新增) ---

// 获取当前的 ECharts 主题配置
function getChartTheme() {
    if (isLightMode) {
        // 白天模式配置
        return {
            textStyle: { color: '#64748b' }, // 深灰字
            title: { textStyle: { color: '#1e293b' } }, // 黑标题
            grid: { top: 35, bottom: 25, left: 40, right: 20 }, // 图表网格间距
            categoryAxis: { 
                axisLine: { lineStyle: { color: '#cbd5e1' } }, // 浅灰轴线
                axisTick: { show: false } // 不显示刻度线
            },
            valueAxis: { 
                splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } } // 极淡的黑色分割线
            }
        };
    } else {
        // 黑夜模式配置 (原配置)
        return {
            textStyle: { color: '#94a3b8' }, // 浅灰字
            title: { textStyle: { color: '#e2e8f0' } }, // 白色标题
            grid: { top: 35, bottom: 25, left: 40, right: 20 }, // 图表网格间距
            categoryAxis: { 
                axisLine: { lineStyle: { color: '#334155' } }, // 深灰轴线
                axisTick: { show: false } // 不显示刻度线
            },
            valueAxis: { 
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } // 极淡的白色分割线
            }
        };
    }
}

// 切换主题逻辑
function toggleTheme(manual = true) {
    if (manual) {
        isLightMode = !isLightMode; // 手动切换时取反当前模式
    }
    
    // 1. 设置 DOM 类名
    const body = document.body;
    const btn = document.getElementById('theme-btn');
    if (isLightMode) {
        body.classList.add('theme-light'); // 添加亮色主题类
        if(btn) btn.innerText = '🌙 黑夜模式'; // 更新按钮文本
        // 更新背景图片为亮色模式版本
        const bgImg = document.getElementById('campus-bg');
        if(bgImg) bgImg.src = './images/image3.png';
    } else {
        body.classList.remove('theme-light'); // 移除亮色主题类
        if(btn) btn.innerText = '☀️ 明亮模式'; // 更新按钮文本
        // 更新背景图片为暗色模式版本
        const bgImg = document.getElementById('campus-bg');
        if(bgImg) bgImg.src = './images/image4.png';
    }

    // 2. 刷新所有图表 - 使用新主题重新渲染
    initCharts(); // 重新初始化图表实例的配置
    handleSelect(currentSelectedId); // 重绘当前选中区域的数据
}

// 自动根据时间设置主题
function autoSetTheme() {
    const hour = new Date().getHours(); // 获取当前小时
    // 早上6点到晚上18点为白天
    const isDayTime = hour >= 6 && hour < 18;
    
    // 如果当前状态和时间不符，则切换
    if (isDayTime !== isLightMode) {
        isLightMode = isDayTime;
        toggleTheme(false); // false 代表非手动，是自动执行
    }
    
    // 根据时间设置对应的背景图片
    const bgImg = document.getElementById('campus-bg');
    if(bgImg) {
        if(isLightMode) {
            bgImg.src = './images/image3.png';
        } else {
            bgImg.src = './images/image4.png';
        }
    }
}

// --- 3. 概览数据初始化 ---
// 初始化全校数据概览面板
function initOverview() {
    let totalActive = 0; // 计算所有区域的实时人数总和
    Object.values(mockData).forEach(d => {
        totalActive += (d.value * 15); // 每个区域的人数 = 拥挤度 * 15
    });
    // 全校总人数 = 基础人数15000 + 所有区域实时人数
    const totalSchool = 15000 + totalActive;
    // 男女比例HTML字符串
    const genderHtml = `<span style="color:var(--c-blue)">54%</span> <span style="font-size:14px;color:var(--text-secondary)">/</span> <span style="color:#f472b6">46%</span>`;

    // 更新DOM元素
    const totalEl = document.getElementById('total-num');
    const genderEl = document.getElementById('gender-ratio');
    if(totalEl) totalEl.innerText = totalSchool.toLocaleString(); // 格式化数字显示
    if(genderEl) genderEl.innerHTML = genderHtml;
}

// --- 4. 连线逻辑 ---
// 绘制连接校园各区域的动态SVG路径
function drawConnections() {
    const stage = document.getElementById('mapStage'); // 获取地图容器
    const pathEl = document.getElementById('dynamic-connection'); // 获取路径元素
    if(!stage || !pathEl) return; // 如果元素不存在则返回
    
    // 获取容器的边界矩形，用于计算相对位置
    const stageRect = stage.getBoundingClientRect();
    
    // 定义连线顺序：按照特定顺序连接各个区域按钮
    const order = ['btn-zhijin', 'btn-gezhi', 'btn-canteen1', 'btn-canteen2', 'btn-canteen3', 'btn-library'];
    
    let pathD = ""; // 初始化路径字符串
    // 遍历每个按钮，计算中心点坐标并添加到路径字符串
    order.forEach((id, index) => {
        const el = document.getElementById(id); // 获取按钮元素
        if(el) {
            // 计算按钮中心相对于容器的坐标
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2 - stageRect.left; // 中心X坐标
            const y = rect.top + rect.height / 2 - stageRect.top; // 中心Y坐标
            // 根据索引决定是移动到起点还是连线到下一点
            pathD += (index === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `); // M=移动到，L=连线到
        }
    });
    pathD += "Z"; // Z表示闭合路径
    pathEl.setAttribute('d', pathD); // 设置路径
}

// 启动实时渲染连接线
function startConnectionAnimation() {
    // 每100毫秒更新一次连接线位置，实现更流畅的动画效果
    setInterval(() => {
        drawConnections();
    }, 100); // 每100毫秒更新一次，可根据性能需求调整
}

// --- 5. ECharts 初始化 ---
let charts = {}; // 存储所有图表实例的对象

function initCharts() {
    const theme = getChartTheme(); // 获取当前主题色

    // 如果图表已存在，不需要 dispose，直接 setOption 合并样式即可
    // 但为了确保样式彻底切换，我们把通用配置重新 set 一遍
    
    // 初始化人流量趋势监测图表（折线图）
    if(!charts.trend) charts.trend = echarts.init(document.getElementById('chart-trend'));
    charts.trend.setOption({
        ...theme, // 应用当前主题
        tooltip: { trigger: 'axis' }, // 鼠标悬停提示框，触发方式为坐标轴
        xAxis: { type: 'category', data: ['8:00','10:00','12:00','14:00','16:00'], ...theme.categoryAxis },
        yAxis: { type: 'value', ...theme.valueAxis }, // 数值轴
        series: [{
            data: [1200, 3100, 4500, 3800, 4100], // 示例数据
            type: 'line', // 图表类型为折线图
            smooth: true, // 平滑曲线
            itemStyle: { color: '#38bdf8' }, // 数据点颜色
            areaStyle: { // 区域填充样式
                color: new echarts.graphic.LinearGradient(0,0,0,1,[ // 渐变填充
                    {offset:0,color:'rgba(56,189,248,0.3)'}, // 起始颜色
                    {offset:1,color:'transparent'} // 结束颜色
                ])
            }
        }]
    });

    // 初始化区域热力分布占比图表（饼图）
    if(!charts.pie) charts.pie = echarts.init(document.getElementById('chart-pie'));
    charts.pie.setOption({
        tooltip: { trigger: 'item' }, // 鼠标悬停提示框，触发方式为单项
        series: [{
            type: 'pie', // 图表类型为饼图
            radius: ['45%', '70%'], // 环形饼图（内半径，外半径）
            itemStyle: { 
                borderRadius: 4, // 圆角
                borderColor: isLightMode ? '#fff' : '#0b1120', // 饼图边框颜色随主题变
                borderWidth: 2 // 边框宽度
            },
            label: { color: theme.textStyle.color }, // 标签颜色
            data: [
                { value: 45, name: '教学区', itemStyle:{color:'#38bdf8'} }, 
                { value: 30, name: '生活区', itemStyle:{color:'#fbbf24'} }, 
                { value: 25, name: '图书区', itemStyle:{color:'#34d399'} }
            ]
        }]
    });

    // 初始化入校权限分析图表（雷达图）
    if(!charts.radar) charts.radar = echarts.init(document.getElementById('chart-radar'));
    charts.radar.setOption({
        radar: {
            indicator: [ // 雷达图指标
                {name:'门禁卡'}, 
                {name:'访客'}, 
                {name:'车辆'}, 
                {name:'人脸'}, 
                {name:'其他'}
            ],
            axisName: { color: theme.textStyle.color }, // 坐标轴名称颜色
            splitLine: { lineStyle: { color: theme.categoryAxis.axisLine.lineStyle.color } }, // 分割线颜色
            splitArea: { 
                // 分割区域样式，根据主题变化
                areaStyle: { 
                    color: isLightMode ? ['rgba(0,0,0,0.02)', 'transparent'] : ['rgba(255,255,255,0.02)', 'transparent'] 
                } 
            }
        },
        series: [{ 
            type: 'radar', // 雷达图类型
            data: [{ value: [90, 40, 50, 80, 20], name: '今日数据' }], // 雷达图数据
            itemStyle: { color: '#818cf8' }, // 数据点颜色
            areaStyle: { opacity: 0.2 } // 区域透明度
        }]
    });

    // 初始化实时拥挤指数图表（仪表盘）
    if(!charts.gauge) charts.gauge = echarts.init(document.getElementById('chart-gauge'));
    // 初始化人群结构画像图表（柱状图）
    if(!charts.bar) charts.bar = echarts.init(document.getElementById('chart-bar'));
    // 初始化环境舒适度图表（柱状图）
    if(!charts.env) charts.env = echarts.init(document.getElementById('chart-env'));
}

// --- 6. 交互与核心更新 ---

// 处理地图区域选中事件
function handleSelect(id) {
    currentSelectedId = id; // 记录当前选中ID
    const data = mockData[id]; // 获取对应区域的数据
    if(!data) return; // 如果数据不存在则返回

    // 更新UI状态
    // 移除所有按钮的激活状态
    document.querySelectorAll('.node-btn').forEach(b => b.classList.remove('active'));
    // 为当前选中按钮添加激活状态
    document.getElementById('btn-' + id).classList.add('active');
    // 更新信息栏的区域名称
    document.getElementById('info-name').innerText = data.name;
    // 更新状态摘要
    document.getElementById('info-status').innerHTML = `实时人数: ${data.value * 15} &nbsp;|&nbsp; 拥挤度: ${data.value}%`;

    // 更新右侧三个图表的数据
    updateGauge(data.value); // 更新拥挤指数仪表盘
    updateBar(data.structure); // 更新人群结构柱状图
    updateEnv(data.env); // 更新环境数据柱状图
}

// 更新拥挤指数仪表盘
function updateGauge(val) {
    const theme = getChartTheme(); // 获取当前主题
    // 根据数值确定颜色：绿色<40，蓝色<60，黄色<80，红色>=80
    let color = '#34d399'; 
    if(val > 40) color = '#38bdf8'; 
    if(val > 60) color = '#fbbf24'; 
    if(val > 80) color = '#f87171'; 

    charts.gauge.setOption({
        series: [{
            type: 'gauge', // 仪表盘类型
            min:0, max:100, // 最小值和最大值
            axisLine: { 
                lineStyle: { 
                    width: 10, // 轴线宽度
                    color: [[1, isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)']] // 轴线颜色
                } 
            },
            progress: { 
                show: true, // 显示进度条
                width: 10, // 进度条宽度
                itemStyle: { color: color } // 进度条颜色
            },
            pointer: { show: false }, // 不显示指针
            axisTick: { show: false }, // 不显示刻度线
            axisLabel: { show: false }, // 不显示轴标签
            splitLine: { show: false }, // 不显示分割线
            detail: { 
                valueAnimation: true, // 值动画
                fontSize: 24, // 字体大小
                offsetCenter: [0,0], // 文字偏移
                formatter: '{value}%', // 格式化为百分比
                color: theme.title.textStyle.color // 文字颜色跟随主题
            },
            data: [{ value: val }] // 当前值
        }]
    });
}

// 更新人群结构柱状图
function updateBar(data) {
    const theme = getChartTheme(); // 获取当前主题
    // 定义柱状图颜色数组
    const colors = ['#38bdf8', '#818cf8', '#34d399', '#f472b6']; 

    // 将原始人数数据转换为百分比
    const total = data.reduce((a, b) => a + b, 0); // 计算总数
    // 计算每个类别的百分比，保留一位小数
    const percentData = data.map(val => total === 0 ? 0 : parseFloat(((val / total) * 100).toFixed(1)));

    charts.bar.setOption({
        ...theme, // 应用当前主题
        grid: { top: 30, bottom: 20, left: 40, right: 10 }, // 图表网格间距
        tooltip: { trigger: 'item', formatter: '{b}: {c}%' }, // 鼠标提示框显示类别和百分比
        xAxis: { 
            type: 'category', // 类目轴
            data: ['学生', '教职工', '后勤', '访客'], // X轴数据
            axisLabel: { color: theme.textStyle.color, fontSize: 11 }, // 轴标签颜色
            axisLine: { lineStyle: { color: theme.categoryAxis.axisLine.lineStyle.color } }, // 轴线颜色
            axisTick: { show: false } // 不显示刻度线
        },
        yAxis: { 
            type: 'value', // 数值轴
            max: 100, // 最大值100%
            splitLine: { lineStyle: { color: theme.valueAxis.splitLine.lineStyle.color } }, // 分割线颜色
            axisLabel: { color: theme.textStyle.color, formatter: '{value}%' } // 轴标签格式化为百分比
        },
        series: [{
            type: 'bar', // 柱状图类型
            data: percentData, // 百分比数据
            barWidth: '45%', // 柱条宽度
            itemStyle: { 
                borderRadius: [4, 4, 0, 0], // 柱条顶部圆角
                color: function(params) { return colors[params.dataIndex] || '#cbd5e1'; } // 根据索引设置颜色
            },
            label: { 
                show: true, // 显示标签
                position: 'top', // 标签位置在顶部
                color: theme.textStyle.color, // 标签颜色
                fontSize: 10, // 标签字体大小
                formatter: '{c}%' // 格式化为百分比
            }
        }]
    });
}

// 更新环境舒适度柱状图（显示温度和湿度）
function updateEnv(data) {
    const theme = getChartTheme(); // 获取当前主题
    charts.env.setOption({
        ...theme, // 应用当前主题
        xAxis: { type: 'value', ...theme.valueAxis }, // X轴为数值轴
        yAxis: { type: 'category', data: ['湿度', '温度'], ...theme.categoryAxis }, // Y轴为类目轴
        series: [{
            type: 'bar', // 柱状图类型
            data: data, // 环境数据 [湿度, 温度]
            barWidth: '50%', // 柱条宽度
            label: { 
                show: true, // 显示标签
                position: 'right', // 标签位置在右侧
                color: theme.textStyle.color // 标签颜色
            },
            itemStyle: { 
                borderRadius: [0,4,4,0], // 柱条右端圆角
                color: function(params) {
                    const val = params.value; // 获取当前值
                    if (params.dataIndex === 1) { // 如果是温度数据
                        if (val > 30) return '#f87171'; // 温度过高显示红色
                        if (val > 26) return '#fbbf24'; // 温度偏高显示黄色
                        if (val < 15) return '#38bdf8'; // 温度过低显示蓝色
                        return '#34d399'; // 适宜温度显示绿色
                    } else { // 如果是湿度数据
                        if (val > 70) return '#f87171'; // 湿度过高显示红色
                        if (val > 60) return '#fbbf24'; // 湿度偏高显示黄色
                        if (val < 30) return '#fbbf24'; // 湿度过低显示黄色
                        return '#38bdf8'; // 适宜湿度显示蓝色
                    }
                }
            }
        }]
    });
}

// --- 7. 初始化入口 ---
// 页面加载完成后执行初始化
window.onload = function() {
    // 1. 先检测时间自动设置主题
    autoSetTheme(); 

    // 2. 初始化图表和数据
    initCharts(); // 初始化所有图表
    initOverview(); // 初始化概览数据
    
    // 3. 设置初始背景图片
    const bgImg = document.getElementById('campus-bg');
    if(bgImg) {
        if(isLightMode) {
            bgImg.src = './images/image3.png';
        } else {
            bgImg.src = './images/image4.png';
        }
    }
    
    // 延迟执行，确保DOM元素完全加载
    setTimeout(() => {
        drawConnections(); // 绘制连接线
        handleSelect('zhijin'); // 默认选中知津楼
    }, 300);

    // 启动连接线实时渲染
    startConnectionAnimation();

    // 每秒更新一次时间显示
    setInterval(() => {
        const now = new Date(); // 获取当前时间
        const clockEl = document.getElementById('clock'); // 获取时间显示元素
        if(clockEl) clockEl.innerText = now.toLocaleString('zh-CN'); // 更新时间显示
    }, 1000);

    // 监听窗口大小变化事件
    window.addEventListener('resize', () => {
        Object.values(charts).forEach(c => c.resize()); // 所有图表重新调整大小
        drawConnections(); // 重新绘制连接线
    });
};