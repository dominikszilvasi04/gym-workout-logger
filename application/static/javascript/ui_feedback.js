/*
 * Shared UI feedback helpers (toasts + confirmation modal).
 */
(function() {
    function ensureToastContainer() {
        var existingContainer = document.getElementById("app_toast_container");
        if (existingContainer) {
            return existingContainer;
        }
        var toastContainer = document.createElement("div");
        toastContainer.id = "app_toast_container";
        toastContainer.className = "toast-container position-fixed top-0 end-0 p-3";
        toastContainer.style.zIndex = "1200";
        document.body.appendChild(toastContainer);
        return toastContainer;
    }

    window.showAppToast = function(message, status) {
        if (!message) {
            return;
        }
        var tone = status || "info";
        var classNameByStatus = {
            success: "text-bg-success",
            danger: "text-bg-danger",
            warning: "text-bg-warning",
            info: "text-bg-primary",
        };
        var toastContainer = ensureToastContainer();
        var toastElement = document.createElement("div");
        toastElement.className = "toast align-items-center border-0 " + (classNameByStatus[tone] || classNameByStatus.info);
        toastElement.role = "alert";
        toastElement.ariaLive = "assertive";
        toastElement.ariaAtomic = "true";
        toastElement.innerHTML = [
            '<div class="d-flex">',
            '  <div class="toast-body"></div>',
            '  <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>',
            '</div>'
        ].join("");
        toastElement.querySelector(".toast-body").textContent = message;
        toastContainer.appendChild(toastElement);

        if (window.bootstrap && window.bootstrap.Toast) {
            var toastInstance = new window.bootstrap.Toast(toastElement, { delay: 3500 });
            toastInstance.show();
            toastElement.addEventListener("hidden.bs.toast", function() {
                toastElement.remove();
            }, { once: true });
            return;
        }
        setTimeout(function() {
            toastElement.remove();
        }, 3500);
    };

    window.showConfirmationModal = function(options) {
        var modalOptions = options || {};
        var titleText = modalOptions.title || "Confirm action";
        var bodyText = modalOptions.message || "Are you sure you want to continue?";
        var confirmLabel = modalOptions.confirmLabel || "Confirm";
        var cancelLabel = modalOptions.cancelLabel || "Cancel";
        var confirmClass = modalOptions.confirmClass || "btn-danger";

        if (!(window.bootstrap && window.bootstrap.Modal)) {
            return Promise.resolve(window.confirm(bodyText));
        }

        var modalElement = document.getElementById("app_confirmation_modal");
        if (!modalElement) {
            modalElement = document.createElement("div");
            modalElement.id = "app_confirmation_modal";
            modalElement.className = "modal fade";
            modalElement.tabIndex = -1;
            modalElement.setAttribute("aria-hidden", "true");
            modalElement.innerHTML = [
                '<div class="modal-dialog modal-dialog-centered">',
                '  <div class="modal-content">',
                '    <div class="modal-header">',
                '      <h5 class="modal-title"></h5>',
                '      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>',
                '    </div>',
                '    <div class="modal-body"><p class="mb-0"></p></div>',
                '    <div class="modal-footer">',
                '      <button type="button" class="btn btn-outline-secondary" data-role="cancel"></button>',
                '      <button type="button" class="btn" data-role="confirm"></button>',
                '    </div>',
                '  </div>',
                '</div>'
            ].join("");
            document.body.appendChild(modalElement);
        }

        modalElement.querySelector(".modal-title").textContent = titleText;
        modalElement.querySelector(".modal-body p").textContent = bodyText;
        var cancelButton = modalElement.querySelector('[data-role="cancel"]');
        var confirmButton = modalElement.querySelector('[data-role="confirm"]');
        cancelButton.textContent = cancelLabel;
        confirmButton.textContent = confirmLabel;
        confirmButton.className = "btn " + confirmClass;

        return new Promise(function(resolve) {
            var modalInstance = new window.bootstrap.Modal(modalElement, { backdrop: "static" });
            var resolved = false;

            function cleanupAndResolve(result) {
                if (resolved) {
                    return;
                }
                resolved = true;
                cancelButton.removeEventListener("click", onCancel);
                confirmButton.removeEventListener("click", onConfirm);
                modalElement.removeEventListener("hidden.bs.modal", onHidden);
                resolve(result);
            }

            function onCancel() {
                cleanupAndResolve(false);
                modalInstance.hide();
            }

            function onConfirm() {
                cleanupAndResolve(true);
                modalInstance.hide();
            }

            function onHidden() {
                cleanupAndResolve(false);
            }

            cancelButton.addEventListener("click", onCancel);
            confirmButton.addEventListener("click", onConfirm);
            modalElement.addEventListener("hidden.bs.modal", onHidden);
            modalInstance.show();
        });
    };
})();
