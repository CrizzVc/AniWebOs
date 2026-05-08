// Basic Spatial Navigation for webOS TV D-Pad
document.addEventListener('DOMContentLoaded', () => {
    const focusableElements = Array.from(document.querySelectorAll('.focusable'));
    let currentIndex = 0;

    // Set initial focus to the first element
    if (focusableElements.length > 0) {
        focusableElements[currentIndex].focus();
    }

    const statusElement = document.getElementById('status');

    // Handle remote control key presses
    document.addEventListener('keydown', (e) => {
        // Standard webOS remote control key codes
        const KEY_LEFT = 37;
        const KEY_UP = 38;
        const KEY_RIGHT = 39;
        const KEY_DOWN = 40;
        const KEY_ENTER = 13;
        
        // Magic Remote Back button
        const KEY_BACK = 461;

        switch (e.keyCode) {
            case KEY_LEFT:
            case KEY_UP:
                e.preventDefault();
                currentIndex = (currentIndex > 0) ? currentIndex - 1 : focusableElements.length - 1;
                focusableElements[currentIndex].focus();
                break;
            case KEY_RIGHT:
            case KEY_DOWN:
                e.preventDefault();
                currentIndex = (currentIndex < focusableElements.length - 1) ? currentIndex + 1 : 0;
                focusableElements[currentIndex].focus();
                break;
            case KEY_ENTER:
                e.preventDefault();
                const activeEl = document.activeElement;
                if (activeEl && activeEl.tagName === 'BUTTON') {
                    statusElement.innerText = `¡Has seleccionado: ${activeEl.innerText}!`;
                    // Add a brief animation class or handle click logic here
                }
                break;
            case KEY_BACK:
                // Handle back button for webOS (typically close app or go back a screen)
                // window.close(); // For webOS to close the app
                break;
            default:
                break;
        }
    });
    
    // Also support mouse interaction (Magic Remote pointer)
    focusableElements.forEach((el, index) => {
        el.addEventListener('mouseenter', () => {
            currentIndex = index;
            el.focus();
        });
        
        el.addEventListener('click', () => {
            statusElement.innerText = `¡Has hecho clic en: ${el.innerText}!`;
        });
    });
});
