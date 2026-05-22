class BallPhysics {
  constructor() {
    this.container = document.getElementById("container");
    this.balls = [];

    // PHYSICS PARAMETERS
    this.ballSize = 70;
    this.gravity = 0.2;
    this.friction = 0.98;
    this.groundFriction = 0.99;
    this.bounceDamping = 0.82;
    this.maxThrowVelocity = 6;
    this.velocityMultiplier = 0.14;
    this.throwReleaseDamping = 0.65;
    this.dragPushStrength = 0.18;
    /** Độ xoay: 0 = bóng không quay */
    this.spinAmplitude = 0;
    this.collisionSpinFactor = 0;
    this.mergeSpeedThreshold = 2.5;
    this.mergeContactRatio = 1.08;
    this.maxBallSize = 140;
    this.settleSpeedThreshold = 0.5;
    this.settleFrameThreshold = 15;

    this.running = false;

    this.iconTypeCount = 4;
    /** Tổng quả = iconTypeCount × dropsPerTypeCount; mỗi lần chọn loại random; hết thì dừng */
    this.dropsPerTypeCount = 4;
    this.spawnsLeft = 0;

    /** 0: việt quất, 1: kiwi, 2: dâu, 3: hoa — đường dẫn tương đối file HTML */
    this.productImages = [
      "./images/blueberry.png",
      "./images/kiwi.png",
      "./images/strawberry.png",
      "./images/flower.png",
    ];

    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    document.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
      passive: false,
    });
    document.addEventListener("touchend", (e) => this.handleTouchEnd(e));

    this.rebuildDropQueue();
    this.init();
  }

  rebuildDropQueue() {
    const n = Math.max(1, Math.floor(this.dropsPerTypeCount) || 4);
    this.spawnsLeft = this.iconTypeCount * n;
  }

  hasMoreScheduledDrops() {
    return this.spawnsLeft > 0;
  }

  randomProductTypeIndex() {
    return Math.floor(Math.random() * this.iconTypeCount);
  }

  init() {
    this.spawnPendingBall();
    this.startAnimation();
  }

  setupBallVisual(element, typeIndex, size) {
    element.innerHTML = "";
    const img = document.createElement("img");
    img.className = "ball-icon";
    img.draggable = false;
    img.alt = "";
    img.decoding = "async";
    img.src = this.productImages[typeIndex % this.iconTypeCount];
    element.appendChild(img);
    return img;
  }

  setupBalls() {
    const ballElements = document.querySelectorAll(".ball");
    const containerRect = this.container.getBoundingClientRect();

    ballElements.forEach((element, index) => {
      const size = this.ballSize;
      const radius = size / 2;
      element.style.width = size + "px";
      element.style.height = size + "px";
      const typeIndex = index % this.iconTypeCount;
      const productImg = this.setupBallVisual(element, typeIndex, size);

      const ball = {
        element: element,
        productImg,
        x: Math.random() * (containerRect.width - size) + radius,
        y: -70,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        radius: radius,
        size: size,
        typeIndex,
        mergeLevel: 0,
        mass: Math.PI * radius * radius * 0.1,
        // Improved dragging properties
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragStartTime: 0,
        dragPositions: [],
        maxPositionHistory: 5,
        rotation: 0,
        vrotation: 0,
      };

      gsap.set(element, {
        x: ball.x - radius,
        y: ball.y - radius,
        backgroundColor: "transparent",
      });

      this.balls.push(ball);

      element.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.startDrag(ball, e);
      });
      element.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          if (e.touches.length === 1) {
            this.startDrag(ball, e.touches[0]);
          }
        },
        { passive: false },
      );
    });
  }

  startAnimation() {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  animate() {
    if (!this.running) return;
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    this.balls.forEach((ball) => {
      if (!ball.isDragging && !ball.isPendingDrop) {
        ball.vy += this.gravity;
        ball.vx *= this.friction;
        ball.vy *= this.friction;
        ball.x += ball.vx;
        ball.y += ball.vy;

        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 0.1) {
          ball.vx *= 0.9;
          ball.vy *= 0.9;
        }

        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * this.bounceDamping;
        } else if (ball.x + ball.radius >= containerWidth) {
          ball.x = containerWidth - ball.radius;
          ball.vx = -ball.vx * this.bounceDamping;
        }
        if (ball.y - ball.radius <= 0) {
          ball.y = ball.radius;
          ball.vy = -ball.vy * this.bounceDamping;
        } else if (ball.y + ball.radius >= containerHeight) {
          ball.y = containerHeight - ball.radius;
          ball.vy = -ball.vy * this.bounceDamping;
          ball.vx *= this.groundFriction;
          ball.vrotation *= this.groundFriction;
        }

        ball.x = Math.max(
          ball.radius,
          Math.min(containerWidth - ball.radius, ball.x),
        );
        ball.y = Math.max(
          ball.radius,
          Math.min(containerHeight - ball.radius, ball.y),
        );

        ball.rotation += ball.vrotation;
      }

      gsap.set(ball.element, {
        x: ball.x - ball.radius,
        y: ball.y - ball.radius,
        rotation: ball.rotation,
      });
    });

    this.checkBallCollisions();
    this.checkSettledBalls();
    requestAnimationFrame(() => this.animate());
  }

  isBallSettled(ball) {
    if (ball.isPendingDrop || ball.isDragging || ball.hasSpawnedNext)
      return false;

    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    return speed < this.settleSpeedThreshold;
  }

  checkSettledBalls() {
    if (this.balls.some((ball) => ball.isPendingDrop)) return;
    if (!this.hasMoreScheduledDrops()) return;

    for (const ball of this.balls) {
      if (this.isBallSettled(ball)) {
        ball.settledFrames = (ball.settledFrames || 0) + 1;
        if (
          ball.settledFrames >= this.settleFrameThreshold &&
          !ball.hasSpawnedNext
        ) {
          ball.hasSpawnedNext = true;
          this.spawnPendingBall();
        }
      } else {
        ball.settledFrames = 0;
      }
    }
  }

  checkBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i];
        const ball2 = this.balls[j];
        if (
          ball1.isDragging ||
          ball2.isDragging ||
          ball1.isPendingDrop ||
          ball2.isPendingDrop
        )
          continue;

        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = ball1.radius + ball2.radius;

        if (distance < minDistance) {
          if (this.tryMergeBalls(ball1, ball2, distance, minDistance)) {
            j--;
            continue;
          }
          this.handleBallCollision(ball1, ball2, dx, dy, distance, minDistance);
        }
      }
    }
  }

  ballsAreSameType(ball1, ball2) {
    return ball1.typeIndex === ball2.typeIndex;
  }

  canMergeBalls(ball1, ball2, distance, minDistance) {
    if (ball1.isDragging || ball2.isDragging) return false;
    if (!this.ballsAreSameType(ball1, ball2)) return false;
    if (distance > minDistance * this.mergeContactRatio) return false;

    const relVx = ball2.vx - ball1.vx;
    const relVy = ball2.vy - ball1.vy;
    const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
    const speed1 = Math.sqrt(ball1.vx * ball1.vx + ball1.vy * ball1.vy);
    const speed2 = Math.sqrt(ball2.vx * ball2.vx + ball2.vy * ball2.vy);

    return (
      relSpeed < this.mergeSpeedThreshold &&
      speed1 < this.mergeSpeedThreshold &&
      speed2 < this.mergeSpeedThreshold
    );
  }

  tryMergeBalls(ball1, ball2, distance, minDistance) {
    if (!this.canMergeBalls(ball1, ball2, distance, minDistance)) return false;
    this.mergeBalls(ball1, ball2);
    return true;
  }

  applyBallSize(ball) {
    ball.element.style.width = ball.size + "px";
    ball.element.style.height = ball.size + "px";
  }

  mergeBalls(keeper, absorbed) {
    const totalMass = keeper.mass + absorbed.mass;
    const newX =
      (keeper.x * keeper.mass + absorbed.x * absorbed.mass) / totalMass;
    const newY =
      (keeper.y * keeper.mass + absorbed.y * absorbed.mass) / totalMass;
    const newVx =
      (keeper.vx * keeper.mass + absorbed.vx * absorbed.mass) / totalMass;
    const newVy =
      (keeper.vy * keeper.mass + absorbed.vy * absorbed.mass) / totalMass;

    const mergedRadius = Math.min(
      this.maxBallSize / 2,
      Math.sqrt(
        keeper.radius * keeper.radius + absorbed.radius * absorbed.radius,
      ),
    );

    keeper.x = newX;
    keeper.y = newY;
    keeper.vx = newVx;
    keeper.vy = newVy;
    keeper.radius = mergedRadius;
    keeper.size = mergedRadius * 2;
    keeper.mass = Math.PI * mergedRadius * mergedRadius * 0.1;
    keeper.mergeLevel =
      (keeper.mergeLevel || 0) + (absorbed.mergeLevel || 0) + 1;
    this.applyBallSize(keeper);

    // Sau merge, quả còn lại phải có thể spawn bóng tiếp theo khi đứng yên lại
    keeper.hasSpawnedNext = false;
    keeper.settledFrames = 0;

    gsap.fromTo(
      keeper.element,
      { scale: 0.85 },
      { scale: 1, duration: 0.35, ease: "back.out(2)" },
    );

    this.removeBall(absorbed);
  }

  removeBall(ball) {
    const index = this.balls.indexOf(ball);
    if (index !== -1) this.balls.splice(index, 1);

    gsap.to(ball.element, {
      scale: 0,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => ball.element.remove(),
    });
  }

  handleBallCollision(ball1, ball2, dx, dy, distance, minDistance) {
    const overlap = minDistance - distance;
    const normalX = dx / distance;
    const normalY = dy / distance;

    const totalMass = ball1.mass + ball2.mass;
    const separationX = overlap * (ball2.mass / totalMass) * normalX;
    const separationY = overlap * (ball2.mass / totalMass) * normalY;

    ball1.x -= separationX;
    ball1.y -= separationY;
    ball2.x += overlap * (ball1.mass / totalMass) * normalX;
    ball2.y += overlap * (ball1.mass / totalMass) * normalY;

    const rvx = ball2.vx - ball1.vx;
    const rvy = ball2.vy - ball1.vy;
    const velAlongNormal = rvx * normalX + rvy * normalY;

    if (velAlongNormal > 0) return;

    const minSeparation = 0.1;
    if (Math.abs(velAlongNormal) < minSeparation) {
      ball1.vx -= normalX * minSeparation;
      ball1.vy -= normalY * minSeparation;
      ball2.vx += normalX * minSeparation;
      ball2.vy += normalY * minSeparation;
      return;
    }

    const e = this.bounceDamping;
    const j = (-(1 + e) * velAlongNormal) / (1 / ball1.mass + 1 / ball2.mass);
    const impulseX = j * normalX;
    const impulseY = j * normalY;

    ball1.vx -= impulseX / ball1.mass;
    ball1.vy -= impulseY / ball1.mass;
    ball2.vx += impulseX / ball2.mass;
    ball2.vy += impulseY / ball2.mass;

    const angularImpulse =
      (rvx * normalY - rvy * normalX) * this.collisionSpinFactor;
    ball1.vrotation -= angularImpulse / ball1.mass;
    ball2.vrotation += angularImpulse / ball2.mass;

    const dampingFactor = 0.98;
    ball1.vx *= dampingFactor;
    ball1.vy *= dampingFactor;
    ball2.vx *= dampingFactor;
    ball2.vy *= dampingFactor;

    this.createCollisionEffect(ball1, ball2);
  }

  createCollisionEffect(ball1, ball2) {}

  handleResize() {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    this.balls.forEach((ball) => {
      ball.vx = 0;
      ball.vy = 0;

      ball.x = Math.max(
        ball.radius,
        Math.min(containerWidth - ball.radius, ball.x),
      );
      ball.y = Math.max(
        ball.radius,
        Math.min(containerHeight - ball.radius, ball.y),
      );

      if (ball.y > containerHeight - ball.radius) {
        ball.y = containerHeight - ball.radius;
      }
      if (ball.x > containerWidth - ball.radius) {
        ball.x = containerWidth - ball.radius;
      }
    });

    this.separateOverlappingBalls();
  }

  separateOverlappingBalls() {
    const maxIterations = 10;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hasOverlap = false;

      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const ball1 = this.balls[i];
          const ball2 = this.balls[j];

          const dx = ball2.x - ball1.x;
          const dy = ball2.y - ball1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball1.radius + ball2.radius;

          if (distance < minDistance && distance > 0) {
            hasOverlap = true;

            const overlap = minDistance - distance;
            const normalX = dx / distance;
            const normalY = dy / distance;

            const moveDistance = overlap * 0.5;
            ball1.x -= normalX * moveDistance;
            ball1.y -= normalY * moveDistance;
            ball2.x += normalX * moveDistance;
            ball2.y += normalY * moveDistance;

            const containerWidth = this.container.clientWidth;
            const containerHeight = this.container.clientHeight;

            ball1.x = Math.max(
              ball1.radius,
              Math.min(containerWidth - ball1.radius, ball1.x),
            );
            ball1.y = Math.max(
              ball1.radius,
              Math.min(containerHeight - ball1.radius, ball1.y),
            );
            ball2.x = Math.max(
              ball2.radius,
              Math.min(containerWidth - ball2.radius, ball2.x),
            );
            ball2.y = Math.max(
              ball2.radius,
              Math.min(containerHeight - ball2.radius, ball2.y),
            );
          }
        }
      }

      if (!hasOverlap) break;
    }
  }

  spawnPendingBall() {
    if (this.balls.length >= 40) return;
    if (this.balls.some((ball) => ball.isPendingDrop)) return;
    if (!this.hasMoreScheduledDrops()) return;

    const typeIndex = this.randomProductTypeIndex();

    const container = this.container;
    const newBall = document.createElement("div");
    const size = this.ballSize;
    const radius = size / 2;

    newBall.className = "ball";
    newBall.style.width = size + "px";
    newBall.style.height = size + "px";
    newBall.style.borderRadius = "50%";
    newBall.style.cursor = "grab";
    container.appendChild(newBall);
    const productImg = this.setupBallVisual(newBall, typeIndex, size);

    const containerRect = container.getBoundingClientRect();
    const ball = {
      element: newBall,
      productImg,
      x: Math.random() * (containerRect.width - size) + radius,
      y: radius,
      vx: 0,
      vy: 0,
      radius: radius,
      size: size,
      typeIndex,
      mergeLevel: 0,
      mass: Math.PI * radius * radius * 0.1,
      isPendingDrop: true,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      dragStartTime: 0,
      dragPositions: [],
      maxPositionHistory: 5,
      rotation: 0,
      vrotation: 0,
    };

    gsap.set(newBall, {
      x: ball.x - radius,
      y: ball.y - radius,
      backgroundColor: "transparent",
      scale: 0,
    });

    gsap.to(newBall, {
      scale: 1,
      duration: 0.3,
      ease: "back.out(1.7)",
    });

    this.balls.push(ball);

    newBall.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.startDrag(ball, e);
    });
    newBall.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          this.startDrag(ball, e.touches[0]);
        }
      },
      { passive: false },
    );

    this.spawnsLeft--;
  }

  getMousePos(event) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  startDrag(ball, event) {
    if (!ball.isPendingDrop) return;

    const mousePos = this.getMousePos(event);
    ball.isDragging = true;
    ball.dragOffsetX = ball.x - mousePos.x;
    ball.dragOffsetY = ball.y - mousePos.y;
    ball.dragStartTime = Date.now();

    ball.dragPositions = [];
    ball.dragPositions.push({
      x: ball.x,
      y: ball.y,
      time: ball.dragStartTime,
    });
  }

  updateDragPosition(ball, mousePos) {
    if (!ball.isDragging) return;

    const currentTime = Date.now();
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    let newX = mousePos.x + ball.dragOffsetX;
    let newY = mousePos.y + ball.dragOffsetY;

    if (ball.isPendingDrop) {
      newY = ball.radius;
      newX = Math.max(
        ball.radius,
        Math.min(containerWidth - ball.radius, newX),
      );

      ball.x = newX;
      ball.y = newY;

      ball.dragPositions.push({
        x: ball.x,
        y: ball.y,
        time: currentTime,
      });

      if (ball.dragPositions.length > ball.maxPositionHistory) {
        ball.dragPositions.shift();
      }
      return;
    }

    newX = Math.max(ball.radius, Math.min(containerWidth - ball.radius, newX));
    newY = Math.max(ball.radius, Math.min(containerHeight - ball.radius, newY));

    const resolvedPosition = this.resolveDragCollisions(ball, newX, newY);

    ball.x = resolvedPosition.x;
    ball.y = resolvedPosition.y;

    ball.dragPositions.push({
      x: ball.x,
      y: ball.y,
      time: currentTime,
    });

    if (ball.dragPositions.length > ball.maxPositionHistory) {
      ball.dragPositions.shift();
    }
  }

  resolveDragCollisions(draggedBall, desiredX, desiredY) {
    let resolvedX = desiredX;
    let resolvedY = desiredY;

    for (let otherBall of this.balls) {
      if (otherBall === draggedBall) continue;

      const dx = resolvedX - otherBall.x;
      const dy = resolvedY - otherBall.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = draggedBall.radius + otherBall.radius;

      if (distance < minDistance && distance > 0) {
        if (
          this.ballsAreSameType(draggedBall, otherBall) &&
          distance <= minDistance * this.mergeContactRatio
        ) {
          this.mergeBalls(draggedBall, otherBall);
          return { x: draggedBall.x, y: draggedBall.y };
        }

        const normalX = dx / distance;
        const normalY = dy / distance;

        const overlap = minDistance - distance;
        resolvedX += normalX * overlap;
        resolvedY += normalY * overlap;

        if (!otherBall.isDragging) {
          otherBall.vx += normalX * this.dragPushStrength;
          otherBall.vy += normalY * this.dragPushStrength;

          otherBall.x -= normalX * (overlap * 0.3);
          otherBall.y -= normalY * (overlap * 0.3);

          const containerWidth = this.container.clientWidth;
          const containerHeight = this.container.clientHeight;
          otherBall.x = Math.max(
            otherBall.radius,
            Math.min(containerWidth - otherBall.radius, otherBall.x),
          );
          otherBall.y = Math.max(
            otherBall.radius,
            Math.min(containerHeight - otherBall.radius, otherBall.y),
          );
        }
      }
    }

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    resolvedX = Math.max(
      draggedBall.radius,
      Math.min(containerWidth - draggedBall.radius, resolvedX),
    );
    resolvedY = Math.max(
      draggedBall.radius,
      Math.min(containerHeight - draggedBall.radius, resolvedY),
    );

    return { x: resolvedX, y: resolvedY };
  }

  calculateThrowVelocity(ball) {
    if (ball.dragPositions.length < 2) {
      return { vx: 0, vy: 0 };
    }

    const recent = ball.dragPositions.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const timeDiff = (last.time - first.time) / 1000;

    if (timeDiff <= 0) {
      return { vx: 0, vy: 0 };
    }

    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;

    let vx = (deltaX / timeDiff) * this.velocityMultiplier;
    let vy = (deltaY / timeDiff) * this.velocityMultiplier;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > this.maxThrowVelocity) {
      const scaleFactor = this.maxThrowVelocity / speed;
      vx *= scaleFactor;
      vy *= scaleFactor;
    }

    return { vx, vy };
  }

  handleMouseMove(e) {
    const mousePos = this.getMousePos(e);
    this.balls.forEach((ball) => {
      if (ball.isDragging) {
        this.updateDragPosition(ball, mousePos);
      }
    });
  }

  handleMouseUp(e) {
    this.balls.forEach((ball) => {
      if (ball.isDragging) {
        ball.isDragging = false;

        if (ball.isPendingDrop) {
          ball.isPendingDrop = false;
          ball.element.style.cursor = "default";
          ball.vx = 0;
          ball.vy = 0;
          ball.dragPositions = [];
          return;
        }

        const velocity = this.calculateThrowVelocity(ball);
        ball.vx = velocity.vx * this.throwReleaseDamping;
        ball.vy = velocity.vy * this.throwReleaseDamping;

        ball.dragPositions = [];
      }
    });
  }

  handleTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mousePos = this.getMousePos(touch);
      this.balls.forEach((ball) => {
        if (ball.isDragging) {
          this.updateDragPosition(ball, mousePos);
        }
      });
    }
  }

  handleTouchEnd(e) {
    this.balls.forEach((ball) => {
      if (ball.isDragging) {
        ball.isDragging = false;

        if (ball.isPendingDrop) {
          ball.isPendingDrop = false;
          ball.element.style.cursor = "default";
          ball.vx = 0;
          ball.vy = 0;
          ball.dragPositions = [];
          return;
        }

        const velocity = this.calculateThrowVelocity(ball);
        ball.vx = velocity.vx * this.throwReleaseDamping;
        ball.vy = velocity.vy * this.throwReleaseDamping;

        ball.dragPositions = [];
      }
    });
  }
}

let ballPhysics;

document.addEventListener("DOMContentLoaded", () => {
  if (!ballPhysics) {
    ballPhysics = new BallPhysics();
  }
});

let resizeTimeout;
window.addEventListener("resize", () => {
  if (ballPhysics) {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ballPhysics.handleResize();
    }, 100);
  }
});

if (document.readyState !== "loading" && !ballPhysics) {
  ballPhysics = new BallPhysics();
}
