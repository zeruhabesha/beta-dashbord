// ============================================
// SOC DASHBOARD - CORRELATION GRAPH
// D3.js force-directed graph visualization
// ============================================

/**
 * Correlation Graph Manager
 * Handles host/IP correlation visualization using D3.js
 */
class CorrelationGraphManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.svg = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.selectedNode = null;
    }

    /**
     * Initialize the graph
     */
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Clear existing SVG
        container.innerHTML = '';

        // Create SVG
        this.svg = d3.select(`#${this.containerId}`)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'graph-canvas');

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                this.svg.select('g').attr('transform', event.transform);
            });

        this.svg.call(zoom);

        // Create main group
        const g = this.svg.append('g');

        // Create arrow markers for links
        this.svg.append('defs').selectAll('marker')
            .data(['normal', 'suspicious'])
            .enter().append('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', d => d === 'suspicious' ? '#ef4444' : '#4b5563');

        // Load data and render
        this.loadData();
    }

    /**
     * Load graph data
     */
    loadData() {
        const graphData = mockData.generateCorrelationGraph();
        this.nodes = graphData.nodes;
        this.links = graphData.links;
        this.render();
    }

    /**
     * Render the graph
     */
    render() {
        const container = document.getElementById(this.containerId);
        const width = container.clientWidth;
        const height = container.clientHeight;

        const g = this.svg.select('g');

        // Create force simulation
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links)
                .id(d => d.id)
                .distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));

        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(this.links)
            .enter().append('line')
            .attr('class', d => d.suspicious ? 'graph-link suspicious' : 'graph-link')
            .attr('marker-end', d => `url(#arrow-${d.suspicious ? 'suspicious' : 'normal'})`);

        // Create nodes
        const node = g.append('g')
            .selectAll('g')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', d => {
                let classes = 'graph-node';
                if (d.type === 'host') classes += ' host';
                else if (d.type === 'source-ip') classes += ' source-ip';
                else if (d.type === 'dest-ip') classes += ' dest-ip';
                if (d.suspicious) classes += ' suspicious';
                return classes;
            })
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d)))
            .on('click', (event, d) => this.nodeClicked(event, d));

        // Add circles to nodes
        node.append('circle')
            .attr('r', d => {
                if (d.type === 'host') return 12;
                if (d.type === 'source-ip') return 10;
                return 8;
            });

        // Add labels to nodes
        node.append('text')
            .attr('dx', 15)
            .attr('dy', 4)
            .text(d => d.name);

        // Update positions on simulation tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    /**
     * Drag handlers
     */
    dragStarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    /**
     * Node click handler
     */
    nodeClicked(event, d) {
        this.selectedNode = d;
        console.log('Selected node:', d);

        // Highlight connected nodes and links
        this.highlightConnections(d);

        // Trigger event for filtering
        window.dispatchEvent(new CustomEvent('nodeSelected', {
            detail: { node: d }
        }));
    }

    /**
     * Highlight connections for selected node
     */
    highlightConnections(selectedNode) {
        const connectedNodeIds = new Set();

        // Find connected nodes
        this.links.forEach(link => {
            if (link.source.id === selectedNode.id) {
                connectedNodeIds.add(link.target.id);
            }
            if (link.target.id === selectedNode.id) {
                connectedNodeIds.add(link.source.id);
            }
        });

        // Update node opacity
        this.svg.selectAll('.graph-node')
            .style('opacity', d => {
                if (d.id === selectedNode.id || connectedNodeIds.has(d.id)) {
                    return 1;
                }
                return 0.3;
            });

        // Update link opacity
        this.svg.selectAll('.graph-link')
            .style('opacity', d => {
                if (d.source.id === selectedNode.id || d.target.id === selectedNode.id) {
                    return 1;
                }
                return 0.1;
            });
    }

    /**
     * Reset highlighting
     */
    resetHighlight() {
        this.svg.selectAll('.graph-node').style('opacity', 1);
        this.svg.selectAll('.graph-link').style('opacity', 0.6);
        this.selectedNode = null;
    }

    /**
     * Refresh graph data
     */
    refresh() {
        this.loadData();
    }

    /**
     * Destroy the graph
     */
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.svg) {
            this.svg.remove();
        }
    }
}

// Export for use in other modules
let correlationGraph = null;

function initCorrelationGraph(containerId) {
    if (correlationGraph) {
        correlationGraph.destroy();
    }
    correlationGraph = new CorrelationGraphManager(containerId);
    correlationGraph.init();
    return correlationGraph;
}
