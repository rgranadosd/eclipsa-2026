const cards = document.querySelectorAll('.product-card');
const preparedCards = new WeakSet();

const waitForMetadata = (video) =>
  new Promise((resolve) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }

    video.addEventListener('loadedmetadata', resolve, { once: true });
  });

const ensureVideoLoaded = async (video) => {
  if (!video.src) {
    const source = video.dataset.src;
    if (source) {
      video.src = source;
      video.load();
    }
  }

  await waitForMetadata(video);
};

const captureFrame = async (video, seconds) => {
  if (Number.isFinite(video.duration)) {
    video.currentTime = Math.min(Math.max(seconds, 0), Math.max(video.duration - 0.1, 0));
  }

  await new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };

    video.addEventListener('seeked', onSeeked, { once: true });
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.9);
};

const createSnapshots = async (card) => {
  const video = card.querySelector('.product-card__video');
  const frontImage = card.querySelector('.snapshot--front img');
  const backImage = card.querySelector('.snapshot--back img');

  await ensureVideoLoaded(video);

  const originalTime = video.currentTime;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;

  const frontRatio = Number.parseFloat(video.dataset.frontRatio || '0.12');
  const backRatio = Number.parseFloat(video.dataset.backRatio || '0.68');
  const safeFrontRatio = Number.isFinite(frontRatio) ? frontRatio : 0.12;
  const safeBackRatio = Number.isFinite(backRatio) ? backRatio : 0.68;

  const frontTime = duration * safeFrontRatio;
  const backTime = duration * safeBackRatio;

  const frontSnapshot = await captureFrame(video, frontTime);
  const backSnapshot = await captureFrame(video, backTime);

  frontImage.src = frontSnapshot;
  backImage.src = backSnapshot;

  video.currentTime = originalTime || 0;
};

const setupCardHoverPlayback = (card) => {
  const video = card.querySelector('.product-card__video');

  const start = async () => {
    await ensureVideoLoaded(video);
    card.classList.add('is-playing');
    video.currentTime = 0;
    video.play().catch(() => {});
  };

  const stop = () => {
    card.classList.remove('is-playing');
    video.pause();
    video.currentTime = 0;
  };

  card.addEventListener('mouseenter', start);
  card.addEventListener('mouseleave', stop);

  card.addEventListener('focusin', start);
  card.addEventListener('focusout', stop);

  card.addEventListener('touchstart', (event) => {
    if (event.target.closest('.buy-btn')) {
      return;
    }

    const isPlaying = card.classList.contains('is-playing');

    cards.forEach((otherCard) => {
      if (otherCard !== card) {
        otherCard.classList.remove('is-playing');
        const otherVideo = otherCard.querySelector('.product-card__video');
        otherVideo.pause();
        otherVideo.currentTime = 0;
      }
    });

    if (isPlaying) {
      stop();
    } else {
      start();
    }
  });
};

const setupSizeSelector = (card) => {
  const sizeButtons = card.querySelectorAll('.size-option');
  if (!sizeButtons.length) {
    return;
  }

  const setActiveSize = (button) => {
    sizeButtons.forEach((sizeButton) => {
      sizeButton.classList.toggle('is-active', sizeButton === button);
    });
  };

  sizeButtons.forEach((button, index) => {
    if (index === 0 && !button.classList.contains('is-active')) {
      button.classList.add('is-active');
    }
  });
};

const setupSizeSelectionDelegation = () => {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.size-option');

    if (!button) {
      return;
    }

    const card = button.closest('.product-card');

    if (!card) {
      return;
    }

    const sizeButtons = card.querySelectorAll('.size-option');

    sizeButtons.forEach((sizeButton) => {
      sizeButton.classList.toggle('is-active', sizeButton === button);
    });
  });
};

const setupCard = async (card) => {
  if (preparedCards.has(card)) {
    return;
  }

  preparedCards.add(card);
  card.classList.add('is-loading');
  setupSizeSelector(card);

  try {
    await createSnapshots(card);
    setupCardHoverPlayback(card);
  } finally {
    card.classList.remove('is-loading');
  }
};

const init = () => {
  setupSizeSelectionDelegation();

  cards.forEach((card) => {
    setupSizeSelector(card);
  });

  // Eager setup so hero bg snapshots populate immediately
  cards.forEach((card) => setupCard(card));

  if (!('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        setupCard(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: '200px 0px'
    }
  );

  for (const card of cards) {
    observer.observe(card);
  }
};

init();

const initPromoCycle = () => {
  const msgs = document.querySelectorAll('.promo-bar__msg');
  if (msgs.length < 2) return;
  let current = 0;
  setInterval(() => {
    msgs[current].classList.remove('is-active');
    current = (current + 1) % msgs.length;
    msgs[current].classList.add('is-active');
  }, 3500);
};

initPromoCycle();
