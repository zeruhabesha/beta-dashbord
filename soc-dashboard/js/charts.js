// ============================================
// SOC DASHBOARD - CHART RENDERING
// Chart.js configuration and rendering
// ============================================

/**
 * Chart Manager
 * Handles all chart rendering using Chart.js
 */
class ChartManager {
    constructor() {
        this.charts = {};
        this.defaultOptions = this.getDefaultOptions();
    }

    /**
     * Get default Chart.js options for dark theme
     */
    getDefaultOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            family: 'Inter, sans-serif',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1d29',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {}
                }
            },
            scales: {}
        };
    }

    /**
     * Destroy existing chart if it exists
     */
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    /**
     * Create line chart
     */
    createLineChart(canvasId, data, options = {}) {
        this.destroyChart(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const config = {
            type: 'line',
            data: data,
            options: {
                ...this.defaultOptions,
                ...options,
                scales: {
                    x: {
                        grid: {
                            color: '#374151',
                            borderColor: '#4b5563'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#374151',
                            borderColor: '#4b5563'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            }
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    /**
     * Create bar chart
     */
    createBarChart(canvasId, data, options = {}) {
        this.destroyChart(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const config = {
            type: 'bar',
            data: data,
            options: {
                ...this.defaultOptions,
                ...options,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#374151',
                            borderColor: '#4b5563'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 11
                            }
                        },
                        beginAtZero: true
                    }
                },
                indexAxis: options.indexAxis || 'x'
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    /**
     * Create doughnut chart
     */
    createDoughnutChart(canvasId, data, options = {}) {
        this.destroyChart(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                ...this.defaultOptions,
                ...options,
                cutout: '70%',
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#cbd5e1',
                            font: {
                                family: 'Inter, sans-serif',
                                size: 12
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        };

        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }

    /**
     * Update chart data
     */
    updateChart(chartId, newData) {
        if (!this.charts[chartId]) return;

        this.charts[chartId].data = newData;
        this.charts[chartId].update('none'); // No animation for performance
    }

    /**
     * Render event timeline chart
     */
    renderEventTimeline(canvasId) {
        const data = mockData.generateEventTimeline();
        return this.createLineChart(canvasId, data, {
            plugins: {
                title: {
                    display: false
                }
            }
        });
    }

    /**
     * Render severity distribution chart
     */
    renderSeverityDistribution(canvasId) {
        const data = mockData.generateSeverityDistribution();
        return this.createDoughnutChart(canvasId, data);
    }

    /**
     * Render top rules chart
     */
    renderTopRules(canvasId) {
        const data = mockData.generateTopRules();
        return this.createBarChart(canvasId, data, {
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            }
        });
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }
}

// Initialize chart manager
const chartManager = new ChartManager();
