class FinancialDashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.sveitarfelog = new Set();
        this.hlutar = new Set();
        this.names = new Set();
        this.selectedSveitarfelog = new Set();
        this.selectedHluti = '';
        this.selectedName = '';
        this.colors = d3.scaleOrdinal(d3.schemeCategory10);
        
        // Responsive dimensions
        this.setupResponsiveDimensions();
        
        this.init();
    }

    setupResponsiveDimensions() {
        // Get container width for responsive sizing
        const container = document.getElementById('chart-container') || { clientWidth: 1000 };
        const containerWidth = Math.max(container.clientWidth || 1000, 300); // Minimum 300px
        
        // Responsive margins based on screen size
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024;
        
        if (isMobile) {
            this.margin = { top: 15, right: 20, bottom: 80, left: 60 };
            this.height = 300;
        } else if (isTablet) {
            this.margin = { top: 20, right: 30, bottom: 90, left: 70 };
            this.height = 380;
        } else {
            this.margin = { top: 20, right: 40, bottom: 100, left: 80 };
            this.height = 450;
        }
        
        this.width = Math.min(containerWidth - 40, 1000) - this.margin.left - this.margin.right;
        this.height = this.height - this.margin.top - this.margin.bottom;
    }

    async init() {
        try {
            await this.loadData();
            this.setupChart();
            this.setupControls();
            this.updateChart();
            this.setupResizeListener();
        } catch (error) {
            this.showError('Failed to load data: ' + error.message);
        }
    }

    async loadData() {
        try {
            // Use the embedded data instead of loading CSV
            this.data = FINANCIAL_DATA;

            this.data.forEach(d => {
                this.sveitarfelog.add(d.sveitarfelag);
                this.hlutar.add(d.hluti);
                this.names.add(d.name);
            });

            return Promise.resolve();
        } catch (error) {
            return Promise.reject(new Error('Failed to load embedded data: ' + error.message));
        }
    }

    setupControls() {
        const sveitarfelagSelect = document.getElementById('sveitarfelag');
        const hlutiSelect = document.getElementById('hluti');
        const nameSelect = document.getElementById('name');

        // Setup regular select elements
        sveitarfelagSelect.innerHTML = '';
        Array.from(this.sveitarfelog).sort().forEach(sveitarfelag => {
            const option = document.createElement('option');
            option.value = sveitarfelag;
            option.textContent = sveitarfelag;
            sveitarfelagSelect.appendChild(option);
        });

        // Initialize Selectize for sveitarfelag
        try {
            this.sveitarfelagSelectize = $(sveitarfelagSelect).selectize({
                plugins: ['remove_button'],
                delimiter: ',',
                persist: false,
                create: false,
                placeholder: 'Leitaðu og veldu sveitarfélög...',
                render: {
                    item: function(item, escape) {
                        return '<div>' + escape(item.text) + '</div>';
                    }
                },
                onChange: (values) => {
                    this.selectedSveitarfelog.clear();
                    if (values && values.length > 0) {
                        values.forEach(value => {
                            this.selectedSveitarfelog.add(value);
                        });
                    }
                    this.updateChart();
                }
            })[0].selectize;
        } catch (error) {
            console.error('Selectize initialization failed:', error);
            // Fallback to regular event listener if Selectize fails
            sveitarfelagSelect.addEventListener('change', () => {
                this.selectedSveitarfelog.clear();
                Array.from(sveitarfelagSelect.selectedOptions).forEach(option => {
                    this.selectedSveitarfelog.add(option.value);
                });
                this.updateChart();
            });
        }

        hlutiSelect.innerHTML = '<option value="">Veldu fjárhagshluta...</option>';
        Array.from(this.hlutar).sort().forEach(hluti => {
            const option = document.createElement('option');
            option.value = hluti;
            option.textContent = hluti;
            hlutiSelect.appendChild(option);
        });

        nameSelect.innerHTML = '<option value="">Veldu breytu...</option>';
        Array.from(this.names).sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            nameSelect.appendChild(option);
        });

        // Event listener for sveitarfelag is now handled in Selectize onChange

        hlutiSelect.addEventListener('change', () => {
            this.selectedHluti = hlutiSelect.value;
            this.updateChart();
        });

        nameSelect.addEventListener('change', () => {
            this.selectedName = nameSelect.value;
            this.updateChart();
        });

        // Set default selections
        const defaultSveitarfelog = [
            'Reykjavíkurborg', 
            'Garðabær', 
            'Kópavogsbær', 
            'Hafnarfjarðarkaupstaður', 
            'Seltjarnarnesbær'
        ];
        const defaultName = 'Nettóskuldir sem hlutfall af tekjum';
        const defaultHluti = 'A-hluti';

        // Select default sveitarfelog
        if (this.sveitarfelagSelectize) {
            this.sveitarfelagSelectize.setValue(defaultSveitarfelog);
        } else {
            // Fallback for regular select
            Array.from(sveitarfelagSelect.options).forEach(option => {
                if (defaultSveitarfelog.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
        defaultSveitarfelog.forEach(sveitarfelag => {
            this.selectedSveitarfelog.add(sveitarfelag);
        });

        // Select default hluti
        Array.from(hlutiSelect.options).forEach(option => {
            if (option.value === defaultHluti) {
                option.selected = true;
                this.selectedHluti = defaultHluti;
            }
        });

        // Select default name
        Array.from(nameSelect.options).forEach(option => {
            if (option.value === defaultName) {
                option.selected = true;
                this.selectedName = defaultName;
            }
        });
    }

    setupChart() {
        const container = document.getElementById('chart-container');
        container.innerHTML = '';

        // Calculate total SVG dimensions including legend space
        const legendHeight = 60; // Estimated space for legend
        const totalHeight = this.height + this.margin.top + this.margin.bottom + legendHeight;
        
        this.svg = d3.select('#chart-container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', totalHeight)
            .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${totalHeight}`);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        this.line = d3.line()
            .x(d => this.xScale(d.ar))
            .y(d => this.yScale(d.y))
            .curve(d3.curveMonotoneX);

        this.xAxis = this.g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${this.height})`);

        this.yAxis = this.g.append('g')
            .attr('class', 'axis');

        // Responsive axis label positioning
        const isMobile = window.innerWidth <= 768;
        const xLabelOffset = isMobile ? 25 : 35;
        const yLabelOffset = isMobile ? -35 : -50;
        
        this.xAxisLabel = this.g.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('x', this.width / 2)
            .attr('y', this.height + xLabelOffset)
            .style('font-size', isMobile ? '12px' : '14px')
            .text('Ár');

        this.yAxisLabel = this.g.append('text')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', yLabelOffset)
            .style('font-size', isMobile ? '12px' : '14px');

        this.tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        this.legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.margin.left}, ${this.height + this.margin.top + 50})`);

        this.zeroLine = this.g.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .style('stroke', 'var(--theme-primary)')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.4)
            .style('display', 'none');
    }

    updateChart() {
        if (!this.selectedHluti || !this.selectedName || this.selectedSveitarfelog.size === 0) {
            this.g.selectAll('.line').remove();
            this.g.selectAll('.dot').remove();
            this.legend.selectAll('.legend-item').remove();
            this.zeroLine.style('display', 'none');
            return;
        }

        this.filteredData = this.data.filter(d => 
            this.selectedSveitarfelog.has(d.sveitarfelag) &&
            d.hluti === this.selectedHluti &&
            d.name === this.selectedName
        );

        if (this.filteredData.length === 0) {
            return;
        }

        const groupedData = d3.group(this.filteredData, d => d.sveitarfelag);

        const isPercent = this.filteredData[0].is_percent;
        
        // Helper function to get y value for display
        const getDisplayY = (d) => isPercent ? d.y * 100 : d.y;
        
        this.xScale.domain(d3.extent(this.filteredData, d => d.ar));
        this.yScale.domain(d3.extent(this.filteredData, d => getDisplayY(d)));

        this.xAxis.transition().duration(750).call(d3.axisBottom(this.xScale).tickFormat(d3.format('d')));
        const yAxisFormat = isPercent ? 
            (d => d.toFixed(1) + '%') : 
            d3.format('.2s');
        this.yAxis.transition().duration(750).call(d3.axisLeft(this.yScale).tickFormat(yAxisFormat));

        this.yAxisLabel.text(this.selectedName + (isPercent ? ' (%)' : ''));

        // Update zero line visibility and position
        const yDomain = this.yScale.domain();
        const zeroInRange = yDomain[0] <= 0 && yDomain[1] >= 0;
        
        if (zeroInRange) {
            this.zeroLine
                .style('display', 'block')
                .transition()
                .duration(750)
                .attr('y1', this.yScale(0))
                .attr('y2', this.yScale(0));
        } else {
            this.zeroLine.style('display', 'none');
        }

        // Update line generator for current data type
        const currentLine = d3.line()
            .x(d => this.xScale(d.ar))
            .y(d => this.yScale(getDisplayY(d)))
            .curve(d3.curveMonotoneX);

        const lines = this.g.selectAll('.line')
            .data(Array.from(groupedData.entries()));

        const allLines = lines.enter()
            .append('path')
            .attr('class', 'line')
            .merge(lines);
            
        allLines.transition()
            .duration(750)
            .attr('d', d => currentLine(d[1].sort((a, b) => a.ar - b.ar)))
            .attr('stroke', d => this.colors(d[0]))
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('opacity', 1);

        lines.exit().remove();

        const dots = this.g.selectAll('.dot-group')
            .data(Array.from(groupedData.entries()));

        const dotsEnter = dots.enter()
            .append('g')
            .attr('class', 'dot-group');

        const allDots = dotsEnter.merge(dots);

        const circles = allDots.selectAll('.dot')
            .data(d => d[1].map(point => ({ ...point, sveitarfelag: d[0] })));

        const allCircles = circles.enter()
            .append('circle')
            .attr('class', 'dot')
            .merge(circles);
            
        allCircles.transition()
            .duration(750)
            .attr('cx', d => this.xScale(d.ar))
            .attr('cy', d => this.yScale(getDisplayY(d)))
            .attr('r', 4)
            .attr('fill', d => this.colors(d.sveitarfelag))
            .attr('opacity', 1);

        circles.exit().remove();

        // Add invisible larger circles for better hover detection
        const hoverCircles = allDots.selectAll('.hover-dot')
            .data(d => d[1].map(point => ({ ...point, sveitarfelag: d[0] })));

        hoverCircles.enter()
            .append('circle')
            .attr('class', 'hover-dot')
            .merge(hoverCircles)
            .transition()
            .duration(750)
            .attr('cx', d => this.xScale(d.ar))
            .attr('cy', d => this.yScale(getDisplayY(d)))
            .attr('r', 12)
            .attr('fill', 'transparent')
            .attr('stroke', 'none');

        hoverCircles.exit().remove();
        dots.exit().remove();

        // Add hover effects for municipality highlighting
        allDots.on('mouseenter', (event, d) => {
            const hoveredMunicipality = d[0];
            this.highlightMunicipality(hoveredMunicipality);
        })
        .on('mouseleave', () => {
            this.resetHighlight();
        });
        
        this.g.selectAll('.hover-dot')
            .on('mouseover', (event, d) => {
                this.tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                const formattedValue = isPercent ? 
                    (d.y * 100).toFixed(1) + '%' : 
                    d.y.toLocaleString();
                this.tooltip.html(`
                    <strong>${d.sveitarfelag}</strong><br/>
                    Ár: ${d.ar}<br/>
                    Gildi: ${formattedValue}
                `)
                    .style('left', (event.clientX + 10) + 'px')
                    .style('top', (event.clientY - 28) + 'px')
                    .style('border-left', `4px solid ${this.colors(d.sveitarfelag)}`);
            })
            .on('mousemove', (event, d) => {
                // Update tooltip position as mouse moves
                this.tooltip
                    .style('left', (event.clientX + 10) + 'px')
                    .style('top', (event.clientY - 28) + 'px');
            })
            .on('mouseout', () => {
                this.tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        this.updateLegend(Array.from(groupedData.keys()));
    }

    updateLegend(sveitarfelog) {
        const legendItems = this.legend.selectAll('.legend-item')
            .data(sveitarfelog);

        const legendEnter = legendItems.enter()
            .append('g')
            .attr('class', 'legend-item');

        legendEnter.append('rect')
            .attr('width', 14)
            .attr('height', 14);

        legendEnter.append('text')
            .attr('x', 20)
            .attr('y', 7)
            .attr('dy', '0.35em')
            .style('font-size', window.innerWidth <= 768 ? '10px' : '11px')
            .style('font-family', 'Lato, sans-serif');

        const legendMerge = legendEnter.merge(legendItems);

        legendMerge.select('rect')
            .attr('fill', d => this.colors(d));

        legendMerge.select('text')
            .text(d => d);

        // Calculate dynamic positioning based on text length
        let currentX = 0;
        let currentY = 0;
        const maxWidth = this.width;
        const itemSpacing = 20;
        const lineHeight = 25;

        legendMerge.each(function(d, i) {
            const textElement = d3.select(this).select('text');
            const textWidth = textElement.node().getBBox().width + 20; // Add space for rect and padding
            
            // If this item would exceed the width, move to next line
            if (currentX + textWidth > maxWidth && currentX > 0) {
                currentX = 0;
                currentY += lineHeight;
            }
            
            d3.select(this).attr('transform', `translate(${currentX}, ${currentY})`);
            currentX += textWidth + itemSpacing;
        });

        legendItems.exit().remove();
    }

    highlightMunicipality(hoveredMunicipality) {
        // Highlight the hovered municipality's elements
        this.g.selectAll('.line')
            .transition()
            .duration(200)
            .attr('stroke-width', d => d[0] === hoveredMunicipality ? 3 : 1.5)
            .attr('opacity', d => d[0] === hoveredMunicipality ? 1 : 0.4);
            
        this.g.selectAll('.dot')
            .transition()
            .duration(200)
            .attr('r', d => d.sveitarfelag === hoveredMunicipality ? 5 : 3)
            .attr('opacity', d => d.sveitarfelag === hoveredMunicipality ? 1 : 0.4);
    }

    resetHighlight() {
        // Reset all elements to normal state
        this.g.selectAll('.line')
            .transition()
            .duration(200)
            .attr('stroke-width', 2)
            .attr('opacity', 1);
            
        this.g.selectAll('.dot')
            .transition()
            .duration(200)
            .attr('r', 4)
            .attr('opacity', 1);
    }

    setupResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupResponsiveDimensions();
                this.setupChart();
                this.updateChart();
            }, 250);
        });
    }

    showError(message) {
        const container = document.getElementById('chart-container');
        container.innerHTML = `<div class="alert alert-danger m-4">Villa: ${message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FinancialDashboard();
});