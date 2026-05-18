/* Bloom theme - global.js
   Cart drawer logic, free gift progress, free shipping progress, cart upsell, INR money formatting */
(function(){
  'use strict';
  var t = window.theme || {};
  var routes = t.routes || {cart_add:'/cart/add.js',cart_change:'/cart/change.js',cart:'/cart.js'};
  var settings = t.settings || {freeShip:999,freeGift:1499,currency:'₹'};

  function fmt(cents){
    return settings.currency + (cents/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function fmtRound(cents){
    return settings.currency + Math.round(cents/100).toLocaleString('en-IN');
  }
  function $(s,c){return (c||document).querySelector(s)}
  function $$(s,c){return (c||document).querySelectorAll(s)}
  function show(el){if(el)el.removeAttribute('hidden')}
  function hide(el){if(el)el.setAttribute('hidden','')}

  // Cart drawer open/close
  var drawer = $('[data-cart-drawer]');
  function openDrawer(){
    if(!drawer)return;
    show(drawer);
    document.body.style.overflow='hidden';
    refreshCart();
  }
  function closeDrawer(){
    if(!drawer)return;
    hide(drawer);
    document.body.style.overflow='';
  }
  $$('[data-cart-open]').forEach(function(b){b.addEventListener('click',function(e){e.preventDefault();openDrawer()})});
  $$('[data-cart-close]').forEach(function(b){b.addEventListener('click',closeDrawer)});
  document.addEventListener('cart:open',openDrawer);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrawer()});

  // Fetch cart
  function fetchCart(){
    return fetch('/cart.js',{headers:{Accept:'application/json'}}).then(function(r){return r.json()});
  }

  // Render cart contents
  function refreshCart(){
    fetchCart().then(function(cart){
      renderCart(cart);
      updateProgress(cart.total_price);
      updateCartCount(cart.item_count);
      maybeShowUpsell(cart);
    });
  }

  function updateCartCount(n){
    $$('[data-cart-count]').forEach(function(el){
      el.textContent = n;
      n > 0 ? show(el) : hide(el);
    });
    $$('[data-cart-item-count]').forEach(function(el){el.textContent = n});
  }

  function renderCart(cart){
    var body = $('[data-cart-body]');
    var foot = $('[data-cart-foot]');
    if(!body)return;

    if(cart.item_count === 0){
      body.innerHTML = '<div class="cd__empty"><div class="cd__empty-icon">🛍</div><p class="cd__empty-title">Your cart\'s empty</p><p class="cd__empty-text">Add something special to make your day better.</p><a href="/collections/all" class="btn btn--primary">Start shopping</a></div>';
      hide(foot);
      hide($('[data-cart-upsell]'));
      return;
    }

    var html = '';
    cart.items.forEach(function(item, i){
      var idx = i+1;
      var img = item.image ? '<img src="'+item.image.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|original|1024x1024|2048x2048|master)+\./,'_200x.')+'" alt="" width="80" height="80">' : '';
      html += '<div class="ci" data-line="'+idx+'">'
        + '<a href="'+item.url+'" class="ci__img">'+img+'</a>'
        + '<div class="ci__info">'
        +   '<a href="'+item.url+'" class="ci__name">'+item.product_title+'</a>'
        +   (item.product_has_only_default_variant ? '' : '<p class="ci__var">'+item.variant_title+'</p>')
        +   '<div class="ci__row">'
        +     '<div class="ci__qty">'
        +       '<button class="ci__step" data-line="'+idx+'" data-delta="-1">−</button>'
        +       '<span data-qty>'+item.quantity+'</span>'
        +       '<button class="ci__step" data-line="'+idx+'" data-delta="1">+</button>'
        +     '</div>'
        +     '<span class="ci__price">'+fmt(item.final_line_price)+'</span>'
        +   '</div>'
        +   '<button class="ci__remove" data-remove="'+idx+'">Remove</button>'
        + '</div>'
        + '</div>';
    });
    body.innerHTML = html;

    show(foot);
    var totalEl = $('[data-cart-total]'), checkoutEl = $('[data-checkout-total]');
    if(totalEl)totalEl.textContent = fmt(cart.total_price);
    if(checkoutEl)checkoutEl.textContent = fmt(cart.total_price);

    bindCartEvents();
  }

  function bindCartEvents(){
    $$('[data-cart-body] .ci__step').forEach(function(b){
      b.addEventListener('click',function(){
        var line = parseInt(this.dataset.line,10);
        var delta = parseInt(this.dataset.delta,10);
        var qtyEl = this.parentElement.querySelector('[data-qty]');
        var newQty = Math.max(0, parseInt(qtyEl.textContent,10) + delta);
        changeLine(line, newQty);
      });
    });
    $$('[data-cart-body] .ci__remove').forEach(function(b){
      b.addEventListener('click',function(){
        changeLine(parseInt(this.dataset.remove,10), 0);
      });
    });
  }

  function changeLine(line, qty){
    fetch(routes.cart_change,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({line:line, quantity:qty})
    }).then(function(r){return r.json()}).then(function(cart){
      renderCart(cart);
      updateProgress(cart.total_price);
      updateCartCount(cart.item_count);
      maybeShowUpsell(cart);
    });
  }

  // Free shipping + free gift progress bars
  function updateProgress(total){
    var shipFill = $('[data-ship-fill]'), shipText = $('[data-ship-text]');
    if(shipFill && shipText){
      var threshold = settings.freeShip * 100;
      var pct = Math.min(100, Math.round(total/threshold*100));
      shipFill.style.width = pct + '%';
      if(total >= threshold){
        shipText.innerHTML = '🎉 You\'ve unlocked <strong>FREE shipping!</strong>';
      }else{
        shipText.innerHTML = 'Add <strong>'+fmtRound(threshold-total)+'</strong> more for <strong>FREE shipping</strong>';
      }
    }
    var giftFill = $('[data-gift-fill]'), giftText = $('[data-gift-text]');
    if(giftFill && giftText){
      var giftThreshold = settings.freeGift * 100;
      var giftPct = Math.min(100, Math.round(total/giftThreshold*100));
      giftFill.style.width = giftPct + '%';
      if(total >= giftThreshold){
        giftText.innerHTML = '🎉 FREE gift unlocked at checkout!';
      }else{
        giftText.innerHTML = 'Add <strong>'+fmtRound(giftThreshold-total)+'</strong> more for a <strong>FREE gift</strong> 🎁';
      }
    }
  }

  // Cart upsell
  var upsellHandle = settings.cartUpsell;
  function maybeShowUpsell(cart){
    var upsell = $('[data-cart-upsell]'), card = $('[data-upsell-card]');
    if(!upsell || !card)return;
    if(!upsellHandle){hide(upsell);return}
    var alreadyInCart = cart.items.some(function(it){return it.handle === upsellHandle});
    if(alreadyInCart || cart.item_count === 0){hide(upsell);return}

    fetch('/products/'+upsellHandle+'.js',{headers:{Accept:'application/json'}})
      .then(function(r){return r.json()})
      .then(function(p){
        if(!p.available){hide(upsell);return}
        var v = p.variants.find(function(x){return x.available}) || p.variants[0];
        var img = p.featured_image ? '<img src="'+p.featured_image.replace(/_(pico|icon|thumb|small|compact|medium|large|grande|original)+\./,'_160x.')+'" alt="">' : '';
        card.innerHTML = img
          + '<div class="cd__upsell-info">'
          +   '<p class="cd__upsell-name">'+p.title+'</p>'
          +   '<p class="cd__upsell-price">+'+fmt(v.price)+'</p>'
          + '</div>'
          + '<button class="cd__upsell-add" data-cart-upsell-add="'+v.id+'">+ Add</button>';
        show(upsell);
        card.querySelector('[data-cart-upsell-add]').addEventListener('click',function(){
          this.disabled = true;
          this.textContent = 'Adding...';
          addToCart(v.id, 1).then(function(){refreshCart()});
        });
      })
      .catch(function(){hide(upsell)});
  }

  // Cart upsell on the cart page itself
  $$('[data-cart-upsell-add]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id = parseInt(this.dataset.cartUpsellAdd, 10);
      this.disabled = true;
      this.textContent = 'Adding...';
      addToCart(id, 1).then(function(){window.location.reload()});
    });
  });

  function addToCart(id, qty){
    return fetch(routes.cart_add,{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({id:id, quantity:qty||1})
    }).then(function(r){return r.json()});
  }

  // Quick-add forms (product cards) - intercept submit, add via AJAX, open drawer
  $$('[data-quick-add]').forEach(function(form){
    form.addEventListener('submit',function(e){
      var btn = form.querySelector('button[type="submit"]');
      // If there are options to choose, redirect to product page
      var idInput = form.querySelector('input[name="id"]');
      if(!idInput || !idInput.value){return}
      e.preventDefault();
      if(btn){btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Adding...'; btn.dataset.origText = orig}
      addToCart(parseInt(idInput.value,10), 1).then(function(){
        if(btn){
          btn.textContent = '✓ Added!';
          setTimeout(function(){btn.disabled=false;btn.textContent=btn.dataset.origText||'Add to cart'},1400);
        }
        document.dispatchEvent(new CustomEvent('cart:updated'));
        openDrawer();
      }).catch(function(){
        if(btn){btn.disabled=false;btn.textContent=btn.dataset.origText||'Add to cart'}
      });
    });
  });

  // On cart updates dispatched from other scripts
  document.addEventListener('cart:updated', refreshCart);

  // Initial state on page load - refresh progress bars even if drawer not open
  fetchCart().then(function(cart){
    updateProgress(cart.total_price);
    updateCartCount(cart.item_count);
  });

  // Cart page: bind step buttons
  $$('.cart-pg__row .ci__step').forEach(function(btn){
    btn.addEventListener('click',function(){
      var row = this.closest('.cart-pg__row');
      var input = row.querySelector('[data-qty]');
      if(!input)return;
      var newQty = Math.max(0, parseInt(input.value,10) + parseInt(this.dataset.delta,10));
      input.value = newQty;
      // Submit the form
      var form = this.closest('form');
      if(form)form.submit();
    });
  });

  // ---- Saved discount auto-apply ----
  // If a discount code was captured (from welcome popup, exit intent, pre-checkout, or URL),
  // surface it in the cart drawer and append ?discount= to all checkout links so Shopify
  // applies it automatically when the visitor lands on /checkout.
  function getSavedDiscount(){
    try {
      // URL param wins (someone landed via /collections/all?discount=WELCOME10)
      var u = new URL(window.location.href);
      var fromUrl = u.searchParams.get('discount');
      if(fromUrl){
        try { localStorage.setItem('bloom_active_discount', fromUrl); } catch(e){}
        return fromUrl;
      }
      return localStorage.getItem('bloom_active_discount');
    } catch(e){ return null; }
  }
  function applySavedDiscount(){
    var code = getSavedDiscount();
    if(!code) return;
    // Update saved-code UI in drawer
    var wrap = $('[data-saved-discount]');
    var codeEl = $('[data-saved-discount-code]');
    var note = $('[data-discount-note]');
    if(wrap && codeEl){
      codeEl.textContent = code;
      wrap.removeAttribute('hidden');
      if(note) note.style.display = 'none';
    }
    // Append discount param to every checkout-trigger link
    $$('a[data-checkout-trigger]').forEach(function(a){
      try {
        var href = a.getAttribute('href') || '/checkout';
        if(href.indexOf('discount=') > -1) return;
        var sep = href.indexOf('?') > -1 ? '&' : '?';
        a.setAttribute('href', href + sep + 'discount=' + encodeURIComponent(code));
      } catch(e){}
    });
    // For the cart-page form button, inject a hidden input to forward the code
    $$('form[action*="/cart"]').forEach(function(form){
      var btn = form.querySelector('button[name="checkout"]');
      if(!btn) return;
      if(form.querySelector('input[name="discount"]')) return;
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'discount';
      hidden.value = code;
      form.appendChild(hidden);
    });
  }
  applySavedDiscount();
  // Re-apply after cart drawer re-renders
  document.addEventListener('cart:updated', applySavedDiscount);
  var _drawerForObserver = $('[data-cart-drawer]');
  if(_drawerForObserver && window.MutationObserver){
    new MutationObserver(applySavedDiscount).observe(_drawerForObserver, {childList:true, subtree:true});
  }
})();
