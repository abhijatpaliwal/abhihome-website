(function () {
  // Build lightbox DOM
  var overlay = document.createElement('div');
  overlay.id = 'ah-lightbox';
  overlay.innerHTML =
    '<div id="ah-lb-backdrop"></div>' +
    '<div id="ah-lb-panel">' +
      '<button id="ah-lb-close" aria-label="Close">✕</button>' +
      '<img id="ah-lb-img" src="" alt="">' +
      '<p id="ah-lb-caption"></p>' +
    '</div>';
  document.body.appendChild(overlay);

  // Styles injected via JS so no extra <link> needed
  var style = document.createElement('style');
  style.textContent = [
    '#ah-lightbox{display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;}',
    '#ah-lightbox.open{display:flex;}',
    '#ah-lb-backdrop{position:absolute;inset:0;background:rgba(20,30,25,0.92);cursor:zoom-out;}',
    '#ah-lb-panel{position:relative;z-index:1;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:12px;}',
    '#ah-lb-img{max-width:90vw;max-height:80vh;object-fit:contain;background:#f0e8dc;box-shadow:0 24px 80px rgba(0,0,0,0.5);display:block;}',
    '#ah-lb-caption{color:rgba(250,248,245,0.65);font-family:"Raleway",sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;text-align:center;}',
    '#ah-lb-close{position:absolute;top:-44px;right:0;background:none;border:none;color:rgba(250,248,245,0.6);font-size:22px;cursor:pointer;line-height:1;padding:8px;transition:color 0.2s;}',
    '#ah-lb-close:hover{color:#FAF8F5;}',
    '.product-image img{cursor:zoom-in;transition:opacity 0.2s;}',
    '.product-image img:hover{opacity:0.88;}'
  ].join('');
  document.head.appendChild(style);

  var lbImg    = document.getElementById('ah-lb-img');
  var lbCap    = document.getElementById('ah-lb-caption');
  var lbClose  = document.getElementById('ah-lb-close');
  var backdrop = document.getElementById('ah-lb-backdrop');

  function open(src, caption) {
    lbImg.src = src;
    lbImg.alt = caption || '';
    lbCap.textContent = caption || '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  // Wire up all product images on page load
  document.addEventListener('DOMContentLoaded', function () {
    var imgs = document.querySelectorAll('.product-image img');
    imgs.forEach(function (img) {
      img.addEventListener('click', function () {
        // Try to get product name from sibling .product-name
        var card = img.closest('.product-card');
        var nameEl = card ? card.querySelector('.product-name') : null;
        var refEl  = card ? card.querySelector('.product-ref')  : null;
        var caption = (nameEl ? nameEl.textContent : '') +
                      (refEl  ? '  ·  ' + refEl.textContent : '');
        open(img.src, caption.trim());
      });
    });
  });

  lbClose.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
