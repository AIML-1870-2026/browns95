# Pink Heart Network Visualization

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Network Visualization</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #8B0000;
            overflow: hidden;
        }

        canvas {
            display: block;
            background: #8B0000;
        }

        .controls {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 6px 8px;
            border-radius: 5px;
            color: #FF69B4;
            min-width: 110px;
        }

        .control-group {
            margin-bottom: 5px;
        }

        .control-group label {
            display: block;
            margin-bottom: 2px;
            font-size: 9px;
            color: #FF69B4;
        }

        .control-group input[type="range"] {
            width: 100%;
            cursor: pointer;
            height: 3px;
        }

        .control-group .value {
            display: inline-block;
            float: right;
            color: #FFB6C1;
            font-weight: bold;
            font-size: 8px;
        }

        h2 {
            margin-bottom: 5px;
            font-size: 10px;
            color: #FF69B4;
        }

        .statistics {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 8px 10px;
            border-radius: 5px;
            color: #FF69B4;
            min-width: 150px;
        }

        .stat-item {
            margin-bottom: 4px;
            font-size: 9px;
        }

        .stat-label {
            color: #FF69B4;
            font-weight: normal;
        }

        .stat-value {
            color: #FFB6C1;
            font-weight: bold;
            float: right;
        }
    </style>
</head>
<body>
    <canvas id="network"></canvas>

    <div class="statistics">
        <h2>Network Statistics</h2>
        <div class="stat-item">
            <span class="stat-label">Total Edges:</span>
            <span class="stat-value" id="totalEdges">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Connections:</span>
            <span class="stat-value" id="avgConnections">0.0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Network Density:</span>
            <span class="stat-value" id="networkDensity">0.0%</span>
        </div>
    </div>

    <div class="controls">
        <h2>Network Controls</h2>

        <div class="control-group">
            <label>
                Trail Length: <span class="value" id="trailValue">50</span>
            </label>
            <input type="range" id="trailLength" min="10" max="100" value="50">
        </div>

        <div class="control-group">
            <label>
                Node Count: <span class="value" id="nodeValue">500</span>
            </label>
            <input type="range" id="nodeCount" min="100" max="2000" value="500" step="50">
        </div>

        <div class="control-group">
            <label>
                Node Speed: <span class="value" id="speedValue">0.50</span>
            </label>
            <input type="range" id="nodeSpeed" min="0.01" max="2.00" value="0.50" step="0.01">
        </div>

        <div class="control-group">
            <label>
                Spawn Radius: <span class="value" id="radiusValue">5</span>
            </label>
            <input type="range" id="spawnRadius" min="1" max="20" value="5" step="1">
        </div>

        <div class="control-group">
            <label>
                Edge Thickness: <span class="value" id="thicknessValue">2</span>
            </label>
            <input type="range" id="edgeThickness" min="0.5" max="5" value="2" step="0.5">
        </div>

        <div class="control-group">
            <label>
                Connection Distance: <span class="value" id="distanceValue">150</span>
            </label>
            <input type="range" id="connectionDistance" min="50" max="300" value="150" step="10">
        </div>
    </div>

    <script>
        const canvas = document.getElementById('network');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Controls
        const trailLengthSlider = document.getElementById('trailLength');
        const nodeCountSlider = document.getElementById('nodeCount');
        const nodeSpeedSlider = document.getElementById('nodeSpeed');
        const spawnRadiusSlider = document.getElementById('spawnRadius');
        const edgeThicknessSlider = document.getElementById('edgeThickness');
        const connectionDistanceSlider = document.getElementById('connectionDistance');

        const trailValue = document.getElementById('trailValue');
        const nodeValue = document.getElementById('nodeValue');
        const speedValue = document.getElementById('speedValue');
        const radiusValue = document.getElementById('radiusValue');
        const thicknessValue = document.getElementById('thicknessValue');
        const distanceValue = document.getElementById('distanceValue');

        // Statistics elements
        const totalEdgesEl = document.getElementById('totalEdges');
        const avgConnectionsEl = document.getElementById('avgConnections');
        const networkDensityEl = document.getElementById('networkDensity');

        // Animation parameters
        let trailLength = 50;
        let nodeCount = 500;
        let nodeSpeed = 0.50;
        let spawnRadius = 5;
        let edgeThickness = 2;
        let connectionDistance = 150;

        let nodes = [];

        // Function to draw a heart shape
        function drawHeart(ctx, x, y, size, color, opacity) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(size, size);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-0.5, -0.5, -1, -0.2, -1, 0.3);
            ctx.bezierCurveTo(-1, 0.7, -0.5, 1, 0, 1.5);
            ctx.bezierCurveTo(0.5, 1, 1, 0.7, 1, 0.3);
            ctx.bezierCurveTo(1, -0.2, 0.5, -0.5, 0, 0);
            ctx.closePath();

            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.restore();
        }

        class Node {
            constructor() {
                this.reset();
                this.trail = [];
                this.connections = 0;
            }

            reset() {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spawnRadius;

                this.x = canvas.width / 2 + Math.cos(angle) * distance;
                this.y = canvas.height / 2 + Math.sin(angle) * distance;
                this.z = Math.random() * canvas.width;
                this.prevX = this.x;
                this.prevY = this.y;
            }

            update() {
                this.prevX = this.x;
                this.prevY = this.y;

                this.z -= nodeSpeed;

                if (this.z <= 0) {
                    this.reset();
                    this.trail = [];
                    return;
                }

                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                const k = 128 / this.z;
                this.x = (this.x - centerX) * k + centerX;
                this.y = (this.y - centerY) * k + centerY;

                // Update trail
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > trailLength) {
                    this.trail.shift();
                }
            }

            draw() {
                const size = (1 - this.z / canvas.width) * 8;
                const opacity = 1 - this.z / canvas.width;

                // Draw trail with hearts
                if (this.trail.length > 1) {
                    for (let i = 0; i < this.trail.length; i += 3) {
                        const trailOpacity = (i / this.trail.length) * opacity * 0.4;
                        const trailSize = (i / this.trail.length) * size * 0.6;

                        drawHeart(
                            ctx,
                            this.trail[i].x,
                            this.trail[i].y,
                            trailSize,
                            `rgba(255, 182, 193, ${trailOpacity})`,
                            1
                        );
                    }
                }

                // Draw heart node
                drawHeart(ctx, this.x, this.y, size, `rgba(255, 105, 180, ${opacity})`, 1);
            }
        }

        function initNodes() {
            nodes = [];
            for (let i = 0; i < nodeCount; i++) {
                nodes.push(new Node());
            }
        }

        function drawConnections() {
            let totalEdges = 0;
            let totalConnections = 0;

            // Reset connection counts
            nodes.forEach(node => node.connections = 0);

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        totalEdges++;
                        nodes[i].connections++;
                        nodes[j].connections++;

                        const opacity = (1 - distance / connectionDistance) * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(255, 105, 180, ${opacity})`;
                        ctx.lineWidth = edgeThickness;
                        ctx.stroke();
                    }
                }
            }

            // Calculate statistics
            totalConnections = nodes.reduce((sum, node) => sum + node.connections, 0);
            const avgConnections = nodes.length > 0 ? totalConnections / nodes.length : 0;

            // Network density: actual edges / maximum possible edges
            const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
            const density = maxPossibleEdges > 0 ? (totalEdges / maxPossibleEdges) * 100 : 0;

            // Update statistics display
            totalEdgesEl.textContent = totalEdges;
            avgConnectionsEl.textContent = avgConnections.toFixed(1);
            networkDensityEl.textContent = density.toFixed(2) + '%';
        }

        function animate() {
            ctx.fillStyle = 'rgba(139, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw connections first (behind nodes)
            drawConnections();

            // Update and draw nodes
            nodes.forEach(node => {
                node.update();
                node.draw();
            });

            requestAnimationFrame(animate);
        }

        // Event listeners for sliders
        trailLengthSlider.addEventListener('input', (e) => {
            trailLength = parseInt(e.target.value);
            trailValue.textContent = trailLength;
        });

        nodeCountSlider.addEventListener('input', (e) => {
            nodeCount = parseInt(e.target.value);
            nodeValue.textContent = nodeCount;
            initNodes();
        });

        nodeSpeedSlider.addEventListener('input', (e) => {
            nodeSpeed = parseFloat(e.target.value);
            speedValue.textContent = nodeSpeed.toFixed(2);
        });

        spawnRadiusSlider.addEventListener('input', (e) => {
            spawnRadius = parseInt(e.target.value);
            radiusValue.textContent = spawnRadius;
        });

        edgeThicknessSlider.addEventListener('input', (e) => {
            edgeThickness = parseFloat(e.target.value);
            thicknessValue.textContent = edgeThickness;
        });

        connectionDistanceSlider.addEventListener('input', (e) => {
            connectionDistance = parseInt(e.target.value);
            distanceValue.textContent = connectionDistance;
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initNodes();
        });

        // Initialize and start animation
        initNodes();
        animate();
    </script>
</body>
</html>
```
