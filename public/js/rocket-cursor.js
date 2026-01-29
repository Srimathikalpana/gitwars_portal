(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'simple-cursor';
  document.body.appendChild(cursor);

  document.body.classList.add('simple-cursor-enabled');

  document.addEventListener('mousemove', e => {
    // Offset so rocket tip points at cursor position
    cursor.style.left = (e.clientX - 8) + 'px';
    cursor.style.top = (e.clientY - 2) + 'px';
  });

  document.addEventListener('mousedown', () =>
    cursor.classList.add('click')
  );
  document.addEventListener('mouseup', () =>
    cursor.classList.remove('click')
  );

  document.querySelectorAll('button, a, input, select, .clickable')
    .forEach(el => {
      el.addEventListener('mouseenter', () =>
        cursor.classList.add('hover')
      );
      el.addEventListener('mouseleave', () =>
        cursor.classList.remove('hover')
      );
    });
})();
