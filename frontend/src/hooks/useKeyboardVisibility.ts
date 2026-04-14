import { useEffect, useState } from "react";

const KEYBOARD_HEIGHT_THRESHOLD = 140;

function detectKeyboardOpen() {
  if (typeof window === "undefined" || !window.visualViewport) {
    return false;
  }

  const viewport = window.visualViewport;
  const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop;
  return keyboardHeight > KEYBOARD_HEIGHT_THRESHOLD;
}

export function useKeyboardVisibility() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const update = () => {
      setKeyboardVisible(detectKeyboardOpen());
    };

    update();

    window.visualViewport.addEventListener("resize", update);
    window.visualViewport.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return keyboardVisible;
}
