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
let issueTypeChartInstance = null;

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
                // No data for this city yet
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
    // Validate file type
    if (!file.name.endsWith('.csv')) {
        showError('Please select a CSV file');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';

    // Automatically upload and analyze
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

    // Show loading
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

// Display Functions
function displayResults(data) {
    // Show results section
    results.style.display = 'block';
    noDataMessage.style.display = 'none';

    // Display last updated time
    if (data.timestamp) {
        const date = new Date(data.timestamp);
        const day = date.getDate();
        const month = date.getMonth() + 1; // Months are 0-indexed
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        const formattedDate = `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
        document.getElementById('updateTime').textContent = `Poslednji put ažurirano: ${formattedDate}`;
        lastUpdated.style.display = 'flex';
    }

    // Update summary statistics
    document.getElementById('totalModems').textContent = data.summary.total_modems.toLocaleString();
    document.getElementById('uspDspCount').textContent = data.summary.usp_dsp_count.toLocaleString();
    document.getElementById('uspDspDssCount').textContent = data.summary.usp_dsp_dss_count.toLocaleString();

    // Populate Top 10 AMP table
    const ampTableBody = document.getElementById('ampTableBody');
    ampTableBody.innerHTML = '';
    data.top_10_amp.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.rank}</td>
            <td>${item.amp_name}</td>
            <td>${item.total_count}</td>
            <td>${item.usp_count}</td>
            <td>${item.dsp_count}</td>
        `;
        ampTableBody.appendChild(row);
    });

    // Populate Top 10 ON table
    const onTableBody = document.getElementById('onTableBody');
    onTableBody.innerHTML = '';
    data.top_10_on.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.rank}</td>
            <td>${item.on_node}</td>
            <td>${item.on_name}</td>
            <td>${item.total_count}</td>
            <td>${item.usp_count}</td>
            <td>${item.dsp_count}</td>
        `;
        onTableBody.appendChild(row);
    });

    // Populate Top 20 DSS table
    const dssTableBody = document.getElementById('dssTableBody');
    dssTableBody.innerHTML = '';
    data.top_20_dss.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.rank}</td>
            <td>${item.on_node}</td>
            <td>${item.on_name}</td>
            <td>${item.dss_count}</td>
        `;
        dssTableBody.appendChild(row);
    });

    // Create charts
    createCharts(data);

    // Smooth scroll to results
    setTimeout(() => {
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function createCharts(data) {
    // Destroy existing charts if they exist
    if (ampChartInstance) ampChartInstance.destroy();
    if (onChartInstance) onChartInstance.destroy();
    if (dssChartInstance) dssChartInstance.destroy();
    if (issueTypeChartInstance) issueTypeChartInstance.destroy();

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

    // 1. Top 10 AMP Chart (Horizontal Bar)
    const ampCtx = document.getElementById('ampChart').getContext('2d');
    ampChartInstance = new Chart(ampCtx, {
        type: 'bar',
        data: {
            labels: data.top_10_amp.map(item => item.amp_name),
            datasets: [{
                label: 'Total Issues',
                data: data.top_10_amp.map(item => item.total_count),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 35, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#b4b4c8',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#b4b4c8'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });

    // 2. Top 10 ON Nodes Chart (Bar)
    const onCtx = document.getElementById('onChart').getContext('2d');
    onChartInstance = new Chart(onCtx, {
        type: 'bar',
        data: {
            labels: data.top_10_on.map(item => item.on_node),
            datasets: [
                {
                    label: 'USP Issues',
                    data: data.top_10_on.map(item => item.usp_count),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                },
                {
                    label: 'DSP Issues',
                    data: data.top_10_on.map(item => item.dsp_count),
                    backgroundColor: 'rgba(245, 87, 108, 0.8)',
                    borderColor: 'rgba(245, 87, 108, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 35, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#b4b4c8',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        title: function (context) {
                            const index = context[0].dataIndex;
                            const onNode = data.top_10_on[index].on_node;
                            const onName = data.top_10_on[index].on_name;
                            return `${onNode} - ${onName}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#b4b4c8',
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#b4b4c8'
                    }
                }
            }
        }
    });

    // 3. Top 20 DSS Chart (Horizontal Bar)
    const dssCtx = document.getElementById('dssChart').getContext('2d');
    dssChartInstance = new Chart(dssCtx, {
        type: 'bar',
        data: {
            labels: data.top_20_dss.map(item => item.on_node),
            datasets: [{
                label: 'DSS Issues',
                data: data.top_20_dss.map(item => item.dss_count),
                backgroundColor: 'rgba(240, 147, 251, 0.8)',
                borderColor: 'rgba(240, 147, 251, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 35, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#b4b4c8',
                    borderColor: 'rgba(240, 147, 251, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function (context) {
                            const index = context[0].dataIndex;
                            const onNode = data.top_20_dss[index].on_node;
                            const onName = data.top_20_dss[index].on_name;
                            return `${onNode} - ${onName}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#b4b4c8'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });

    // 4. Issue Type Breakdown (Doughnut) with Percentage
    const issueTypeCtx = document.getElementById('issueTypeChart').getContext('2d');

    // Calculate healthy modems
    const healthyModems = data.summary.total_modems - data.summary.usp_dsp_dss_count;

    issueTypeChartInstance = new Chart(issueTypeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Broj dobrih modema', 'Br modema sa PWR problemom', 'Ukupan broj loših modema'],
            datasets: [{
                data: [
                    healthyModems,
                    data.summary.usp_dsp_count,
                    data.summary.usp_dsp_dss_count
                ],
                backgroundColor: [
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(245, 87, 108, 0.8)'
                ],
                borderColor: [
                    'rgba(79, 172, 254, 1)',
                    'rgba(102, 126, 234, 1)',
                    'rgba(245, 87, 108, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 15, 35, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#b4b4c8',
                    borderColor: 'rgba(102, 126, 234, 0.5)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
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
