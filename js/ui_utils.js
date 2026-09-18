const brandLogo = document.getElementById('brand-logo');
if (brandLogo) {
    const textToType = brandLogo.getAttribute('data-text');
    const cursorChar = brandLogo.getAttribute('data-cursor') || '_';
    
    if (textToType) {
        let typeIndex = 0;
        
        /* Initialize empty bracket state with cursor */
        brandLogo.innerHTML = `[<span class="terminal-cursor">${cursorChar}</span>]`;
        
        /* Delay typing to align with initial load transition */
        setTimeout(() => {
            const typingInterval = setInterval(() => {
                if (typeIndex < textToType.length) {
                    /* Slice string and append cursor within brackets */
                    brandLogo.innerHTML = `[${textToType.substring(0, typeIndex + 1)}<span class="terminal-cursor">${cursorChar}</span>]`;
                    typeIndex++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 60); /* Keystroke interval */
        }, 1500); /* Initial delay */
    }
}


