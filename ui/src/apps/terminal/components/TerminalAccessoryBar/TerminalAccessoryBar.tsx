import { type RefObject, useCallback, useEffect, useState } from "react";

import { AccessoryKey } from "@/apps/terminal/components/TerminalAccessoryBar/AccessoryKey.tsx";

interface TerminalAccessoryBarProps {
  sendInputRef: RefObject<((data: string) => void) | null>;
  ctrlActiveRef: RefObject<boolean>;
  ctrlConsumedRef: RefObject<(() => void) | null>;
}

const KEYS = {
  ESC: "\x1b",
  TAB: "\t",
  ARROW_UP: "\x1b[A",
  ARROW_DOWN: "\x1b[B",
  ARROW_RIGHT: "\x1b[C",
  ARROW_LEFT: "\x1b[D",
} as const;

export const TerminalAccessoryBar = ({
  sendInputRef,
  ctrlActiveRef,
  ctrlConsumedRef,
}: TerminalAccessoryBarProps) => {
  const [ctrlActive, setCtrlActive] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    ctrlConsumedRef.current = () => setCtrlActive(false);
    return () => {
      ctrlConsumedRef.current = null;
    };
  }, [ctrlConsumedRef]);

  // Track visual viewport to stay above the iOS keyboard
  useEffect(() => {
    const update = () => {
      if (!window.visualViewport) return;
      const offset =
        window.innerHeight -
        (window.visualViewport.offsetTop + window.visualViewport.height);
      setBottomOffset(offset);
    };
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  const sendInput = useCallback(
    (data: string) => {
      sendInputRef.current?.(data);
    },
    [sendInputRef],
  );

  const preventFocus = useCallback(
    (e: React.PointerEvent | React.TouchEvent) => {
      e.preventDefault();
    },
    [],
  );

  const handleCtrlToggle = useCallback(() => {
    const next = !ctrlActiveRef.current;
    ctrlActiveRef.current = next;
    setCtrlActive(next);
  }, [ctrlActiveRef]);

  return (
    <div
      className="bg-background border-border fixed right-0 bottom-0 left-0 z-40 flex h-10 items-center gap-1 border-t px-2"
      style={bottomOffset > 0 ? { bottom: bottomOffset } : undefined}
    >
      <div className="flex gap-1">
        <AccessoryKey
          label="Esc"
          onTap={() => sendInput(KEYS.ESC)}
          onPreventFocus={preventFocus}
        />
        <AccessoryKey
          label="Ctrl"
          active={ctrlActive}
          onTap={handleCtrlToggle}
          onPreventFocus={preventFocus}
        />
        <AccessoryKey
          label="Tab"
          onTap={() => sendInput(KEYS.TAB)}
          onPreventFocus={preventFocus}
        />
      </div>

      <div className="bg-border mx-1 h-5 w-px" />

      <div className="flex gap-1">
        <AccessoryKey
          label="←"
          onTap={() => sendInput(KEYS.ARROW_LEFT)}
          onPreventFocus={preventFocus}
        />
        <AccessoryKey
          label="↑"
          onTap={() => sendInput(KEYS.ARROW_UP)}
          onPreventFocus={preventFocus}
        />
        <AccessoryKey
          label="↓"
          onTap={() => sendInput(KEYS.ARROW_DOWN)}
          onPreventFocus={preventFocus}
        />
        <AccessoryKey
          label="→"
          onTap={() => sendInput(KEYS.ARROW_RIGHT)}
          onPreventFocus={preventFocus}
        />
      </div>
    </div>
  );
};
