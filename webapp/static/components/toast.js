let toastContainer = null;

function ensureToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:420px;';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

function showToast(message, type = 'success', duration = 4000) {
    ensureToastContainer();

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
    };

    const bgColors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1',
    };

    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.style.cssText = `
        display:flex;align-items:center;gap:12px;padding:14px 20px;
        background:${bgColors[type] || bgColors.info};color:white;
        border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.15),0 8px 10px -6px rgba(0,0,0,0.1);
        font-family:inherit;font-size:14px;font-weight:500;line-height:1.4;
        transform:translateX(120%);opacity:0;
        transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
        max-width:100%;cursor:pointer;
    `;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" aria-hidden="true" style="font-size:18px;flex-shrink:0;"></i><span>${message}</span>`;
    toast.addEventListener('click', () => dismissToast(toast));
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });

    if (duration > 0) {
        setTimeout(() => dismissToast(toast), duration);
    }
}

function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 350);
}
