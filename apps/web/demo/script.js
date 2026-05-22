class BallPhysics {
  constructor() {
    this.container = document.getElementById("container");
    this.balls = [];

    // PHYSICS PARAMETERS
    this.ballSize = 70;
    this.gravity = 0.4;
    this.friction = 0.98;
    this.groundFriction = 0.99;
    this.bounceDamping = 0.95;
    this.maxThrowVelocity = 15;
    this.velocityMultiplier = 0.3;

    this.running = false;
    this.colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#ffeaa7",
      "#fd79a8"
    ];

    this.svgs = [
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="#fff"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 12l-4-4v3H3v2h15v3l4-4z" fill="#fff"/></svg>'
    ];

    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    document.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
      passive: false
    });
    document.addEventListener("touchend", (e) => this.handleTouchEnd(e));

    this.init();
  }

  init() {
    this.setupBalls();
    this.startAnimation();
  }

  setupBalls() {
    const ballElements = document.querySelectorAll(".ball");
    const containerRect = this.container.getBoundingClientRect();

    ballElements.forEach((element, index) => {
      const size = this.ballSize;
      const radius = size / 2;
      element.style.width = size + "px";
      element.style.height = size + "px";
      element.innerHTML = this.svgs[index % this.svgs.length];

      const ball = {
        element: element,
        x: Math.random() * (containerRect.width - size) + radius,
        y: -70,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        radius: radius,
        size: size,
        color: this.colors[index % this.colors.length],
        mass: Math.PI * radius * radius * 0.1,
        // Improved dragging properties
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0,
        dragStartTime: 0,
        dragPositions: [],
        maxPositionHistory: 5,
        rotation: 0,
        vrotation: (Math.random() - 0.5) * 5
      };

      gsap.set(element, {
        x: ball.x - radius,
        y: ball.y - radius,
        backgroundColor: ball.color
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
        { passive: false }
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
      if (!ball.isDragging) {
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
          ball.vrotation *= -1;
        } else if (ball.x + ball.radius >= containerWidth) {
          ball.x = containerWidth - ball.radius;
          ball.vx = -ball.vx * this.bounceDamping;
          ball.vrotation *= -1;
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
          Math.min(containerWidth - ball.radius, ball.x)
        );
        ball.y = Math.max(
          ball.radius,
          Math.min(containerHeight - ball.radius, ball.y)
        );

        ball.rotation += ball.vrotation;
      }

      gsap.set(ball.element, {
        x: ball.x - ball.radius,
        y: ball.y - ball.radius,
        rotation: ball.rotation
      });
    });

    this.checkBallCollisions();
    requestAnimationFrame(() => this.animate());
  }

  checkBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i];
        const ball2 = this.balls[j];
        if (ball1.isDragging || ball2.isDragging) continue;

        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = ball1.radius + ball2.radius;

        if (distance < minDistance) {
          this.handleBallCollision(ball1, ball2, dx, dy, distance, minDistance);
        }
      }
    }
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

    const angularImpulse = (rvx * normalY - rvy * normalX) * 0.1;
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

  resetSoft() {
    this.stop();
    this.balls = [];
    setTimeout(() => {
      this.setupBalls();
      this.startAnimation();
    }, 100);
  }

  resetHard(numBalls = 4) {
    this.stop();
    this.balls = [];
    this.container.innerHTML = "";
    for (let i = 0; i < numBalls; i++) {
      const newBallElement = document.createElement("div");
      newBallElement.className = "ball";
      this.container.appendChild(newBallElement);
    }
    setTimeout(() => {
      this.setupBalls();
      this.startAnimation();
    }, 50);
  }

  handleResize() {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    this.balls.forEach((ball) => {
      ball.vx = 0;
      ball.vy = 0;

      ball.x = Math.max(
        ball.radius,
        Math.min(containerWidth - ball.radius, ball.x)
      );
      ball.y = Math.max(
        ball.radius,
        Math.min(containerHeight - ball.radius, ball.y)
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
              Math.min(containerWidth - ball1.radius, ball1.x)
            );
            ball1.y = Math.max(
              ball1.radius,
              Math.min(containerHeight - ball1.radius, ball1.y)
            );
            ball2.x = Math.max(
              ball2.radius,
              Math.min(containerWidth - ball2.radius, ball2.x)
            );
            ball2.y = Math.max(
              ball2.radius,
              Math.min(containerHeight - ball2.radius, ball2.y)
            );
          }
        }
      }

      if (!hasOverlap) break;
    }
  }

  addRandomBall() {
    if (this.balls.length >= 40) return;

    const container = this.container;
    const newBall = document.createElement("div");
    const size = this.ballSize;
    const radius = size / 2;

    newBall.className = "ball";
    newBall.style.width = size + "px";
    newBall.style.height = size + "px";
    newBall.style.borderRadius = "50%";
    newBall.innerHTML = this.svgs[Math.floor(Math.random() * this.svgs.length)];
    container.appendChild(newBall);

    const containerRect = container.getBoundingClientRect();
    const ball = {
      element: newBall,
      x: Math.random() * (containerRect.width - size) + radius,
      y: radius + 10,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * 3,
      radius: radius,
      size: size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      mass: Math.PI * radius * radius * 0.1,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      dragStartTime: 0,
      dragPositions: [],
      maxPositionHistory: 5,
      rotation: 0, // Initial rotation angle
      vrotation: (Math.random() - 0.5) * 5 // Initial rotational velocity
    };

    gsap.set(newBall, {
      x: ball.x - radius,
      y: ball.y - radius,
      backgroundColor: ball.color,
      scale: 0
    });

    gsap.to(newBall, {
      scale: 1,
      duration: 0.3,
      ease: "back.out(1.7)"
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
      { passive: false }
    );
  }

  stop() {
    this.running = false;
  }

  getMousePos(event) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  startDrag(ball, event) {
    const mousePos = this.getMousePos(event);
    ball.isDragging = true;
    ball.dragOffsetX = ball.x - mousePos.x;
    ball.dragOffsetY = ball.y - mousePos.y;
    ball.dragStartTime = Date.now();

    ball.dragPositions = [];
    ball.dragPositions.push({
      x: ball.x,
      y: ball.y,
      time: ball.dragStartTime
    });
  }

  updateDragPosition(ball, mousePos) {
    if (!ball.isDragging) return;

    const currentTime = Date.now();
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    let newX = mousePos.x + ball.dragOffsetX;
    let newY = mousePos.y + ball.dragOffsetY;

    newX = Math.max(ball.radius, Math.min(containerWidth - ball.radius, newX));
    newY = Math.max(ball.radius, Math.min(containerHeight - ball.radius, newY));

    const resolvedPosition = this.resolveDragCollisions(ball, newX, newY);

    ball.x = resolvedPosition.x;
    ball.y = resolvedPosition.y;

    ball.dragPositions.push({
      x: ball.x,
      y: ball.y,
      time: currentTime
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
        const normalX = dx / distance;
        const normalY = dy / distance;

        const overlap = minDistance - distance;
        resolvedX += normalX * overlap;
        resolvedY += normalY * overlap;

        if (!otherBall.isDragging) {
          const pushStrength = 0.5;
          otherBall.vx += normalX * pushStrength;
          otherBall.vy += normalY * pushStrength;

          otherBall.x -= normalX * (overlap * 0.3);
          otherBall.y -= normalY * (overlap * 0.3);

          const containerWidth = this.container.clientWidth;
          const containerHeight = this.container.clientHeight;
          otherBall.x = Math.max(
            otherBall.radius,
            Math.min(containerWidth - otherBall.radius, otherBall.x)
          );
          otherBall.y = Math.max(
            otherBall.radius,
            Math.min(containerHeight - otherBall.radius, otherBall.y)
          );
        }
      }
    }

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    resolvedX = Math.max(
      draggedBall.radius,
      Math.min(containerWidth - draggedBall.radius, resolvedX)
    );
    resolvedY = Math.max(
      draggedBall.radius,
      Math.min(containerHeight - draggedBall.radius, resolvedY)
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

        const velocity = this.calculateThrowVelocity(ball);
        ball.vx = velocity.vx;
        ball.vy = velocity.vy;

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

        const velocity = this.calculateThrowVelocity(ball);
        ball.vx = velocity.vx;
        ball.vy = velocity.vy;

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

function resetSoftAnimation() {
  if (ballPhysics) {
    ballPhysics.resetSoft();
  }
}

function resetHardAnimation(numBalls) {
  if (ballPhysics) {
    ballPhysics.resetHard(numBalls);
  }
}

function addRandomBall() {
  if (ballPhysics) {
    ballPhysics.addRandomBall();
  }
}

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