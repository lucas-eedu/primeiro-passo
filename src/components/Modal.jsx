import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Modal({
  title,
  children,
  onClose,
  closeLabel = "Fechar",
  wide = false,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    dialog.querySelector("input, button, select, textarea")?.focus();
    return () => {
      dialog.close?.();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      {onClose && (
        <button
          className="icon-button close-button"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={21} />
        </button>
      )}
      {children}
    </dialog>
  );
}
