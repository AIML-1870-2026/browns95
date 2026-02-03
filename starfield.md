# Pink Heart Starfield

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Starfield with Trails</title>
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
    </style>
</head>
<body>
    <canvas id="starfield"></canvas>

    <div class="controls">
        <h2>Starfield Controls</h2>

        <div class="control-group">
            <label>
                Trail Length: <span class="value" id="trailValue">50</span>
            </label>
            <input type="range" id="trailLength" min="10" max="100" value="50">
        </div>

        <div class="control-group">
            <label>
                Star Count: <span class="value" id="countValue">500</span>
            </label>
            <input type="range" id="starCount" min="100" max="2000" value="500" step="50">
        </div>

        <div class="control-group">
            <label>
                Star Speed: <span class="value" id="speedValue">0.50</span>
            </label>
            <input type="range" id="starSpeed" min="0.01" max="2.00" value="0.50" step="0.01">
        </div>

        <div class="control-group">
            <label>
                Spawn Radius: <span class="value" id="radiusValue">5</span>
            </label>
            <input type="range" id="spawnRadius" min="1" max="20" value="5" step="1">
        </div>
    </div>

    <script>
        const canvas = document.getElementById('starfield');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Controls
        const trailLengthSlider = document.getElementById('trailLength');
        const starCountSlider = document.getElementById('starCount');
        const starSpeedSlider = document.getElementById('starSpeed');
        const spawnRadiusSlider = document.getElementById('spawnRadius');

        const trailValue = document.getElementById('trailValue');
        const countValue = document.getElementById('countValue');
        const speedValue = document.getElementById('speedValue');
        const radiusValue = document.getElementById('radiusValue');

        // Animation parameters
        let trailLength = 50;
        let starCount = 500;
        let starSpeed = 0.50;
        let spawnRadius = 5;

        let stars = [];

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

        class Star {
            constructor() {
                this.reset();
                this.trail = [];
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

                this.z -= starSpeed;

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

                // Draw heart star
                drawHeart(ctx, this.x, this.y, size, `rgba(255, 105, 180, ${opacity})`, 1);
            }
        }

        function initStars() {
            stars = [];
            for (let i = 0; i < starCount; i++) {
                stars.push(new Star());
            }
        }

        function animate() {
            ctx.fillStyle = 'rgba(139, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            stars.forEach(star => {
                star.update();
                star.draw();
            });

            requestAnimationFrame(animate);
        }

        // Event listeners for sliders
        trailLengthSlider.addEventListener('input', (e) => {
            trailLength = parseInt(e.target.value);
            trailValue.textContent = trailLength;
        });

        starCountSlider.addEventListener('input', (e) => {
            starCount = parseInt(e.target.value);
            countValue.textContent = starCount;
            initStars();
        });

        starSpeedSlider.addEventListener('input', (e) => {
            starSpeed = parseFloat(e.target.value);
            speedValue.textContent = starSpeed.toFixed(2);
        });

        spawnRadiusSlider.addEventListener('input', (e) => {
            spawnRadius = parseInt(e.target.value);
            radiusValue.textContent = spawnRadius;
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        });

        // Initialize and start animation
        initStars();
        animate();
    </script>
</body>
</html>
```
