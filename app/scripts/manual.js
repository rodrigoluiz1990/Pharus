(() => {
    const state = {
        navButtons: [],
        sections: [],
    };

    const normalizeText = (value) => {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    };

    const setActive = (targetId) => {
        state.navButtons.forEach((button) => {
            const isActive = button.dataset.target === targetId;
            button.classList.toggle('active', isActive);
        });
    };

    const scrollToSection = (targetId) => {
        const section = document.getElementById(targetId);
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(targetId);
    };

    const bindNavButtons = () => {
        state.navButtons.forEach((button) => {
            button.addEventListener('click', () => {
                scrollToSection(button.dataset.target);
            });
        });
    };

    const bindSearch = () => {
        const input = document.getElementById('manualSearch');
        if (!input) return;

        input.addEventListener('input', () => {
            const term = normalizeText(input.value);

            state.navButtons.forEach((button) => {
                const targetId = button.dataset.target;
                const section = document.getElementById(targetId);
                if (!section) {
                    button.classList.add('is-hidden');
                    return;
                }

                const source = normalizeText(
                    `${button.textContent} ${section.textContent} ${section.dataset.keywords || ''}`
                );
                const matches = !term || source.includes(term);
                button.classList.toggle('is-hidden', !matches);
                section.style.display = matches ? '' : 'none';
            });

            const firstVisible = state.navButtons.find((button) => !button.classList.contains('is-hidden'));
            if (firstVisible) {
                setActive(firstVisible.dataset.target);
            }
        });
    };

    const bindSectionObserver = () => {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

            if (!visible.length) return;
            setActive(visible[0].target.id);
        }, {
            root: null,
            rootMargin: '-20% 0px -65% 0px',
            threshold: [0.2, 0.45, 0.7]
        });

        state.sections.forEach((section) => observer.observe(section));
    };

    const init = () => {
        state.navButtons = Array.from(document.querySelectorAll('.manual-nav-item'));
        state.sections = Array.from(document.querySelectorAll('.manual-section'));

        if (!state.navButtons.length || !state.sections.length) return;

        bindNavButtons();
        bindSearch();
        bindSectionObserver();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

