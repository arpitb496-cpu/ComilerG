/**
 * CompilerG - Interactive 3D Turbo Execution Core
 * Bespoke WebGL Three.js interactive 3D architecture for the front page.
 * Features:
 * - Multifaceted Obsidian Glass & Radiant Celestial Gold Geodesic Core
 * - Dynamic Gyroscopic Concentric Quantum Rings with orbital data nodes
 * - Smooth Drag-to-Rotate Physics with Inertia & Momentum Damping
 * - Real-time Mode Switching (Quantum Core, Obsidian Glass, Blueprint Wire)
 * - Battery & GPU friendly (Auto-pauses when out of viewport via IntersectionObserver)
 * - 3D Perspective Parallax Tilt on the Workspace Mockup Window
 */

(function () {
    'use strict';

    function init3DEngine() {
        const container = document.getElementById('engine3dCanvasContainer');
        if (!container || typeof THREE === 'undefined') return;

        const width = container.clientWidth || 500;
        const height = container.clientHeight || 440;

        // Scene, Camera & WebGL Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 8.5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        container.appendChild(renderer.domElement);

        // Lighting Rig
        const ambientLight = new THREE.AmbientLight(0xffeedd, 0.65);
        scene.add(ambientLight);

        const goldLight1 = new THREE.PointLight(0xffd43f, 2.8, 30);
        goldLight1.position.set(5, 5, 5);
        scene.add(goldLight1);

        const amberLight2 = new THREE.PointLight(0xf59e0b, 2.2, 30);
        amberLight2.position.set(-5, -5, 5);
        scene.add(amberLight2);

        const topRimLight = new THREE.DirectionalLight(0xfff8db, 1.4);
        topRimLight.position.set(0, 10, 2);
        scene.add(topRimLight);

        // Main 3D Core Group
        const coreGroup = new THREE.Group();
        scene.add(coreGroup);

        // 1. Outer Polyhedron: Faceted Obsidian Crystal
        const outerGeo = new THREE.IcosahedronGeometry(2.3, 1);

        const obsidianMat = new THREE.MeshPhysicalMaterial({
            color: 0x140e08,
            emissive: 0x180d04,
            metalness: 0.88,
            roughness: 0.18,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 0.95,
            transparent: true,
            opacity: 0.88,
            flatShading: true
        });

        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xffd43f,
            wireframe: true,
            transparent: true,
            opacity: 0.85
        });

        const outerMesh = new THREE.Mesh(outerGeo, obsidianMat);
        coreGroup.add(outerMesh);

        // Radiant Golden Laser Wireframe Edges
        const wireGeo = new THREE.WireframeGeometry(outerGeo);
        const wireEdges = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({
            color: 0xffd43f,
            transparent: true,
            opacity: 0.45
        }));
        coreGroup.add(wireEdges);

        // 2. Inner Pulsating Core (Nested Quantum Reactor)
        const innerGeo = new THREE.IcosahedronGeometry(1.2, 0);
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0xffd43f,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.85,
            roughness: 0.28,
            metalness: 0.5,
            flatShading: true
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        coreGroup.add(innerMesh);

        // 3. Dual Concentric Gyroscopic Rings
        const ringGeo1 = new THREE.TorusGeometry(3.2, 0.025, 16, 120);
        const ringMat1 = new THREE.MeshStandardMaterial({
            color: 0xffd43f,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.45,
            metalness: 0.9,
            roughness: 0.2
        });
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = Math.PI / 3;
        coreGroup.add(ring1);

        const ringGeo2 = new THREE.TorusGeometry(3.6, 0.02, 16, 120);
        const ringMat2 = new THREE.MeshStandardMaterial({
            color: 0xdeb887,
            emissive: 0xd97706,
            emissiveIntensity: 0.35,
            metalness: 0.9,
            roughness: 0.2
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.y = Math.PI / 4;
        ring2.rotation.z = Math.PI / 6;
        coreGroup.add(ring2);

        // 4. Floating Satellite Nodes (Orbital Code Packets)
        const satellites = [];
        const satGeo = new THREE.OctahedronGeometry(0.18, 0);
        const satMat = new THREE.MeshStandardMaterial({
            color: 0xfff8db,
            emissive: 0xffd43f,
            emissiveIntensity: 0.9,
            roughness: 0.2
        });

        for (let i = 0; i < 8; i++) {
            const sat = new THREE.Mesh(satGeo, satMat);
            const angle = (i / 8) * Math.PI * 2;
            const dist = 3.2;
            sat.position.set(Math.cos(angle) * dist, Math.sin(i * 1.5) * 0.8, Math.sin(angle) * dist);
            coreGroup.add(sat);
            satellites.push({
                mesh: sat,
                angle: angle,
                speed: 0.012 + (i % 3) * 0.004,
                dist: dist,
                yOff: Math.sin(i * 1.5) * 0.8
            });
        }

        // --- Interaction Physics (Drag & Inertia) ---
        let isDragging = false;
        let prevMousePos = { x: 0, y: 0 };
        let targetRotation = { x: 0.2, y: 0.4 };
        let isVisibleOnScreen = true;

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            prevMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - prevMousePos.x;
                const deltaY = e.clientY - prevMousePos.y;
                targetRotation.x += deltaY * 0.005;
                targetRotation.y += deltaX * 0.005;
                prevMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        // Touch support
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: true });

        window.addEventListener('touchend', () => { isDragging = false; });
        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - prevMousePos.x;
                const deltaY = e.touches[0].clientY - prevMousePos.y;
                targetRotation.x += deltaY * 0.005;
                targetRotation.y += deltaX * 0.005;
                prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: true });

        // Click on Core -> Trigger Celebratory Burst
        container.addEventListener('click', (e) => {
            if (Math.abs(e.clientX - prevMousePos.x) < 5 && Math.abs(e.clientY - prevMousePos.y) < 5) {
                targetRotation.y += 0.8;
                innerMat.emissiveIntensity = 2.0;
                setTimeout(() => {
                    innerMat.emissiveIntensity = 0.85;
                }, 400);
            }
        });

        // Mode Switching
        const ctrlButtons = container.querySelectorAll('.engine-ctrl-btn');
        ctrlButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                ctrlButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                if (mode === 'quantum') {
                    outerMesh.visible = true;
                    outerMesh.material = obsidianMat;
                    innerMesh.visible = true;
                    ring1.visible = true;
                    ring2.visible = true;
                    wireEdges.visible = true;
                } else if (mode === 'obsidian') {
                    outerMesh.visible = true;
                    outerMesh.material = obsidianMat;
                    innerMesh.visible = false;
                    ring1.visible = false;
                    ring2.visible = false;
                    wireEdges.visible = false;
                } else if (mode === 'wireframe') {
                    outerMesh.visible = true;
                    outerMesh.material = wireMat;
                    innerMesh.visible = true;
                    ring1.visible = true;
                    ring2.visible = true;
                    wireEdges.visible = false;
                }
            });
        });

        // Animation Loop with Clock
        const clock = new THREE.Clock();

        function renderFrame() {
            if (!isVisibleOnScreen) {
                requestAnimationFrame(renderFrame);
                return;
            }

            requestAnimationFrame(renderFrame);
            const time = clock.getElapsedTime();

            if (!isDragging) {
                targetRotation.y += 0.0035;
                targetRotation.x += Math.sin(time * 0.6) * 0.0006;
            }

            // Smooth interpolation
            coreGroup.rotation.x += (targetRotation.x - coreGroup.rotation.x) * 0.08;
            coreGroup.rotation.y += (targetRotation.y - coreGroup.rotation.y) * 0.08;

            // Inner core counter-rotation and pulsing
            innerMesh.rotation.y -= 0.01;
            innerMesh.rotation.z += 0.008;
            const pulse = 1 + Math.sin(time * 2.5) * 0.07;
            innerMesh.scale.set(pulse, pulse, pulse);

            // Ring rotations
            ring1.rotation.z += 0.008;
            ring2.rotation.x -= 0.006;

            // Satellite orbits
            satellites.forEach(sat => {
                sat.angle += sat.speed;
                sat.mesh.position.x = Math.cos(sat.angle) * sat.dist;
                sat.mesh.position.z = Math.sin(sat.angle) * sat.dist;
                sat.mesh.position.y = sat.yOff + Math.sin(time * 2 + sat.angle) * 0.25;
                sat.mesh.rotation.x += 0.02;
                sat.mesh.rotation.y += 0.03;
            });

            renderer.render(scene, camera);
        }

        renderFrame();

        // Responsive Resizing
        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w && h) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        });

        // Performance Optimization: IntersectionObserver
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    isVisibleOnScreen = entry.isIntersecting;
                });
            }, { threshold: 0.1 });
            observer.observe(container);
        }
    }

    // --- Interactive 3D Perspective Tilt on Workspace Mockup Window ---
    function init3DMockupTilt() {
        const mockup = document.querySelector('.interactive-mockup-window');
        if (!mockup) return;

        mockup.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease';
        mockup.style.transformStyle = 'preserve-3d';

        mockup.addEventListener('mousemove', (e) => {
            const rect = mockup.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;

            mockup.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
        });

        mockup.addEventListener('mouseleave', () => {
            mockup.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init3DEngine();
            init3DMockupTilt();
        });
    } else {
        init3DEngine();
        init3DMockupTilt();
    }
})();
