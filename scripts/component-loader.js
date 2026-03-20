// scripts/component-loader.js
class ComponentLoader {
    static componentsLoaded = false;
    static sidebarScriptLoaded = false;

    static async loadComponent(componentId, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const element = document.getElementById(componentId);

            if (element) {
                element.innerHTML = html;
                console.log(`Component ${componentId} loaded successfully`);

                if (componentId === 'sidebar-container') {
                    this.loadSidebarScript();
                }
            }
        } catch (error) {
            console.error(`Error loading component ${componentId}:`, error);
        }
    }

    static loadScript(src, callback) {
        if (document.querySelector(`script[src="${src}"]`)) {
            if (callback) callback();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`Script ${src} loaded successfully`);
            if (callback) callback();
        };
        script.onerror = (e) => console.error(`Error loading script ${src}:`, e);
        document.head.appendChild(script);
    }

    static loadSidebarScript() {
        if (window.initSidebar && typeof window.initSidebar === 'function') {
            window.initSidebar();
            return;
        }

        if (this.sidebarScriptLoaded || document.querySelector('script[src="scripts/sidebar.js"]')) {
            return;
        }

        this.sidebarScriptLoaded = true;
        this.loadScript('scripts/sidebar.js', () => {
            if (window.initSidebar && typeof window.initSidebar === 'function') {
                window.initSidebar();
            }
        });
    }

    static async loadAllComponents() {
        if (this.componentsLoaded) return;
        this.componentsLoaded = true;

        if (document.getElementById('sidebar-container')) {
            await this.loadComponent('sidebar-container', 'sidebar.html');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        ComponentLoader.loadAllComponents();
    });
} else {
    ComponentLoader.loadAllComponents();
}