document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const reportForm = document.getElementById('report-form');
    const categoriesContainer = document.getElementById('categories-container');
    const regionsContainer = document.getElementById('regions-container');
    const reportContainer = document.getElementById('report-container');
    const dataTableBody = document.getElementById('data-table-body');
    const loadingIndicator = document.getElementById('loading');
    const dataPreviewHeader = document.getElementById('data-preview-header');
    const dataPreviewContent = document.getElementById('data-preview-content');
    
    // Charts and metrics elements
    const totalRevenueEl = document.getElementById('total-revenue');
    const unitsSoldEl = document.getElementById('units-sold');
    const revenueGrowthEl = document.getElementById('revenue-growth');
    const avgPriceEl = document.getElementById('avg-price');
    const monthlyRevenueChartEl = document.getElementById('monthly-revenue-chart');
    const categoryChartEl = document.getElementById('category-chart');
    const topProductsChartEl = document.getElementById('top-products-chart');
    const regionChartEl = document.getElementById('region-chart');
    const lowStockTableBody = document.getElementById('low-stock-body');
    const restockChartEl = document.getElementById('restock-chart');
    
    // Chart instances
    let monthlyRevenueChart, categoryChart, topProductsChart, regionChart, restockChart;
    
    // Store unique categories and regions
    let categories = new Set();
    let regions = new Set();
    
    // Initialize collapsible sections
    dataPreviewHeader.addEventListener('click', function() {
        dataPreviewHeader.classList.toggle('active');
        dataPreviewContent.classList.toggle('hidden');
    });

    // Fetch initial data
    fetchData();

    // Event listeners
    reportForm.addEventListener('submit', handleReportGeneration);

    // Functions
    function fetchData() {
        fetch('/data')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                return response.json();
            })
            .then(data => {
                // Process the data
                const salesData = data.data;
                processData(salesData);
                populateDataTable(salesData.slice(0, 10)); // Show only first 10 rows
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                reportContainer.innerHTML = `<p class="error">Error loading data: ${error.message}</p>`;
            });
    }

    function processData(salesData) {
        // Extract unique categories and regions
        salesData.forEach(item => {
            if (item.Category) categories.add(item.Category);
            if (item.Region) regions.add(item.Region);
        });

        // Populate filter options
        populateCheckboxes(categoriesContainer, categories, 'category');
        populateCheckboxes(regionsContainer, regions, 'region');
    }

    function populateCheckboxes(container, items, prefix) {
        container.innerHTML = ''; // Clear existing items
        
        // Add "Select All" option
        const allItemDiv = document.createElement('div');
        allItemDiv.className = 'checkbox-item';
        
        const allItemCheckbox = document.createElement('input');
        allItemCheckbox.type = 'checkbox';
        allItemCheckbox.id = `${prefix}-all`;
        allItemCheckbox.name = `${prefix}-all`;
        allItemCheckbox.checked = true;
        allItemCheckbox.addEventListener('change', handleSelectAllChange);
        
        const allItemLabel = document.createElement('label');
        allItemLabel.htmlFor = `${prefix}-all`;
        allItemLabel.textContent = 'Select All';
        
        allItemDiv.appendChild(allItemCheckbox);
        allItemDiv.appendChild(allItemLabel);
        container.appendChild(allItemDiv);

        // Add individual items
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${prefix}-${item}`;
            checkbox.name = prefix;
            checkbox.value = item;
            checkbox.checked = true;
            checkbox.className = `${prefix}-checkbox`;
            checkbox.addEventListener('change', handleIndividualCheckboxChange);
            
            const label = document.createElement('label');
            label.htmlFor = `${prefix}-${item}`;
            label.textContent = item;
            
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            container.appendChild(itemDiv);
        });

        function handleSelectAllChange(e) {
            const isChecked = e.target.checked;
            document.querySelectorAll(`.${prefix}-checkbox`).forEach(cb => {
                cb.checked = isChecked;
            });
        }

        function handleIndividualCheckboxChange() {
            const allChecked = Array.from(document.querySelectorAll(`.${prefix}-checkbox`))
                .every(cb => cb.checked);
            document.getElementById(`${prefix}-all`).checked = allChecked;
        }
    }

    function populateDataTable(data) {
        dataTableBody.innerHTML = ''; // Clear existing rows
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            // Format date for better readability
            const formattedDate = new Date(item.Date).toLocaleDateString();
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${item['Product Name']}</td>
                <td>${item['Units Sold']}</td>
                <td>$${parseFloat(item.Revenue).toFixed(2)}</td>
                <td>${item.Category}</td>
                <td>${item.Region}</td>
            `;
            
            dataTableBody.appendChild(row);
        });
    }

    function handleReportGeneration(e) {
        e.preventDefault();
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        // Get selected time period
        const timePeriod = document.getElementById('time-period').value;
        
        // Get selected categories
        const selectedCategories = [];
        if (!document.getElementById('category-all').checked) {
            document.querySelectorAll('.category-checkbox:checked').forEach(cb => {
                selectedCategories.push(cb.value);
            });
        }
        
        // Get selected regions
        const selectedRegions = [];
        if (!document.getElementById('region-all').checked) {
            document.querySelectorAll('.region-checkbox:checked').forEach(cb => {
                selectedRegions.push(cb.value);
            });
        }
        
        // Prepare request payload
        const payload = {
            time_period: timePeriod,
            categories: selectedCategories.length > 0 ? selectedCategories : null,
            regions: selectedRegions.length > 0 ? selectedRegions : null
        };
        
        console.log("Sending report request with payload:", payload);
        
        // Add a timeout to ensure loading doesn't hang indefinitely
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Request timeout - server took too long to respond")), 30000);
        });
        
        // Send request to API
        const fetchPromise = fetch('/generate-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        // Race the fetch against the timeout
        Promise.race([fetchPromise, timeoutPromise])
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Hide loading indicator
                loadingIndicator.classList.add('hidden');
                
                console.log("Received report data:", data);
                
                // Check for error in metrics
                if (data.metrics && data.metrics.error) {
                    reportContainer.innerHTML = `<p class="error">${data.report_text || data.metrics.error}</p>`;
                    return;
                }
                
                // Update the dashboard with the retrieved metrics
                updateDashboard(data.metrics, data.report_text);
            })
            .catch(error => {
                // Hide loading indicator and show error
                loadingIndicator.classList.add('hidden');
                console.error("Error generating report:", error);
                reportContainer.innerHTML = `<p class="error">Error generating report: ${error.message}</p>`;
                
                // Reset any partial UI updates
                totalRevenueEl.textContent = '$0.00';
                unitsSoldEl.textContent = '0';
                revenueGrowthEl.textContent = 'N/A';
                avgPriceEl.textContent = '$0.00';
            });
    }

    function updateDashboard(metrics, reportText) {
        try {
            console.log("Updating dashboard with metrics:", metrics);
            console.log("Report text:", reportText);
            
            // 1. Update key metrics cards
            totalRevenueEl.textContent = formatCurrency(metrics.total_revenue || 0);
            unitsSoldEl.textContent = formatNumber(metrics.total_units_sold || 0);
            
            if (metrics.revenue_growth !== undefined) {
                const growth = parseFloat(metrics.revenue_growth);
                revenueGrowthEl.style.color = growth >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                
                // Add an arrow icon
                const icon = growth >= 0 ? '↑' : '↓';
                revenueGrowthEl.textContent = `${icon} ${Math.abs(growth).toFixed(1)}%`;
            } else {
                revenueGrowthEl.textContent = 'N/A';
            }
            
            avgPriceEl.textContent = formatCurrency(metrics.average_unit_price || 0);
            
            // 2. Update the AI-generated report
            if (reportText) {
                // Format the report text with proper paragraphs
                let formattedReport;
                
                // Check if the text contains markdown-style headers
                if (reportText.includes('##') || reportText.includes('#')) {
                    // Basic markdown conversion for headers
                    formattedReport = reportText
                        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
                        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
                        .split('\n\n')
                        .map(paragraph => paragraph.trim() ? 
                            (paragraph.startsWith('<h') ? paragraph : `<p>${paragraph}</p>`) : '')
                        .join('');
                } else {
                    // Simple paragraph splitting
                    formattedReport = reportText
                        .split('\n\n')
                        .map(paragraph => paragraph.trim() ? `<p>${paragraph}</p>` : '')
                        .join('');
                }
                
                // Ensure any single newlines within paragraphs are preserved as <br>
                formattedReport = formattedReport.replace(/<p>(.*?)\n(.*?)<\/p>/g, '<p>$1<br>$2</p>');
                
                reportContainer.innerHTML = formattedReport || '<p>No report was generated</p>';
            } else {
                reportContainer.innerHTML = '<p>No report data received from the API</p>';
            }
            
            // 3. Generate charts - wrap in try/catch to prevent one chart failure from breaking all
            try { generateMonthlyRevenueChart(metrics); } catch (err) { console.error("Error generating monthly chart:", err); }
            try { generateCategoryChart(metrics); } catch (err) { console.error("Error generating category chart:", err); }
            try { generateTopProductsChart(metrics); } catch (err) { console.error("Error generating products chart:", err); }
            try { generateRegionChart(metrics); } catch (err) { console.error("Error generating region chart:", err); }
            
            // 4. Update inventory tables and charts
            try { updateInventorySection(metrics); } catch (err) { console.error("Error updating inventory section:", err); }
        } catch (error) {
            console.error("Error in updateDashboard:", error);
            reportContainer.innerHTML = `<p class="error">Error updating dashboard: ${error.message}</p>`;
        }
    }

    function generateMonthlyRevenueChart(metrics) {
        if (!metrics.monthly_data) return;
        
        const months = Object.keys(metrics.monthly_data);
        const revenues = months.map(month => metrics.monthly_data[month].revenue);
        const unitsSold = months.map(month => metrics.monthly_data[month].units_sold);
        
        // Destroy previous chart if it exists
        if (monthlyRevenueChart) {
            monthlyRevenueChart.destroy();
        }
        
        monthlyRevenueChart = new ApexCharts(monthlyRevenueChartEl, {
            chart: {
                type: 'line',
                height: 280,
                toolbar: {
                    show: false
                },
                fontFamily: "'Segoe UI', sans-serif"
            },
            series: [
                {
                    name: 'Revenue',
                    type: 'column',
                    data: revenues
                },
                {
                    name: 'Units Sold',
                    type: 'line',
                    data: unitsSold
                }
            ],
            stroke: {
                curve: 'smooth',
                width: [0, 3]
            },
            xaxis: {
                categories: months,
                labels: {
                    style: {
                        colors: '#7f8c8d'
                    }
                }
            },
            yaxis: [
                {
                    title: {
                        text: 'Revenue',
                        style: {
                            color: '#3498db'
                        }
                    },
                    labels: {
                        formatter: function(val) {
                            return '$' + val.toFixed(0);
                        },
                        style: {
                            colors: '#7f8c8d'
                        }
                    }
                },
                {
                    opposite: true,
                    title: {
                        text: 'Units Sold',
                        style: {
                            color: '#e74c3c'
                        }
                    },
                    labels: {
                        style: {
                            colors: '#7f8c8d'
                        }
                    }
                }
            ],
            dataLabels: {
                enabled: false
            },
            colors: ['#3498db', '#e74c3c'],
            tooltip: {
                y: {
                    formatter: function(val, { seriesIndex }) {
                        if (seriesIndex === 0) {
                            return '$' + val.toFixed(2);
                        }
                        return val;
                    }
                }
            }
        });
        
        monthlyRevenueChart.render();
    }

    function generateCategoryChart(metrics) {
        if (!metrics.category_performance) return;
        
        const categories = Object.keys(metrics.category_performance);
        const categoryRevenues = categories.map(category => metrics.category_performance[category].Revenue);
        
        // Destroy previous chart if it exists
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        categoryChart = new ApexCharts(categoryChartEl, {
            chart: {
                type: 'pie',
                height: 280
            },
            series: categoryRevenues,
            labels: categories,
            legend: {
                position: 'bottom'
            },
            colors: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'],
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }],
            tooltip: {
                y: {
                    formatter: function(val) {
                        return '$' + val.toFixed(2);
                    }
                }
            }
        });
        
        categoryChart.render();
    }

    function generateTopProductsChart(metrics) {
        if (!metrics.top_products) return;
        
        const products = Object.keys(metrics.top_products);
        const productRevenues = products.map(product => metrics.top_products[product].Revenue);
        
        // Calculate percentage of total
        const total = productRevenues.reduce((sum, val) => sum + val, 0);
        const percentages = productRevenues.map(val => ((val / metrics.total_revenue) * 100).toFixed(1));
        
        // Destroy previous chart if it exists
        if (topProductsChart) {
            topProductsChart.destroy();
        }
        
        topProductsChart = new ApexCharts(topProductsChartEl, {
            chart: {
                type: 'bar',
                height: 280,
                toolbar: {
                    show: false
                }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        position: 'top',
                    },
                }
            },
            series: [{
                name: 'Revenue',
                data: productRevenues
            }],
            dataLabels: {
                enabled: true,
                offsetX: 30,
                style: {
                    fontSize: '12px',
                    colors: ['#304758']
                },
                formatter: function(val, opt) {
                    return '$' + val.toFixed(0) + ' (' + percentages[opt.dataPointIndex] + '%)';
                }
            },
            xaxis: {
                categories: products,
                labels: {
                    style: {
                        colors: '#7f8c8d'
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#7f8c8d'
                    }
                }
            },
            colors: ['#3498db'],
            tooltip: {
                y: {
                    formatter: function(val) {
                        return '$' + val.toFixed(2);
                    }
                }
            }
        });
        
        topProductsChart.render();
    }

    function generateRegionChart(metrics) {
        if (!metrics.region_performance) return;
        
        const regions = Object.keys(metrics.region_performance);
        const regionRevenues = regions.map(region => metrics.region_performance[region].Revenue);
        const regionUnitsSold = regions.map(region => metrics.region_performance[region]["Units Sold"]);
        
        // Destroy previous chart if it exists
        if (regionChart) {
            regionChart.destroy();
        }
        
        regionChart = new ApexCharts(regionChartEl, {
            chart: {
                type: 'radar',
                height: 280,
                toolbar: {
                    show: false
                }
            },
            series: [
                {
                    name: 'Revenue',
                    data: regionRevenues
                },
                {
                    name: 'Units Sold',
                    data: regionUnitsSold
                }
            ],
            labels: regions,
            yaxis: {
                show: false
            },
            xaxis: {
                labels: {
                    style: {
                        colors: Array(regions.length).fill('#7f8c8d')
                    }
                }
            },
            colors: ['#3498db', '#e74c3c'],
            markers: {
                size: 4
            },
            tooltip: {
                y: {
                    formatter: function(val, { seriesIndex }) {
                        if (seriesIndex === 0) {
                            return '$' + val.toFixed(2);
                        }
                        return val;
                    }
                }
            }
        });
        
        regionChart.render();
    }

    function updateInventorySection(metrics) {
        // Update low stock table
        updateLowStockTable(metrics.low_stock_items || {});
        
        // Generate restock chart
        generateRestockChart(metrics.restock_needed || []);
    }

    function updateLowStockTable(lowStockItems) {
        lowStockTableBody.innerHTML = '';
        
        const itemEntries = Object.entries(lowStockItems);
        
        if (itemEntries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" class="centered">No low stock items</td>`;
            lowStockTableBody.appendChild(row);
            return;
        }
        
        itemEntries.forEach(([product, level]) => {
            const row = document.createElement('tr');
            
            // Determine status based on inventory level
            let statusClass = 'status-ok';
            let statusText = 'OK';
            
            if (level <= 5) {
                statusClass = 'status-critical';
                statusText = 'Critical';
            } else if (level <= 15) {
                statusClass = 'status-warning';
                statusText = 'Low';
            }
            
            row.innerHTML = `
                <td>${product}</td>
                <td>${level}</td>
                <td><span class="status-indicator ${statusClass}">${statusText}</span></td>
            `;
            
            lowStockTableBody.appendChild(row);
        });
    }

    function generateRestockChart(restockItems) {
        if (!restockItems || restockItems.length === 0) {
            restockChartEl.innerHTML = '<p class="centered">No restock recommendations available</p>';
            return;
        }
        
        // Take only top 5 items for clarity
        const items = restockItems.slice(0, 5);
        
        const products = items.map(item => item.product);
        const inventory = items.map(item => item.current_inventory);
        const sales = items.map(item => item.monthly_sales);
        
        // Destroy previous chart if it exists
        if (restockChart) {
            restockChart.destroy();
        }
        
        restockChart = new ApexCharts(restockChartEl, {
            chart: {
                type: 'bar',
                height: 280,
                stacked: true,
                toolbar: {
                    show: false
                }
            },
            plotOptions: {
                bar: {
                    horizontal: true
                }
            },
            series: [
                {
                    name: 'Current Inventory',
                    data: inventory
                },
                {
                    name: 'Monthly Sales (Deficit)',
                    data: sales.map((sale, i) => Math.max(0, sale - inventory[i]))
                }
            ],
            xaxis: {
                categories: products,
                labels: {
                    style: {
                        colors: '#7f8c8d'
                    }
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#7f8c8d'
                    }
                }
            },
            colors: ['#3498db', '#e74c3c'],
            legend: {
                position: 'top'
            },
            tooltip: {
                y: {
                    formatter: function(val) {
                        return val.toFixed(0) + ' units';
                    }
                }
            }
        });
        
        restockChart.render();
    }

    // Utility functions
    function formatCurrency(value) {
        return '$' + parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function formatNumber(value) {
        return parseFloat(value).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    // Add this code to your existing JavaScript file

    // Function to handle the report display
    function displayReport(reportContent) {
        const reportContainer = document.getElementById('report-container');
        
        // Clear any existing content
        reportContainer.innerHTML = '';
        
        // Convert the plain text into HTML with proper styling
        // The reportContent might already contain markdown elements like ## for headers
        reportContainer.innerHTML = reportContent;
        
        // Add event listeners for report actions
        setupReportActions();
    }

    // Setup report action buttons
    function setupReportActions() {
        // Download report as PDF or text
        document.getElementById('download-report')?.addEventListener('click', function() {
            const reportContent = document.getElementById('report-container').innerText;
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'business_report.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        
        // Print report
        document.getElementById('print-report')?.addEventListener('click', function() {
            const reportContainer = document.getElementById('report-container');
            const printWindow = window.open('', '', 'height=600,width=800');
            
            printWindow.document.write('<html><head><title>Business Summary Report</title>');
            // Add some basic styling for the print view
            printWindow.document.write('<style>body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write('<h1>Business Summary Report</h1>');
            printWindow.document.write(reportContainer.innerHTML);
            printWindow.document.write('</body></html>');
            
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
        });
    }

    // Make sure to call this function when updating the report content
    // Assuming you have a function that receives the report from the backend:
    // function updateReport(reportData) {
    //     displayReport(reportData.content);
    // }
});
