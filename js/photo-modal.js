function openPhotoModal(photoPath, title) {
  const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(title) : title;
  const modal = document.createElement('div');
  modal.className = 'photo-modal';
  modal.innerHTML = `
    <button class="photo-modal-close">
      <i class="fas fa-times"></i>
    </button>
    <div class="photo-modal-content">
      <img src="${photoPath}" alt="${safeTitle}" style="transition:transform 0.1s; transform-origin:0 0;" />
    </div>
    <div class="photo-modal-title">${safeTitle}</div>
    <div class="photo-modal-zoom-indicator">100%</div>
  `;
  modal.onclick = (e) => { if (e.target === modal || e.target === modal.querySelector('.photo-modal-content')) modal.remove(); };
  modal.querySelector('.photo-modal-close').onclick = () => modal.remove();
  document.body.appendChild(modal);

  const img = modal.querySelector('img');
  const zoomIndicator = modal.querySelector('.photo-modal-zoom-indicator');
  let scale = 1;
  let isDragging = false, startX, startY, translateX = 0, translateY = 0;
  let hideZoomTimer = null;

  function showZoomIndicator() {
    zoomIndicator.textContent = Math.round(scale * 100) + '%';
    zoomIndicator.classList.add('visible');
    clearTimeout(hideZoomTimer);
    hideZoomTimer = setTimeout(() => zoomIndicator.classList.remove('visible'), 1200);
  }

  function applyTransform() {
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    img.style.cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';
  }

  img.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = img.getBoundingClientRect();
    const prevScale = scale;
    scale = Math.min(5, Math.max(1, scale + (e.deltaY < 0 ? 0.2 : -0.2)));
    if (scale === 1) {
      translateX = 0;
      translateY = 0;
    } else {
      const ratio = scale / prevScale;
      translateX = translateX + (e.clientX - rect.left) * (1 - ratio);
      translateY = translateY + (e.clientY - rect.top) * (1 - ratio);
    }
    applyTransform();
    showZoomIndicator();
  }, { passive: false });

  img.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    applyTransform();
    e.preventDefault();
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    applyTransform();
  }
  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    applyTransform();
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  modal.addEventListener('remove', () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  });
}