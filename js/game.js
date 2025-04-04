// 游戏变量
let scene, camera, renderer, player;
let platforms = [];
let obstacles = [];
let coins = [];
let particles = [];
let jumping = false;
let doubleJumping = false; // 二段跳标记
let sliding = false; // 滑行标记
let score = 0;
let gameStarted = false;
let gameOver = false;
let speed = 0.2;
let playerVelocity = 0;
let lateralVelocity = 0; // 横向移动速度
let gravity = 0.01;
let lane = 1; // 0: 左, 1: 中, 2: 右
let lanePositions = [-2, 0, 2];
let freeMovement = true; // 自由移动模式
let clock = new THREE.Clock();
let startTime = 0;
let distance = 0;
let level = 1;
let particleSystem;
let playerModel;
let isTouchDevice = false; // 是否为触屏设备
let isMouseDown = false; // 鼠标是否按下
let lastTouchX = 0; // 最后触摸的X坐标
let lastTouchY = 0; // 最后触摸的Y坐标
let lastMouseX = 0; // 最后鼠标的X坐标
let lastMouseY = 0; // 最后鼠标的Y坐标
let touchSensitivity = 0.01; // 触摸灵敏度
let mouseSensitivity = 0.01; // 鼠标灵敏度
let swipeThreshold = 50; // 滑动手势阈值
let gestureStartX = 0; // 手势开始X坐标
let gestureStartY = 0; // 手势开始Y坐标
let isPaused = false; // 游戏暂停状态

// 游戏初始化
function init() {
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x64b5f6);
    scene.fog = new THREE.Fog(0x64b5f6, 10, 50);

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, -5);

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 创建粒子系统
    createParticleSystem();

    // 创建玩家
    createPlayer();

    // 创建初始平台
    for (let i = 0; i < 20; i++) {
        createPlatform(-i * 10);
    }

    // 事件监听
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // 添加触屏和鼠标控制
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    
    // 检测设备类型并添加相应事件监听
    if (isTouchDevice) {
        renderer.domElement.addEventListener('touchstart', onTouchStart);
        renderer.domElement.addEventListener('touchmove', onTouchMove);
        renderer.domElement.addEventListener('touchend', onTouchEnd);
        
        // 移动端控制按钮事件
        document.getElementById('mobileLeft').addEventListener('touchstart', function() {
            lateralVelocity = -0.1;
        });
        document.getElementById('mobileLeft').addEventListener('touchend', function() {
            lateralVelocity = 0;
        });
        
        document.getElementById('mobileRight').addEventListener('touchstart', function() {
            lateralVelocity = 0.1;
        });
        document.getElementById('mobileRight').addEventListener('touchend', function() {
            lateralVelocity = 0;
        });
        
        document.getElementById('mobileJump').addEventListener('touchstart', onJump);
        
        // 添加滑行按钮功能
        document.getElementById('mobileSlide').addEventListener('touchstart', function() {
            if (!sliding && !jumping) {
                sliding = true;
                player.scale.set(1, 0.5, 1);
                player.position.y = 0.1;
                speed *= 1.5;
            }
        });
        document.getElementById('mobileSlide').addEventListener('touchend', function() {
            if (sliding) {
                sliding = false;
                player.scale.set(1, 1, 1);
                player.position.y = 0.2;
                speed /= 1.5;
            }
        });
        
        // 显示移动端控制
        document.getElementById('mobileControls').style.display = 'flex';
    } else {
        // 鼠标控制
        renderer.domElement.addEventListener('mousedown', onMouseDown);
        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mouseup', onMouseUp);
        
        // 游戏画布点击跳跃（为兼容单击行为，但现在更推荐使用滑动手势）
        renderer.domElement.addEventListener('click', function(event) {
            // 如果移动距离很小，视为点击
            const deltaX = lastMouseX - gestureStartX;
            const deltaY = lastMouseY - gestureStartY;
            if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                onJump();
            }
        });
    }

    // 为触屏设备添加双指手势
    renderer.domElement.addEventListener('gesturestart', function(e) {
        e.preventDefault(); // 防止默认的缩放行为
    });

    // 添加键盘滑行键释放事件
    document.addEventListener('keyup', function(event) {
        if (event.code === 'ShiftLeft' || event.code === 'KeyS' || event.code === 'ArrowDown') {
            if (sliding) {
                sliding = false;
                player.scale.set(1, 1, 1);
                player.position.y = 0.2;
                speed /= 1.5;
            }
        }
    });

    // 在游戏界面上显示控制提示
    const controlsHelp = document.createElement('div');
    controlsHelp.id = 'controlsHelp';
    controlsHelp.innerHTML = '← 左右滑动控制方向 →<br>↑ 向上滑动跳跃 ↓<br>↓ 向下滑动下蹲';
    controlsHelp.style.position = 'absolute';
    controlsHelp.style.bottom = '120px';
    controlsHelp.style.left = '50%';
    controlsHelp.style.transform = 'translateX(-50%)';
    controlsHelp.style.color = 'white';
    controlsHelp.style.background = 'rgba(0,0,0,0.5)';
    controlsHelp.style.padding = '10px 20px';
    controlsHelp.style.borderRadius = '10px';
    controlsHelp.style.textAlign = 'center';
    controlsHelp.style.fontSize = '16px';
    controlsHelp.style.fontFamily = "'ZCOOL KuaiLe', cursive, Arial, sans-serif";
    controlsHelp.style.zIndex = '1000';
    controlsHelp.style.pointerEvents = 'none';
    document.body.appendChild(controlsHelp);

    // 5秒后隐藏提示
    setTimeout(function() {
        controlsHelp.style.opacity = '0';
        controlsHelp.style.transition = 'opacity 0.5s ease';
    }, 5000);

    // 添加暂停按钮功能
    document.getElementById('pauseButton').addEventListener('click', togglePause);

    // 开始界面按钮点击事件
    document.getElementById('startButton').addEventListener('click', startGame);
    
    // 游戏结束后点击/触摸屏幕重新开始
    document.addEventListener('click', function() {
        if (gameOver) {
            resetGame();
        }
    });
    
    document.addEventListener('touchstart', function() {
        if (gameOver) {
            resetGame();
        }
    });

    // 显示暂停提示，2秒后淡出
    setTimeout(function() {
        const pauseTip = document.getElementById('pauseTip');
        pauseTip.style.opacity = '1';
        
        setTimeout(function() {
            pauseTip.style.opacity = '0';
        }, 5000);
    }, 1000);
}

// 创建粒子系统
function createParticleSystem() {
    const particleCount = 2000;
    const particles = new THREE.BufferGeometry();
    
    const positions = [];
    const colors = [];
    
    for (let i = 0; i < particleCount; i++) {
        // 粒子位置在天空
        const x = (Math.random() * 100) - 50;
        const y = Math.random() * 30 + 10;
        const z = (Math.random() * 100) - 100;
        
        positions.push(x, y, z);
        
        // 颜色为白色
        colors.push(1, 1, 1);
    }
    
    particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
}

// 创建玩家
function createPlayer() {
    // 创建一个简单的玩家模型
    const group = new THREE.Group();
    
    // 身体
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x0088ff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);
    
    // 头部
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.95;
    head.castShadow = true;
    group.add(head);
    
    // 手臂
    const armGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const armMaterial = new THREE.MeshPhongMaterial({ color: 0xffcc88 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.3, 0.4, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.3, 0.4, 0);
    rightArm.castShadow = true;
    group.add(rightArm);
    
    // 腿部
    const legGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    
    player = group;
    playerModel = {
        body: body,
        head: head,
        leftArm: leftArm,
        rightArm: rightArm,
        leftLeg: leftLeg,
        rightLeg: rightLeg
    };
    
    player.position.set(0, 0.2, 0);
    scene.add(player);
}

// 创建平台
function createPlatform(zPosition) {
    // 使用更鲜艳的彩虹渐变颜色
    const colors = [0xff5252, 0xff9800, 0xffeb3b, 0x4caf50, 0x2196f3, 0x673ab7, 0xe91e63];
    const colorIndex = Math.floor(Math.abs(zPosition / 10) % colors.length);
    
    const geometry = new THREE.BoxGeometry(6, 0.5, 10);
    const material = new THREE.MeshPhongMaterial({ 
        color: colors[colorIndex],
        shininess: 30
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(0, -0.25, zPosition);
    platform.receiveShadow = true;
    scene.add(platform);
    platforms.push(platform);

    // 随机添加障碍物，较高的概率
    if (Math.random() < 0.7 && zPosition < -10) {
        // 确保同一段Z轴范围内有多条通路
        let hasObstacle = false;
        
        // 添加障碍物的次数（1-3个）
        const obstacleCount = Math.floor(Math.random() * 2) + 1;
        
        // 已被占用的车道
        const occupiedLanes = [];
        
        for (let i = 0; i < obstacleCount; i++) {
            // 确保至少有一条车道是可通行的
            if (occupiedLanes.length >= 2) break;
            
            // 选择一个未被占用的车道
            let randomLane;
            do {
                randomLane = Math.floor(Math.random() * 3);
            } while (occupiedLanes.includes(randomLane));
            
            occupiedLanes.push(randomLane);
            
            // 随机选择障碍物类型，确保有不同类型的障碍物
            let type;
            if (i === 0) {
                // 第一个障碍物使用随机类型
                type = Math.floor(Math.random() * 7);
            } else {
                // 后续障碍物确保类型有变化
                do {
                    type = Math.floor(Math.random() * 7);
                } while (type === 4); // 避免多个跳跃障碍物
            }
            
            // 创建障碍物并指定车道
            createObstacle(zPosition, type, randomLane);
        }
    }

    // 随机添加金币
    if (Math.random() < 0.6 && zPosition < -10) {
        createCoin(zPosition);
    }
    
    // 初始化障碍物特殊效果
    initObstacleSpecialEffects();
}

// 创建障碍物
function createObstacle(zPosition, type = -1, forceLane = -1) {
    // 如果未指定类型，随机生成一个类型 (0-6)
    if (type === -1) {
        type = Math.floor(Math.random() * 7);
    }
    
    // 如果未指定车道，随机选择一个
    const randomLane = forceLane === -1 ? Math.floor(Math.random() * 3) : forceLane;
    let geometry, height, width, depth;
    let material, obstacle;
    
    switch(type) {
        case 0: // 普通立方障碍物 - 可以下蹲通过
            geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            obstacle = new THREE.Mesh(geometry, material);
            height = 0.4;
            obstacle.userData = { canSlideUnder: true };
            break;
            
        case 1: // 高障碍物 - 必须跳跃通过
            geometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
            material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            obstacle = new THREE.Mesh(geometry, material);
            height = 0.75;
            break;
            
        case 2: // 宽障碍物 - 可以下蹲通过
            geometry = new THREE.BoxGeometry(1.8, 0.8, 0.8);
            material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            obstacle = new THREE.Mesh(geometry, material);
            height = 0.4;
            obstacle.userData = { canSlideUnder: true };
            break;
            
        case 3: // 旋转的飞盘障碍物 - 可以下蹲通过
            geometry = new THREE.CylinderGeometry(0.7, 0.7, 0.2, 16);
            material = new THREE.MeshPhongMaterial({ color: 0xff6600 });
            obstacle = new THREE.Mesh(geometry, material);
            height = 0.5;
            obstacle.userData = { rotationSpeed: Math.random() * 0.1 + 0.05, rotationAxis: 'y', canSlideUnder: true };
            break;
            
        case 4: // 跳跃障碍物 (需要从上方跳过)
            geometry = new THREE.BoxGeometry(3, 0.2, 0.8);
            material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
            obstacle = new THREE.Mesh(geometry, material);
            height = 0.1;
            obstacle.userData = { mustJumpOver: true };
            break;
            
        case 5: // 多层障碍物 - 可以下蹲通过
            obstacle = new THREE.Group();
            
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.4, 0.8),
                new THREE.MeshPhongMaterial({ color: 0xff0000 })
            );
            base.position.y = 0.2;
            obstacle.add(base);
            
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.4, 0.8),
                new THREE.MeshPhongMaterial({ color: 0xff6600 })
            );
            top.position.y = 0.6;
            obstacle.add(top);
            
            height = 0.6;
            obstacle.userData = { canSlideUnder: true };
            break;
            
        case 6: // 浮动障碍物 - 必须跳跃通过
            geometry = new THREE.SphereGeometry(0.6, 16, 16);
            material = new THREE.MeshPhongMaterial({ 
                color: 0x9900ff,
                emissive: 0x330066,
                emissiveIntensity: 0.3 
            });
            obstacle = new THREE.Mesh(geometry, material);
            height = 1.2;
            obstacle.userData = { floatingObstacle: true, floatOffset: Math.random() * Math.PI * 2 };
            break;
    }
    
    // 随机放置Z位置，但确保障碍物不会堆叠过近
    const zOffset = Math.random() * 5 - 2.5;
    
    // 如果是自由移动模式，允许障碍物在任意位置，不仅仅是车道
    let xPos;
    if (freeMovement) {
        xPos = Math.random() * 5 - 2.5;
    } else {
        xPos = lanePositions[randomLane];
    }
    
    obstacle.position.set(xPos, height, zPosition + zOffset);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    if (!obstacle.userData) {
        obstacle.userData = {};
    }
    obstacle.userData.type = type;
    obstacle.userData.lane = randomLane;
    
    // 添加视觉提示，根据是否可下蹲通过来使用不同颜色或标记
    if (obstacle.userData.canSlideUnder) {
        // 为可下蹲通过的障碍物添加下方标记
        const marker = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 })
        );
        marker.position.y = -0.2;
        obstacle.add(marker);
    }
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// 创建金币
function createCoin(zPosition) {
    const randomLane = Math.floor(Math.random() * 3);
    const geometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.2
    });
    const coin = new THREE.Mesh(geometry, material);
    coin.position.set(lanePositions[randomLane], 0.5, zPosition + Math.random() * 5 - 2.5);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    scene.add(coin);
    coins.push(coin);
    
    // 添加光晕
    const glowGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    coin.add(glow);
}

// 创建跳跃粒子效果
function createJumpParticles() {
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // 随机位置在玩家脚下
        particle.position.set(
            player.position.x + (Math.random() - 0.5) * 0.5,
            player.position.y - 0.2,
            player.position.z + (Math.random() - 0.5) * 0.5
        );
        
        // 随机速度向下
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            lifetime: 1.0
        };
        
        scene.add(particle);
        particles.push(particle);
    }
}

// 创建金币收集粒子效果
function createCoinParticles(position) {
    const particleCount = 10;
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // 位置在金币位置
        particle.position.copy(position);
        
        // 随机速度向上和四周
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            ),
            lifetime: 1.0
        };
        
        scene.add(particle);
        particles.push(particle);
    }
}

// 窗口大小变化时的响应
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 键盘事件处理
function onKeyDown(event) {
    if (gameOver && event.code === 'Space') {
        resetGame();
        return;
    }

    // 添加ESC键暂停功能
    if (event.code === 'Escape') {
        togglePause();
        return;
    }

    if (!gameStarted) return;

    switch (event.code) {
        case 'KeyA':
        case 'ArrowLeft':
            if (freeMovement) {
                lateralVelocity = -0.1;
            } else if (lane > 0) {
                lane--;
            }
            break;
            
        case 'KeyD':
        case 'ArrowRight':
            if (freeMovement) {
                lateralVelocity = 0.1;
            } else if (lane < 2) {
                lane++;
            }
            break;
            
        case 'Space':
            if (!jumping) {
                jumping = true;
                playerVelocity = 0.25;
                createJumpParticles();
            } else if (!doubleJumping) {
                // 允许二段跳
                doubleJumping = true;
                playerVelocity = 0.2;
                createJumpParticles();
            }
            break;
            
        case 'ShiftLeft':
        case 'KeyS':
        case 'ArrowDown':
            if (!sliding && !jumping) {
                sliding = true;
                // 播放滑行动画、降低高度、增加速度等
                player.scale.set(1, 0.5, 1);
                player.position.y = 0.1;
                // 临时增加速度
                speed *= 1.5;
            }
            break;
    }
}

// 添加键盘释放事件处理
function onKeyUp(event) {
    if (!gameStarted || gameOver) return;
    
    switch (event.code) {
        case 'KeyA':
        case 'ArrowLeft':
        case 'KeyD':
        case 'ArrowRight':
            if (freeMovement) {
                lateralVelocity = 0;
            }
            break;
            
        case 'ShiftLeft':
        case 'KeyS':
        case 'ArrowDown':
            if (sliding) {
                sliding = false;
                player.scale.set(1, 1, 1);
                player.position.y = 0.2;
                // 恢复正常速度
                speed /= 1.5;
            }
            break;
    }
}

// 触摸事件处理
function onTouchStart(event) {
    if (!gameStarted || gameOver) return;
    event.preventDefault();
    
    lastTouchX = event.touches[0].clientX;
    lastTouchY = event.touches[0].clientY;
    gestureStartX = lastTouchX;
    gestureStartY = lastTouchY;
}

function onTouchMove(event) {
    if (!gameStarted || gameOver || !isTouchDevice) return;
    event.preventDefault();
    
    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const deltaX = touchX - lastTouchX;
    const deltaY = touchY - lastTouchY;
    
    // 横向滑动控制左右移动
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (freeMovement) {
            lateralVelocity = deltaX * touchSensitivity;
        }
    }
    
    lastTouchX = touchX;
    lastTouchY = touchY;
}

function onTouchEnd(event) {
    if (!gameStarted || gameOver) return;
    event.preventDefault();
    
    // 判断滑动手势方向
    const deltaX = lastTouchX - gestureStartX;
    const deltaY = lastTouchY - gestureStartY;
    
    // 如果是明显的垂直滑动
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > swipeThreshold) {
        if (deltaY < 0) {
            // 向上滑动 - 跳跃
            onJump();
        } else {
            // 向下滑动 - 滑行
            if (!sliding && !jumping) {
                sliding = true;
                player.scale.set(1, 0.5, 1);
                player.position.y = 0.1;
                speed *= 1.5;
                
                // 设置定时器，短时间后恢复
                setTimeout(function() {
                    if (sliding) {
                        sliding = false;
                        player.scale.set(1, 1, 1);
                        player.position.y = 0.2;
                        speed /= 1.5;
                    }
                }, 1000);
            }
        }
    } 
    // 明显的水平滑动
    else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (!freeMovement) {
            // 车道模式下的左右移动
            if (deltaX < 0 && lane > 0) {
                lane--;
            } else if (deltaX > 0 && lane < 2) {
                lane++;
            }
        }
    }
    
    // 停止移动
    if (freeMovement) {
        lateralVelocity = 0;
    }
}

// 鼠标事件处理
function onMouseDown(event) {
    if (!gameStarted || gameOver) return;
    isMouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    gestureStartX = lastMouseX;
    gestureStartY = lastMouseY;
}

function onMouseMove(event) {
    if (!gameStarted || gameOver || !isMouseDown) return;
    
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const deltaX = mouseX - lastMouseX;
    
    // 横向移动时持续控制
    if (freeMovement) {
        lateralVelocity = deltaX * mouseSensitivity;
    }
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function onMouseUp(event) {
    if (!gameStarted || gameOver) return;
    
    // 判断滑动手势方向
    const deltaX = lastMouseX - gestureStartX;
    const deltaY = lastMouseY - gestureStartY;
    
    // 如果是明显的垂直滑动
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > swipeThreshold) {
        if (deltaY < 0) {
            // 向上滑动 - 跳跃
            onJump();
        } else {
            // 向下滑动 - 滑行
            if (!sliding && !jumping) {
                sliding = true;
                player.scale.set(1, 0.5, 1);
                player.position.y = 0.1;
                speed *= 1.5;
                
                // 设置定时器，短时间后恢复
                setTimeout(function() {
                    if (sliding) {
                        sliding = false;
                        player.scale.set(1, 1, 1);
                        player.position.y = 0.2;
                        speed /= 1.5;
                    }
                }, 1000);
            }
        }
    } 
    // 明显的水平滑动
    else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (!freeMovement) {
            // 车道模式下的左右移动
            if (deltaX < 0 && lane > 0) {
                lane--;
            } else if (deltaX > 0 && lane < 2) {
                lane++;
            }
        }
    }
    
    isMouseDown = false;
    lateralVelocity = 0;
}

// 跳跃函数
function onJump() {
    if (!gameStarted || gameOver) return;
    
    if (!jumping) {
        jumping = true;
        playerVelocity = 0.25;
        createJumpParticles();
    } else if (!doubleJumping) {
        // 允许二段跳
        doubleJumping = true;
        playerVelocity = 0.2;
        createJumpParticles();
    }
}

// 开始游戏
function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('mobileControls').style.display = isTouchDevice ? 'flex' : 'none';
    gameStarted = true;
    gameOver = false;
    startTime = Date.now();
    clock.start();
    animate();
    
    // 激活双跳能力
    document.getElementById('doubleTap').classList.add('active');
}

// 重置游戏
function resetGame() {
    // 重置分数
    score = 0;
    distance = 0;
    level = 1;
    document.getElementById('score').innerText = '分数: ' + score;
    document.getElementById('gameOver').style.display = 'none';

    // 重置玩家位置
    player.position.set(0, 0.2, 0);
    jumping = false;
    doubleJumping = false;
    sliding = false;
    playerVelocity = 0;
    lateralVelocity = 0;
    lane = 1;

    // 清除障碍物和金币
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    coins.forEach(coin => scene.remove(coin));
    coins = [];
    
    // 清除粒子
    particles.forEach(particle => scene.remove(particle));
    particles = [];

    // 清除平台
    platforms.forEach(platform => scene.remove(platform));
    platforms = [];

    // 创建新的平台
    for (let i = 0; i < 20; i++) {
        createPlatform(-i * 10);
    }

    // 重置速度
    speed = 0.2;

    // 重置游戏状态
    gameStarted = true;
    gameOver = false;
    startTime = Date.now();
    clock.start();
}

// 检测碰撞
function checkCollisions() {
    // 检测和障碍物的碰撞
    obstacles.forEach(obstacle => {
        // 根据障碍物类型调整碰撞盒
        let collisionDistance = 0.7;
        
        // 根据障碍物类型调整碰撞检测
        if (obstacle.userData) {
            switch(obstacle.userData.type) {
                case 1: // 高障碍物
                    // 如果玩家在跳跃且高度够高，则不碰撞
                    if (jumping && player.position.y > 0.8) {
                        return;
                    }
                    collisionDistance = 0.7;
                    break;
                    
                case 2: // 宽障碍物
                    collisionDistance = 1.2;
                    break;
                    
                case 4: // 跳跃障碍物
                    // 必须从上方跳过
                    if (player.position.y < 0.4 && Math.abs(player.position.z - obstacle.position.z) < 0.5 &&
                        Math.abs(player.position.x - obstacle.position.x) < 1.5) {
                        endGame();
                    }
                    return;
                    
                case 6: // 浮动障碍物
                    // 增加浮动障碍物的碰撞范围
                    collisionDistance = 0.8;
                    break;
            }
        }
        
        // 如果正在滑行，检查是否可以从下方通过
        if (sliding) {
            // 对于高障碍物，滑行可以从下方通过
            if (obstacle.userData && (obstacle.userData.type === 1 || obstacle.userData.canSlideUnder) && 
                Math.abs(player.position.z - obstacle.position.z) < 0.8) {
                return;
            }
        }
        
        const distance = player.position.distanceTo(obstacle.position);
        if (distance < collisionDistance) {
            endGame();
        }
    });

    // 检测和金币的碰撞
    for (let i = coins.length - 1; i >= 0; i--) {
        const distance = player.position.distanceTo(coins[i].position);
        if (distance < 0.8) {
            score += 10;
            createCoinParticles(coins[i].position.clone());
            document.getElementById('score').innerText = '分数: ' + score;
            scene.remove(coins[i]);
            coins.splice(i, 1);
        }
    }
}

// 结束游戏
function endGame() {
    gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').innerText = '得分: ' + score;
}

// 更新玩家动画
function updatePlayerAnimation() {
    if (!playerModel) return;
    
    // 跑步动画
    const runningSpeed = 10;
    const runCycle = (Date.now() % 1000) / 1000;
    
    if (sliding) {
        // 滑行姿势
        playerModel.leftLeg.rotation.x = 0;
        playerModel.rightLeg.rotation.x = 0;
        playerModel.leftArm.rotation.x = -0.5;
        playerModel.rightArm.rotation.x = -0.5;
        playerModel.body.rotation.x = -0.5;
    } else if (!jumping) {
        // 腿部摆动
        playerModel.leftLeg.rotation.x = Math.sin(runCycle * Math.PI * 2) * 0.5;
        playerModel.rightLeg.rotation.x = -Math.sin(runCycle * Math.PI * 2) * 0.5;
        
        // 手臂摆动
        playerModel.leftArm.rotation.x = -Math.sin(runCycle * Math.PI * 2) * 0.3;
        playerModel.rightArm.rotation.x = Math.sin(runCycle * Math.PI * 2) * 0.3;
    } else {
        // 跳跃姿势
        playerModel.leftLeg.rotation.x = -0.3;
        playerModel.rightLeg.rotation.x = -0.3;
        playerModel.leftArm.rotation.x = 0.2;
        playerModel.rightArm.rotation.x = 0.2;
    }
    
    // 转向动画
    if (freeMovement) {
        // 自由移动模式下，玩家向移动方向倾斜
        const targetRotation = lateralVelocity * 1.5;
        player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotation, 0.1);
    } else {
        // 车道模式下的转向动画
        const targetRotation = THREE.MathUtils.degToRad((lane - 1) * 15);
        player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotation, 0.1);
    }
    
    // 身体前倾
    const targetTilt = jumping ? -0.2 : (sliding ? -0.5 : -0.1);
    playerModel.body.rotation.x = THREE.MathUtils.lerp(playerModel.body.rotation.x, targetTilt, 0.1);
    
    // 头部晃动
    playerModel.head.rotation.z = Math.sin(runCycle * Math.PI * 4) * 0.05;
}

// 更新粒子
function updateParticles(delta) {
    // 更新粒子系统（天空中的小点）
    if (particleSystem) {
        particleSystem.position.z += speed;
    }
    
    // 更新效果粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // 更新位置
        particle.position.add(particle.userData.velocity);
        
        // 降低透明度
        particle.material.opacity -= delta;
        
        // 减少生命周期
        particle.userData.lifetime -= delta;
        
        // 如果生命周期结束，移除粒子
        if (particle.userData.lifetime <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
        }
    }
}

// 更新游戏级别和难度
function updateGameLevel() {
    const newLevel = Math.floor(distance / 300) + 1;
    
    if (newLevel > level) {
        level = newLevel;
        speed += 0.05; // 每升级增加速度
    }
}

// 切换游戏暂停状态
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // 暂停游戏
        clock.stop();
        document.getElementById('pauseButton').innerHTML = '<i class="fas fa-play"></i>';
        
        // 显示暂停状态提示
        const pauseMessage = document.createElement('div');
        pauseMessage.id = 'pauseMessage';
        pauseMessage.textContent = '游戏已暂停 - 按ESC键或点击继续';
        pauseMessage.style.position = 'absolute';
        pauseMessage.style.top = '50%';
        pauseMessage.style.left = '50%';
        pauseMessage.style.transform = 'translate(-50%, -50%)';
        pauseMessage.style.color = 'white';
        pauseMessage.style.fontSize = '24px';
        pauseMessage.style.background = 'rgba(0,0,0,0.5)';
        pauseMessage.style.padding = '15px 30px';
        pauseMessage.style.borderRadius = '10px';
        pauseMessage.style.zIndex = '1000';
        pauseMessage.style.textAlign = 'center';
        pauseMessage.style.fontFamily = "'ZCOOL KuaiLe', cursive, Arial, sans-serif";
        pauseMessage.style.backdropFilter = 'blur(5px)';
        pauseMessage.style.WebkitBackdropFilter = 'blur(5px)';
        document.body.appendChild(pauseMessage);
    } else {
        // 恢复游戏
        clock.start();
        document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause"></i>';
        
        // 移除暂停消息
        const pauseMessage = document.getElementById('pauseMessage');
        if (pauseMessage) {
            pauseMessage.remove();
        }
        
        animate();
    }
}

// 游戏循环
function animate() {
    if (!gameStarted || isPaused) return;

    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();

    // 更新游戏时间和分数
    if (!gameOver) {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        distance += speed;
        score = Math.floor(distance) + parseInt(document.getElementById('score').innerText.split(': ')[1]);
        document.getElementById('score').innerText = '分数: ' + score;
        document.getElementById('level').innerText = '关卡: ' + level;
        
        // 更新进度条
        document.getElementById('progressFill').style.width = (level % 5 / 5 * 100) + '%';

        // 更新游戏级别和难度
        updateGameLevel();
    }

    // 更新玩家位置和动画
    if (!gameOver) {
        if (freeMovement) {
            // 自由移动模式下的玩家控制
            player.position.x += lateralVelocity;
            
            // 限制玩家不要跑出平台
            if (player.position.x < -2.5) player.position.x = -2.5;
            if (player.position.x > 2.5) player.position.x = 2.5;
        } else {
            // 车道模式下的玩家控制
            player.position.x = THREE.MathUtils.lerp(player.position.x, lanePositions[lane], 0.1);
        }
        
        updatePlayerAnimation();

        // 处理跳跃
        if (jumping) {
            player.position.y += playerVelocity;
            playerVelocity -= gravity;

            if (player.position.y <= 0.2) {
                player.position.y = 0.2;
                jumping = false;
                doubleJumping = false;
                playerVelocity = 0;
                createJumpParticles();
            }
        }

        // 向前移动整个场景
        platforms.forEach(platform => {
            platform.position.z += speed;
        });

        obstacles.forEach(obstacle => {
            obstacle.position.z += speed;
            
            // 根据障碍物类型执行特殊效果
            if (obstacle.userData) {
                if (obstacle.userData.rotationSpeed && obstacle.userData.rotationAxis) {
                    // 旋转障碍物
                    obstacle.rotation[obstacle.userData.rotationAxis] += obstacle.userData.rotationSpeed;
                }
                
                if (obstacle.userData.floatingObstacle) {
                    // 浮动障碍物上下移动
                    obstacle.position.y = obstacle.userData.height + 
                        Math.sin((Date.now() / 500) + obstacle.userData.floatOffset) * 0.3;
                }
            }
        });

        coins.forEach(coin => {
            coin.position.z += speed;
            coin.rotation.z += 0.05;
        });
        
        // 更新粒子
        updateParticles(delta);

        // 检测碰撞
        checkCollisions();

        // 移除远处的平台并创建新的平台
        if (platforms[0].position.z > 10) {
            scene.remove(platforms[0]);
            platforms.shift();
            createPlatform(platforms[platforms.length - 1].position.z - 10);
        }

        // 移除远处的障碍物
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].position.z > 10) {
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }

        // 移除远处的金币
        for (let i = coins.length - 1; i >= 0; i--) {
            if (coins[i].position.z > 10) {
                scene.remove(coins[i]);
                coins.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

// 为浮动障碍物保存初始高度
function initObstacleSpecialEffects() {
    obstacles.forEach(obstacle => {
        if (obstacle.userData && obstacle.userData.floatingObstacle) {
            obstacle.userData.height = obstacle.position.y;
        }
    });
}

// 初始化游戏
init(); 