/* custom-ecom-scripts.js */

document.addEventListener('DOMContentLoaded', () => {
  const hotspots = document.querySelectorAll('.custom-grid-hotspot');
  const popupOverlay = document.querySelector('.custom-popup-overlay');
  const popupClose = document.querySelector('.custom-popup-close');
  const popupTitle = document.querySelector('.custom-popup-title');
  const popupPrice = document.querySelector('.custom-popup-price');
  const popupDesc = document.querySelector('.custom-popup-description');
  const popupVariantsContainer = document.querySelector('.custom-popup-variants');
  const addToCartBtn = document.querySelector('.custom-popup-add-to-cart');
  const cartMessage = document.querySelector('.custom-cart-message');
  
  let currentProduct = null;
  let selectedVariant = null;

  // Format money (basic fallback)
  const formatMoney = (cents) => {
    return '$' + (cents / 100).toFixed(2);
  };

  // Open Popup and handle hover hotspot
  const gridItems = document.querySelectorAll('.custom-grid-item');
  gridItems.forEach(item => {
    const hotspot = item.querySelector('.custom-grid-hotspot');
    
    // Mouse follow logic
    item.addEventListener('mousemove', (e) => {
      if (!hotspot) return;
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      hotspot.style.left = `${x}px`;
      hotspot.style.top = `${y}px`;
    });

    item.addEventListener('click', (e) => {
      const productJson = item.getAttribute('data-product');
      if (!productJson) return;
      
      try {
        currentProduct = JSON.parse(productJson);
      } catch (err) {
        console.error("Invalid product JSON", err);
        return;
      }

      // Populate Data
      popupTitle.textContent = currentProduct.title;
      popupDesc.innerHTML = currentProduct.description || '';
      
      // Default to first variant
      const firstAvail = currentProduct.variants.find(v => v.available) || currentProduct.variants[0];
      selectedVariant = firstAvail;
      popupPrice.textContent = formatMoney(selectedVariant.price);
      
      const popupImg = document.querySelector('.custom-popup-image');
      if (popupImg) {
        const imgSrc = currentProduct.featured_image || currentProduct.images[0] || '';
        if (imgSrc) {
          // Helper to resize Shopify CDN images safely
          const getSizedImageUrl = (src, size) => {
            if (!src) return '';
            try {
              const urlStr = src.startsWith('//') ? 'https:' + src : (src.startsWith('http') ? src : window.location.origin + src);
              const url = new URL(urlStr);
              url.searchParams.set('width', size);
              return url.toString();
            } catch (e) {
              return src;
            }
          };
          
          popupImg.src = getSizedImageUrl(imgSrc, 400); // Sharp default
          popupImg.srcset = `
            ${getSizedImageUrl(imgSrc, 200)} 200w, 
            ${getSizedImageUrl(imgSrc, 400)} 400w, 
            ${getSizedImageUrl(imgSrc, 600)} 600w
          `;
          popupImg.sizes = "(max-width: 768px) 100px, 100px";
        } else {
          popupImg.src = '';
          popupImg.srcset = '';
        }
      }
      
      // Enforce Color first, and do not auto-select Size
      let optionsWithIndex = currentProduct.options.map((name, originalIndex) => ({ name, originalIndex }));
      optionsWithIndex.sort((a, b) => {
        const aIsColor = a.name.toLowerCase() === 'color' || a.name.toLowerCase() === 'colour';
        const bIsColor = b.name.toLowerCase() === 'color' || b.name.toLowerCase() === 'colour';
        if (aIsColor && !bIsColor) return -1;
        if (!aIsColor && bIsColor) return 1;
        return 0;
      });

      let selectedOptions = [];
      optionsWithIndex.forEach((optData) => {
        const isColor = optData.name.toLowerCase() === 'color' || optData.name.toLowerCase() === 'colour';
        if (isColor) {
          selectedOptions[optData.originalIndex] = firstAvail['option' + (optData.originalIndex + 1)];
        } else {
          selectedOptions[optData.originalIndex] = null; // Do not auto-select non-color options
        }
      });
      
      // Render Variants
      popupVariantsContainer.innerHTML = '';
      if (currentProduct.variants.length > 1 && currentProduct.options) {
        optionsWithIndex.forEach((optData) => {
          const optionName = optData.name;
          const index = optData.originalIndex;
          const optKey = 'option' + (index + 1);
          const uniqueVals = [...new Set(currentProduct.variants.map(v => v[optKey]).filter(Boolean))];

          const wrapper = document.createElement('div');
          wrapper.className = 'custom-variant-wrapper';

          const label = document.createElement('label');
          label.className = 'custom-variant-label';
          label.textContent = optionName;
          wrapper.appendChild(label);

          if (optionName.toLowerCase() === 'color' || optionName.toLowerCase() === 'colour') {
            // Render Split Buttons
            const colorSelector = document.createElement('div');
            colorSelector.className = 'custom-color-selector';
            
            const colorSlider = document.createElement('div');
            colorSlider.className = 'custom-color-slider';
            colorSlider.style.width = `${100 / uniqueVals.length}%`;
            colorSelector.appendChild(colorSlider);
            
            let initialIndex = 0;
            
            uniqueVals.forEach((val, valIndex) => {
              const opt = document.createElement('div');
              opt.className = 'custom-color-option';
              if (val === selectedOptions[index]) {
                opt.classList.add('selected');
                initialIndex = valIndex;
              }
              
              const colorBar = document.createElement('div');
              colorBar.className = 'custom-color-bar';
              const cssColor = val.toLowerCase().trim();
              colorBar.style.backgroundColor = cssColor;
              
              const textSpan = document.createElement('span');
              textSpan.textContent = val;
              
              opt.appendChild(colorBar);
              opt.appendChild(textSpan);
              
              opt.addEventListener('click', () => {
                // Remove selected from siblings
                Array.from(colorSelector.querySelectorAll('.custom-color-option')).forEach(c => {
                  c.classList.remove('selected');
                });
                opt.classList.add('selected');
                
                colorSlider.style.transform = `translateX(${valIndex * 100}%)`;
                
                selectedOptions[index] = val;
                updateVariantSelection();
              });
              
              colorSelector.appendChild(opt);
            });
            
            colorSlider.style.transform = `translateX(${initialIndex * 100}%)`;
            wrapper.appendChild(colorSelector);
          } else {
            // Render Custom Dropdown (Size, etc)
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-size-dropdown';

            const header = document.createElement('div');
            header.className = 'custom-size-dropdown-header';
            
            const headerText = document.createElement('span');
            headerText.textContent = selectedOptions[index] || `Choose your ${optionName.toLowerCase()}`;
            
            const line = document.createElement('div');
            line.className = 'custom-variant-line';
            
            const icon = document.createElement('div');
            icon.className = 'custom-variant-icon';
            icon.innerHTML = `<svg width="12" height="7" viewBox="0 0 12 7" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

            header.appendChild(headerText);
            header.appendChild(line);
            header.appendChild(icon);
            
            const list = document.createElement('div');
            list.className = 'custom-size-dropdown-list';
            
            uniqueVals.forEach(val => {
              const option = document.createElement('div');
              option.className = 'custom-size-option';
              option.textContent = val;
              
              option.addEventListener('click', (e) => {
                e.stopPropagation();
                headerText.textContent = val;
                selectedOptions[index] = val;
                dropdown.classList.remove('is-open');
                updateVariantSelection();
              });
              
              list.appendChild(option);
            });

            header.addEventListener('click', (e) => {
              e.stopPropagation();
              // Close any other open dropdowns in the popup first
              popupVariantsContainer.querySelectorAll('.custom-size-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('is-open');
              });
              dropdown.classList.toggle('is-open');
            });
            
            document.addEventListener('click', (e) => {
              if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('is-open');
              }
            });

            dropdown.appendChild(header);
            dropdown.appendChild(list);
            wrapper.appendChild(dropdown);
          }

          popupVariantsContainer.appendChild(wrapper);
        });
      }
      
      function updateVariantSelection() {
        selectedVariant = currentProduct.variants.find(v => {
          let match = true;
          if (currentProduct.options.length > 0 && v.option1 !== selectedOptions[0]) match = false;
          if (currentProduct.options.length > 1 && v.option2 !== selectedOptions[1]) match = false;
          if (currentProduct.options.length > 2 && v.option3 !== selectedOptions[2]) match = false;
          return match;
        });

        const btnSpan = addToCartBtn.querySelector('span');
        if (selectedVariant) {
          popupPrice.textContent = formatMoney(selectedVariant.price);
          addToCartBtn.disabled = !selectedVariant.available;
          if (btnSpan) btnSpan.textContent = selectedVariant.available ? 'ADD TO CART' : 'SOLD OUT';
        } else {
          addToCartBtn.disabled = true;
          const missingSelection = selectedOptions.some(opt => opt === null);
          if (btnSpan) btnSpan.textContent = missingSelection ? 'ADD TO CART' : 'UNAVAILABLE';
        }
      }
      
      updateVariantSelection();
      
      cartMessage.textContent = '';
      cartMessage.className = 'custom-cart-message';
      
      popupOverlay.classList.add('active');
    });
  });

  // Close Popup
  const closePopup = () => {
    popupOverlay.classList.remove('active');
    
    // Clear the image after the popup fades out to prevent the previous product's image 
    // from briefly showing up when opening a different product's popup
    setTimeout(() => {
      const popupImg = document.querySelector('.custom-popup-image');
      if (popupImg) {
        popupImg.src = '';
        popupImg.srcset = '';
      }
    }, 300);
  };

  if (popupClose) {
    popupClose.addEventListener('click', closePopup);
  }
  
  if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
      if (e.target === popupOverlay) closePopup();
    });
  }

  // Add to Cart Logic
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async () => {
      if (!selectedVariant) return;
      
      const btnSpan = addToCartBtn.querySelector('span');
      
      addToCartBtn.disabled = true;
      if (btnSpan) btnSpan.textContent = 'Adding...';
      cartMessage.textContent = '';
      cartMessage.className = 'custom-cart-message';

      try {
        // Check if selected variant options contain both "Black" and "Medium"
        // We'll check the option strings directly (option1, option2, option3)
        const opts = [selectedVariant.option1, selectedVariant.option2, selectedVariant.option3]
          .filter(Boolean)
          .map(o => o.toLowerCase());
          
        const hasBlack = opts.some(o => o.includes('black'));
        const hasMedium = opts.some(o => o.includes('medium') || o === 'm');

        let itemsToAdd = [{
          id: selectedVariant.id,
          quantity: 1
        }];

        // Custom logic: Add Soft Winter Jacket if Black Medium is selected
        if (hasBlack && hasMedium) {
          try {
            // Fetch the jacket product JSON
            const jacketRes = await fetch('/products/soft-winter-jacket.js');
            if (jacketRes.ok) {
              const jacketProduct = await jacketRes.json();
              const firstAvailJacketVar = jacketProduct.variants.find(v => v.available);
              if (firstAvailJacketVar) {
                itemsToAdd.push({
                  id: firstAvailJacketVar.id,
                  quantity: 1
                });
              }
            } else {
              console.warn("Soft winter jacket product not found on this store.");
            }
          } catch (err) {
            console.warn("Could not fetch soft winter jacket", err);
          }
        }

        // Add to cart via Ajax API
        const addRes = await fetch(window.Shopify.routes.root + 'cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToAdd })
        });

        if (addRes.ok) {
          cartMessage.textContent = 'Successfully added to cart!';
          cartMessage.classList.add('success');
          
          setTimeout(() => {
            closePopup();
            if (btnSpan) btnSpan.textContent = 'Add to cart';
            addToCartBtn.disabled = false;
          }, 2000);
        } else {
          const errData = await addRes.json();
          throw new Error(errData.description || 'Error adding to cart');
        }
      } catch (error) {
        cartMessage.textContent = error.message;
        cartMessage.classList.add('error');
        if (btnSpan) btnSpan.textContent = 'Add to cart';
        addToCartBtn.disabled = false;
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector(".custom-header-hamburger");
  const dropdown = document.getElementById("custom-dropdown");
  const iconHamburger = document.querySelector(".icon-hamburger");
  const iconClose = document.querySelector(".icon-close");

  if(hamburger && dropdown && iconHamburger && iconClose) {
    hamburger.addEventListener("click", function() {
      const isOpen = dropdown.classList.contains("is-open");
      
      if(isOpen) {
        dropdown.classList.remove("is-open");
        hamburger.setAttribute("aria-expanded", "false");
        dropdown.setAttribute("aria-hidden", "true");
        iconHamburger.style.display = "block";
        iconClose.style.display = "none";
      } else {
        dropdown.classList.add("is-open");
        hamburger.setAttribute("aria-expanded", "true");
        dropdown.setAttribute("aria-hidden", "false");
        iconHamburger.style.display = "none";
        iconClose.style.display = "block";
      }
    });
  }
});

