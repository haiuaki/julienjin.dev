const planetBtns = document.querySelectorAll('.planet-btn');

planetBtns.forEach(planet => {
    /* Retrieve label string from dataset */
    const labelText = planet.getAttribute('data-label');
    if (!labelText) return;

    /* Generate a dedicated 2D screenspace label for this planet */
    const floatingLabel = document.createElement('div');
    floatingLabel.className = 'planet-label';
    floatingLabel.textContent = labelText;
    document.body.appendChild(floatingLabel);
    
    /* Hover triggers for dynamic crosshair tracking */
    planet.addEventListener('mouseenter', () => {
        if (!document.body.classList.contains('planet-focused')) {
            planet.classList.add('is-hovered');
            document.body.classList.add('crosshairs-active');
            
            /* Set transition styles once on hover */
            const crossX = document.getElementById('crosshair-x');
            const crossY = document.getElementById('crosshair-y');
            if (crossX && crossY) {
                crossX.style.transition = 'opacity 0.2s ease-out';
                crossY.style.transition = 'opacity 0.2s ease-out';
            }
        }
    });

    planet.addEventListener('mouseleave', () => {
        planet.classList.remove('is-hovered');
        if (!document.body.classList.contains('planet-focused')) {
            document.body.classList.remove('crosshairs-active');
        }
    });

    /* Hover triggers for dynamic crosshair tracking */
    planet.addEventListener('mouseenter', () => {
        if (!document.body.classList.contains('planet-focused')) {
            planet.classList.add('is-hovered');
            document.body.classList.add('crosshairs-active');
            
            /* Set transition styles once on hover */
            const crossX = document.getElementById('crosshair-x');
            const crossY = document.getElementById('crosshair-y');
            if (crossX && crossY) {
                crossX.style.transition = 'opacity 0.2s ease-out';
                crossY.style.transition = 'opacity 0.2s ease-out';
            }
        }
    });

    planet.addEventListener('mouseleave', () => {
        planet.classList.remove('is-hovered');
        if (!document.body.classList.contains('planet-focused')) {
            document.body.classList.remove('crosshairs-active');
        }
    });

    /* Update 2D label coordinates to track 3D planet */
    const trackPosition = () => {
        const rect = planet.getBoundingClientRect();
        const planetX = rect.x + rect.width / 2;
        const planetY = rect.y + rect.height / 2;
        
        /* Calculate true physical center of the solar system (The Sun) */
        const sunRect = sunBtn.getBoundingClientRect();
        const centerX = sunRect.x + sunRect.width / 2;
        const centerY = sunRect.y + sunRect.height / 2;

        /* Calculate normalized vector from Sun to Planet */
        let dx = planetX - centerX;
        let dy = planetY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            dx /= dist;
            dy /= dist;
        }

        /* Shift label anchor based on orbital vector */
        const xPercent = (dx * 50) - 50;
        const yPercent = (dy * 50) - 50;
        
        /* Push the label 15px outward along the vector */
        const LABEL_OFFSET = 15;
        /* Use translate3d for hardware-accelerated label positioning */
        floatingLabel.style.left = '0px';
        floatingLabel.style.top = '0px';
        floatingLabel.style.transform = `translate3d(${planetX + dx * LABEL_OFFSET}px, ${planetY + dy * LABEL_OFFSET}px, 0) translate(${xPercent}%, ${yPercent}%)`;


        /* Dynamically update crosshairs if hovered */
        if (planet.classList.contains('is-hovered') && !document.body.classList.contains('planet-focused')) {
            const crossX = document.getElementById('crosshair-x');
            const crossY = document.getElementById('crosshair-y');
            if (crossX && crossY) {
                crossX.style.transform = `translate3d(0, ${planetY}px, 0)`;
                crossY.style.transform = `translate3d(${planetX}px, 0, 0)`;
            }
        }
        requestAnimationFrame(trackPosition);
    };
    
    /* Start label tracking loop */
    trackPosition();

    
    planet.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (document.body.classList.contains('planet-focused')) {
            if (planet.classList.contains('active-planet')) {
                resetCamera();
            }
            return;
        }

        /* Isolate this specific planet and label for the CSS dimming effect */
        planet.classList.add('active-planet');
        floatingLabel.classList.add('active-planet');

        /* Pause physics engine when a planet is focused */
        isManuallyPaused = true;
        sessionStorage.setItem('isManuallyPaused', 'true');
        isPhysicsPaused = true;
        solarSystem.classList.add('paused');
        document.getAnimations().forEach(anim => {
            if (anim.animationName === 'master-spin' || anim.animationName === 'master-anti-spin') {
                anim.playbackRate = 0;
            }
        });

        /* Calculate perspective scale to maintain uniform visual size */
        const rect = planet.getBoundingClientRect();
        const perspectiveScale = rect.width / planet.offsetWidth;
        const targetPhysicalSize = 24 / (perspectiveScale * 1.3);
        
        planet.style.setProperty('--active-planet-size', `${targetPhysicalSize}px`);
        planet.style.setProperty('--active-planet-offset', `-${targetPhysicalSize / 2}px`);

        /* Calculate translation vectors for camera focus */
        const planetX = rect.x + rect.width / 2;
        const planetY = rect.y + rect.height / 2;
        
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        
        /* Define target screen coordinates */
        const targetX = 64; 
        const targetY = 58;

        /* Calculate scaled offsets */
        const scaledPlanetX = (planetX - screenCenterX) * 1.3 + screenCenterX;
        const scaledPlanetY = (planetY - screenCenterY) * 1.3 + screenCenterY;

        /* Calculate delta vector */
        const dx = targetX - scaledPlanetX;
        const dy = targetY - scaledPlanetY;

        /* Reset container margins */
        solarSystem.style.transition = 'margin 1.0s cubic-bezier(0.25, 1, 0.5, 1)';
        solarSystem.style.marginLeft = '0px';
        solarSystem.style.marginTop = '0px';

        /* Apply transforms to space container */
        const spaceContainer = document.getElementById('space-container');
        spaceContainer.style.transition = 'transform 1.0s cubic-bezier(0.25, 1, 0.5, 1)';
        spaceContainer.style.transform = `translate(${dx}px, ${dy}px) scale(1.3)`;

        /* Apply fractional translation to starfield for parallax effect */
        const starfield = document.getElementById('starfield');
        if (starfield) {
            starfield.style.transform = `translate(${dx * 0.15}px, ${dy * 0.15}px) scale(1.2)`;
        }

        /* Set crosshair positions and sweep them to the target coordinates */
        const crossX = document.getElementById('crosshair-x');
        const crossY = document.getElementById('crosshair-y');
        if (crossX && crossY) {
            /* Store origin coordinates to allow crosshairs to return home */
            crossX.dataset.originY = planetY;
            crossY.dataset.originX = planetX;
            crossX.dataset.baseOriginY = planetY;
            crossY.dataset.baseOriginX = planetX;

            /* Disable crosshair active class (opacity is inherited by planet-focused) */
            document.body.classList.remove('crosshairs-active');

            crossX.style.transform = `translate3d(0, ${planetY}px, 0)`;
            crossY.style.transform = `translate3d(${planetX}px, 0, 0)`;
            
            void crossX.offsetWidth; /* Force synchronous layout recalculation */
            
            crossX.style.transition = 'transform 1.0s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease-out';
            crossY.style.transition = 'transform 1.0s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease-out';
            crossX.style.transform = `translate3d(0, ${targetY}px, 0)`;
            crossY.style.transform = `translate3d(${targetX}px, 0, 0)`;
        }


        /* Update body class for focus state */
        document.body.classList.add('planet-focused');

        /* Typewriter to Bounding-Box Sequence */
        const windowHeader = document.getElementById('window-header');
        if (windowHeader) {
            windowHeader.innerHTML = '';
            document.body.classList.remove('panel-opening');
            
            const rawLabel = planet.getAttribute('data-label') || 'DATA';
            const labelText = rawLabel.toUpperCase();
            
            /* Clear any existing timers from previous clicks */
            if (typeof uiTimeouts !== 'undefined') {
                uiTimeouts.forEach(clearTimeout);
                uiTimeouts = [];
            }
            if (typeof uiIntervals !== 'undefined') {
                uiIntervals.forEach(clearInterval);
                uiIntervals = [];
            }

            /* Wait for camera sweep (1.5s) */
            let t1 = setTimeout(() => {
                let typeIndex = 0;
                const typingInterval = setInterval(() => {
                    if (typeIndex < labelText.length) {
                        windowHeader.innerHTML = `${labelText.substring(0, typeIndex + 1)}█`;
                        typeIndex++;
                    } else {
                        clearInterval(typingInterval);
                        /* Hold for a split second */
                        let t2 = setTimeout(() => {
                            /* Drop cursor to new line */
                            windowHeader.innerHTML = `${labelText}<br>█`;
                            /* Split cursor into bounding box corners */
                            let t3 = setTimeout(() => {
                                windowHeader.innerHTML = `${labelText}<br>&nbsp;`;
                                document.body.classList.add('panel-opening');
                            }, 300);
                            uiTimeouts.push(t3);
                        }, 300);
                        uiTimeouts.push(t2);
                    }
                }, 60);
                uiIntervals.push(typingInterval);
            }, 1000);
            uiTimeouts.push(t1);
        }

    });
});

