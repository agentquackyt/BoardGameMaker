const menuToggle = document.getElementById('menu-toggle') as HTMLButtonElement | null;
const nav = document.getElementById('main-nav') as HTMLElement | null;
const currentYear = document.getElementById('current-year');
const revealSections = document.querySelectorAll<HTMLElement>('.section-reveal');

const closeMobileNav = () => {
    if (!menuToggle || !nav) {
        return;
    }

    menuToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
};

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!isOpen));
        nav.classList.toggle('is-open', !isOpen);
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMobileNav);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 760) {
            closeMobileNav();
        }
    });
}

if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
}

if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, activeObserver) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add('revealed');
            activeObserver.unobserve(entry.target);
        });
    }, {
        threshold: 0.18
    });

    revealSections.forEach(section => observer.observe(section));
} else {
    revealSections.forEach(section => section.classList.add('revealed'));
}