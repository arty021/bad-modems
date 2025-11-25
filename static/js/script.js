// Current selected city
let currentCity = 'novi_sad';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const removeBtn = document.getElementById('removeBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const results = document.getElementById('results');
const uploadSection = document.getElementById('uploadSection');
const noDataMessage = document.getElementById('noDataMessage');
const lastUpdated = document.getElementById('lastUpdated');

let selectedFile = null;

// Chart instances (to destroy before recreating)
let ampChartInstance = null;
let onChartInstance = null;
let dssChartInstance = null;

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
removeBtn.addEventListener('click', clearFile);

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

uploadArea.addEventListener('click', (e) => {
    if (e.target !== browseBtn) {
        fileInput.click();
    }
});

// City Switching
function switchCity(city) {
    currentCity = city;

    // Update active tab
    document.querySelectorAll('.city-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-city="${city}"]`).classList.add('active');

    // Update current city name in no-data message
    const cityNames = {
        'novi_sad': 'Novi Sad',
        'sombor': 'Sombor',
        'vrsac': 'Vršac',
        'zrenjanin': 'Zrenjanin',
        'vrbas': 'Vrbas',
        'kikinda': 'Kikinda'
    };
    document.getElementById('currentCityName').textContent = cityNames[city];

    // Clear current file selection
    clearFile();

    // Load latest results for this city
    loadLatestResults(city);
}

// Load latest results for a city
function loadLatestResults(city) {
    showLoading();
    hideError();
    hideResults();
    hideNoData();

    fetch(`/get_latest/${city}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else if (response.status === 404) {
                hideLoading();
                showNoData();
                return null;
            } else {
                throw new Error('Failed to load data');
            }
        })
        .then(data => {
            hideLoading();
            if (data && data.success) {
                displayResults(data);
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error loading latest results:', error);
            showNoData();
        });
}

// File Handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        showError('Please select a CSV file');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';

    uploadFile();
}

function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    hideError();
}

function uploadFile() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('city', currentCity);

    showLoading();
    hideError();
    hideResults();
    hideNoData();

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();

            if (data.success) {
                displayResults(data);
            } else {
                showError(data.error || 'An error occurred while processing the file');
            }
        })
        .catch(error => {
            hideLoading();
            showError('Network error: ' + error.message);
        });
}

// Helper function to get percentage badge class based on value
function getPercentageClass(percentage) {
    if (percentage >= 50) {
        return 'percentage-high';
    } else if (percentage >= 20) {
        return 'percentage-medium';
    } else {
        return 'percentage-low';
    }
}

// Safe element update function
function safeUpdateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function safeUpdateStyle(id, property, value) {
    const element = document.getElementById(id);
    if (element) {
        element.style[property] = value;
    }
}

// Display Functions
function displayResults(data) {
    // Show results section
    results.style.display = 'block';
    noDataMessage.style.display = 'none';

    // Display last updated time
    if (data.timestamp) {
        const date = new Date(data.timestamp);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const formattedDate = `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
        safeUpdateElement('updateTime', `Poslednji put ažurirano: ${formattedDate}`);
        lastUpdated.style.display = 'flex';
    }

    // Update Network Health Dashboard
    updateHealthDashboard(data);

    // Display new entries summary if available
    displayNewEntriesSummary(data.new_entries_summary);

    // Populate Top 10 AMP table
    const ampTableBody = document.getElementById('ampTableBody');
    if (ampTableBody) {
        ampTableBody.innerHTML = '';
        data.top_10_amp.forEach(item => {
            const row = document.createElement('tr');
            if (item.is_new) {
                row.classList.add('new-entry');
            }
            const percentClass = getPercentageClass(item.percentage);
            row.innerHTML = `
                <td>${item.rank}</td>
                <td>
                    ${item.amp_name}
                    ${item.is_new ? '<span class="new-badge">NOVO</span>' : ''}
                </td>
                <td><span class="amp-code">${item.amp_code || 'N/A'}</span></td>
                <td>
                    <span class="bad-count">${item.bad_count}</span>
                    <span class="percentage-badge ${percentClass}">${item.percentage}%</span>
                    <span class="total-info">od ${item.total_count}</span>
                </td>
                <td>${item.usp_count}</td>
                <td>${item.dsp_count}</td>
            `;
            ampTableBody.appendChild(row);
        });
    }

    // Populate Top 10 ON table
    const onTableBody = document.getElementById('onTableBody');
    if (onTableBody) {
        onTableBody.innerHTML = '';
        data.top_10_on.forEach(item => {
            const row = document.createElement('tr');
            if (item.is_new) {
                row.classList.add('new-entry');
            }
            const percentClass = getPercentageClass(item.percentage);
            row.innerHTML = `
                <td>${item.rank}</td>
                <td>
                    ${item.on_node}
                    ${item.is_new ? '<span class="new-badge">NOVO</span>' : ''}
                </td>
                <td>${item.on_name}</td>
                <td>
                    <span class="bad-count">${item.bad_count}</span>
                    <span class="percentage-badge ${percentClass}">${item.percentage}%</span>
                    <span class="total-info">od ${item.total_count}</span>
                </td>
                <td>${item.usp_count}</td>
                <td>${item.dsp_count}</td>
            `;
            onTableBody.appendChild(row);
        });
    }

    // Populate Top 20 DSS table
    const dssTableBody = document.getElementById('dssTableBody');
    if (dssTableBody) {
        dssTableBody.innerHTML = '';
        data.top_20_dss.forEach(item => {
            const row = document.createElement('tr');
            if (item.is_new) {
                row.classList.add('new-entry');
            }
            const percentClass = getPercentageClass(item.percentage);
            row.innerHTML = `
                <td>${item.rank}</td>
                <td>
                    ${item.on_node}
                    ${item.is_new ? '<span class="new-badge">NOVO</span>' : ''}
                </td>
                <td>${item.on_name}</td>
                <td>
                    <span class="bad-count">${item.bad_count}</span>
                    <span class="percentage-badge ${percentClass}">${item.percentage}%</span>
                    <span class="total-info">od ${item.total_count}</span>
                </td>
            `;
            dssTableBody.appendChild(row);
        });
    }

    // Create charts
    createCharts(data);

    // Smooth scroll to results
    setTimeout(() => {
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// Network Health Dashboard
function updateHealthDashboard(data) {
    const total = data.summary.total_modems;
    const healthy = data.summary.healthy_count || (total - data.summary.usp_dsp_dss_count);
    const pwrIssues = data.summary.usp_dsp_count;
    const totalIssues = data.summary.usp_dsp_dss_count;
    const snrOnly = data.summary.dss_only_count || Math.max(0, totalIssues - pwrIssues);

    // Calculate health percentage
    const healthPercent = total > 0 ? ((healthy / total) * 100).toFixed(1) : 0;

    // Update total modems
    safeUpdateElement('totalModemsHealth', total.toLocaleString());

    // Update health score
    safeUpdateElement('healthScore', `${healthPercent}%`);

    // Update gauge fill
    const gaugeFill = document.querySelector('.gauge-fill');
    if (gaugeFill) {
        const offset = 251.2 - (251.2 * (healthPercent / 100));
        gaugeFill.style.strokeDashoffset = offset;

        // Change color based on health
        if (healthPercent >= 95) {
            gaugeFill.style.stroke = '#4cd964';
        } else if (healthPercent >= 85) {
            gaugeFill.style.stroke = '#34c759';
        } else if (healthPercent >= 70) {
            gaugeFill.style.stroke = '#ffcc00';
        } else {
            gaugeFill.style.stroke = '#ff3b30';
        }
    }

    // Update health status
    const healthStatus = document.getElementById('healthStatus');
    if (healthStatus) {
        healthStatus.className = 'health-status';
        if (healthPercent >= 95) {
            healthStatus.classList.add('excellent');
            healthStatus.innerHTML = '<span class="status-icon">🌟</span><span class="status-text">Odlično</span>';
        } else if (healthPercent >= 85) {
            healthStatus.classList.add('good');
            healthStatus.innerHTML = '<span class="status-icon">✓</span><span class="status-text">Dobro</span>';
        } else if (healthPercent >= 70) {
            healthStatus.classList.add('warning');
            healthStatus.innerHTML = '<span class="status-icon">⚠️</span><span class="status-text">Upozorenje</span>';
        } else {
            healthStatus.classList.add('critical');
            healthStatus.innerHTML = '<span class="status-icon">🚨</span><span class="status-text">Kritično</span>';
        }
    }

    // Update metric cards
    const healthyPercent = total > 0 ? ((healthy / total) * 100).toFixed(1) : 0;
    const pwrPercent = total > 0 ? ((pwrIssues / total) * 100).toFixed(1) : 0;
    const snrPercent = total > 0 ? ((snrOnly / total) * 100).toFixed(1) : 0;
    const totalPercent = total > 0 ? ((totalIssues / total) * 100).toFixed(1) : 0;

    safeUpdateElement('healthyModems', healthy.toLocaleString());
    safeUpdateElement('healthyPercent', `${healthyPercent}%`);
    safeUpdateStyle('healthyBar', 'width', `${healthyPercent}%`);

    safeUpdateElement('pwrIssues', pwrIssues.toLocaleString());
    safeUpdateElement('pwrPercent', `${pwrPercent}%`);
    safeUpdateStyle('pwrBar', 'width', `${Math.min(pwrPercent * 5, 100)}%`);

    safeUpdateElement('snrIssues', snrOnly.toLocaleString());
    safeUpdateElement('snrPercent', `${snrPercent}%`);
    safeUpdateStyle('snrBar', 'width', `${Math.min(snrPercent * 5, 100)}%`);

    safeUpdateElement('totalIssues', totalIssues.toLocaleString());
    safeUpdateElement('totalPercent', `${totalPercent}%`);
    safeUpdateStyle('totalBar', 'width', `${Math.min(totalPercent * 5, 100)}%`);
}

// Display new entries summary
function displayNewEntriesSummary(newEntriesSummary) {
    const summaryContainer = document.getElementById('newEntriesSummary');

    if (!newEntriesSummary) {
        if (summaryContainer) {
            summaryContainer.style.display = 'none';
        }
        return;
    }

    const totalNew = (newEntriesSummary.new_amp_count || 0) +
        (newEntriesSummary.new_on_count || 0) +
        (newEntriesSummary.new_dss_count || 0);

    if (summaryContainer) {
        if (totalNew > 0) {
            summaryContainer.style.display = 'block';
            safeUpdateElement('newAmpCount', newEntriesSummary.new_amp_count || 0);
            safeUpdateElement('newOnCount', newEntriesSummary.new_on_count || 0);
            safeUpdateElement('newDssCount', newEntriesSummary.new_dss_count || 0);
        } else {
            summaryContainer.style.display = 'none';
        }
    }
}

function createCharts(data) {
    // Destroy existing charts if they exist
    if (ampChartInstance) ampChartInstance.destroy();
    if (onChartInstance) onChartInstance.destroy();
    if (dssChartInstance) dssChartInstance.destroy();

    // Chart colors
    const chartColors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(245, 87, 108, 0.8)',
        'rgba(240, 147, 251, 0.8)',
        'rgba(79, 172, 254, 0.8)',
        'rgba(0, 242, 254, 0.8)',
        'rgba(102, 126, 234, 0.6)',
        'rgba(245, 87, 108, 0.6)',
        'rgba(79, 172, 254, 0.6)',
        'rgba(240, 147, 251, 0.6)'
    ];

    const newEntryColor = 'rgba(76, 217, 100, 0.8)';

    // Generate colors for AMP chart
    const ampColors = data.top_10_amp.map((item, index) =>
        item.is_new ? newEntryColor : chartColors[index % chartColors.length]
    );

    // 1. Top 10 AMP Chart
    const ampCtx = document.getElementById('ampChart');
    if (ampCtx) {
        ampChartInstance = new Chart(ampCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.top_10_amp.map(item => item.is_new ? `🆕 ${item.amp_code}` : item.amp_code),
                datasets: [{
                    label: 'Loši modemi',
                    data: data.top_10_amp.map(item => item.bad_count),
                    backgroundColor: ampColors,
                    borderColor: ampColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 35, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#b4b4c8',
                        borderColor: 'rgba(102, 126, 234, 0.5)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: function (context) {
                                const index = context[0].dataIndex;
                                return data.top_10_amp[index].amp_name;
                            },
                            label: function (context) {
                                const index = context.dataIndex;
                                const item = data.top_10_amp[index];
                                return [
                                    `Kod: ${item.amp_code}`,
                                    `Loših: ${item.bad_count} od ${item.total_count}`,
                                    `Procenat: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#b4b4c8' } },
                    y: { grid: { display: false }, ticks: { color: '#ffffff', font: { size: 11 } } }
                }
            }
        });
    }

    // 2. Top 10 ON Nodes Chart
    const onCtx = document.getElementById('onChart');
    if (onCtx) {
        onChartInstance = new Chart(onCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.top_10_on.map(item => item.is_new ? `🆕 ${item.on_node}` : item.on_node),
                datasets: [
                    {
                        label: 'USP Issues',
                        data: data.top_10_on.map(item => item.usp_count),
                        backgroundColor: data.top_10_on.map(item =>
                            item.is_new ? 'rgba(76, 217, 100, 0.8)' : 'rgba(102, 126, 234, 0.8)'
                        ),
                        borderWidth: 1
                    },
                    {
                        label: 'DSP Issues',
                        data: data.top_10_on.map(item => item.dsp_count),
                        backgroundColor: data.top_10_on.map(item =>
                            item.is_new ? 'rgba(100, 230, 120, 0.8)' : 'rgba(245, 87, 108, 0.8)'
                        ),
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#ffffff', padding: 15, font: { size: 12 } } },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 35, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#b4b4c8',
                        padding: 12,
                        callbacks: {
                            title: function (context) {
                                const index = context[0].dataIndex;
                                const item = data.top_10_on[index];
                                return `${item.on_node} - ${item.on_name}`;
                            },
                            afterTitle: function (context) {
                                const index = context[0].dataIndex;
                                const item = data.top_10_on[index];
                                return `Loših: ${item.bad_count} od ${item.total_count} (${item.percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#b4b4c8', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#b4b4c8' } }
                }
            }
        });
    }

    // 3. Top 20 DSS Chart
    const dssCtx = document.getElementById('dssChart');
    if (dssCtx) {
        const dssColors = data.top_20_dss.map(item =>
            item.is_new ? 'rgba(76, 217, 100, 0.8)' : 'rgba(240, 147, 251, 0.8)'
        );

        dssChartInstance = new Chart(dssCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.top_20_dss.map(item => item.is_new ? `🆕 ${item.on_node}` : item.on_node),
                datasets: [{
                    label: 'DSS Issues',
                    data: data.top_20_dss.map(item => item.bad_count),
                    backgroundColor: dssColors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 15, 35, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#b4b4c8',
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: function (context) {
                                const index = context[0].dataIndex;
                                const item = data.top_20_dss[index];
                                return `${item.on_node} - ${item.on_name}`;
                            },
                            label: function (context) {
                                const index = context.dataIndex;
                                const item = data.top_20_dss[index];
                                return [
                                    `Loših: ${item.bad_count} od ${item.total_count}`,
                                    `Procenat: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#b4b4c8' } },
                    y: { grid: { display: false }, ticks: { color: '#ffffff', font: { size: 10 } } }
                }
            }
        });
    }
}

// UI Helper Functions
function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showResults() {
    results.style.display = 'block';
}

function hideResults() {
    results.style.display = 'none';
}

function showNoData() {
    noDataMessage.style.display = 'block';
}

function hideNoData() {
    noDataMessage.style.display = 'none';
}

// Initialize - load latest results for default city
document.addEventListener('DOMContentLoaded', () => {
    loadLatestResults(currentCity);
});