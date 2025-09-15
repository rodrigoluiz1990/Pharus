// scripts/component-loader.js
class ComponentLoader {
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
                
                // Carregar scripts do sidebar separadamente
                if (componentId === 'sidebar-container') {
                    this.loadSidebarScript();
                }
            }
        } catch (error) {
            console.error(`Error loading component ${componentId}:`, error);
        }
    }
    
    static loadSidebarScript() {
        // Verificar se o script já foi carregado
        if (window.sidebarScriptLoaded) return;
        
        // Carregar o script do sidebar
        const script = document.createElement('script');
        script.src = 'scripts/sidebar.js';
        script.onload = () => {
            console.log('Sidebar script loaded successfully');
            window.sidebarScriptLoaded = true;
        };
        script.onerror = (e) => console.error('Error loading sidebar script:', e);
        document.head.appendChild(script);
    }
    
    static loadAllComponents() {
        // Carregar sidebar se o elemento existir
        if (document.getElementById('sidebar-container')) {
            this.loadComponent('sidebar-container', 'sidebar.html'); // Nome atualizado
        }
    }
}

// Carregar componentes quando a página estiver pronta
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        ComponentLoader.loadAllComponents();
    });
} else {
    ComponentLoader.loadAllComponents();
}