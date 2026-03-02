import type { Terminal } from "@xterm/xterm";
import { ClipboardCopy, CornerDownLeft } from "lucide-react";
import { type RefObject, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AccessoryKey } from "@/apps/terminal/components/TerminalAccessoryBar/AccessoryKey.tsx";

interface TerminalAccessoryBarProps {
  terminalRef: RefObject<Terminal | null>;
  sendInputRef: RefObject<((data: string) => void) | null>;
  ctrlActiveRef: RefObject<boolean>;
  ctrlConsumedRef: RefObject<(() => void) | null>;
  shiftActiveRef: RefObject<boolean>;
  shiftConsumedRef: RefObject<(() => void) | null>;
}

const KEYS = {
  ESC: "\x1b",
  TAB: "\t",
  RETURN: "\r",
} as const;

function arrowSequence(
  base: "A" | "B" | "C" | "D",
  shift: boolean,
  ctrl: boolean,
): string {
  const mod = 1 + (shift ? 1 : 0) + (ctrl ? 4 : 0);
  if (mod === 1) return `\x1b[${base}`;
  return `\x1b[1;${mod}${base}`;
}

export const TerminalAccessoryBar = ({
  terminalRef,
  sendInputRef,
  ctrlActiveRef,
  ctrlConsumedRef,
  shiftActiveRef,
  shiftConsumedRef,
}: TerminalAccessoryBarProps) => {
  const [ctrlActive, setCtrlActive] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    ctrlConsumedRef.current = () => setCtrlActive(false);
    return () => {
      ctrlConsumedRef.current = null;
    };
  }, [ctrlConsumedRef]);

  useEffect(() => {
    shiftConsumedRef.current = () => setShiftActive(false);
    return () => {
      shiftConsumedRef.current = null;
    };
  }, [shiftConsumedRef]);

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

  const sendTab = useCallback(() => {
    if (shiftActiveRef.current) {
      sendInput("\x1b[Z");
      shiftActiveRef.current = false;
      shiftConsumedRef.current?.();
    } else {
      sendInput(KEYS.TAB);
    }
  }, [sendInput, shiftActiveRef, shiftConsumedRef]);

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

  const handleShiftToggle = useCallback(() => {
    const next = !shiftActiveRef.current;
    shiftActiveRef.current = next;
    setShiftActive(next);
  }, [shiftActiveRef]);

  const handleCopy = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;

    let text = term.getSelection();
    if (!text) {
      term.selectAll();
      text = term.getSelection();
      term.clearSelection();
    }
    if (!text) return;

    navigator.clipboard.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Failed to copy"),
    );
  }, [terminalRef]);

  const sendArrow = useCallback(
    (base: "A" | "B" | "C" | "D") => {
      const seq = arrowSequence(
        base,
        shiftActiveRef.current,
        ctrlActiveRef.current,
      );
      sendInput(seq);
    },
    [sendInput, shiftActiveRef, ctrlActiveRef],
  );

  return (
    <>
      <div
        className="bg-background border-border fixed right-0 bottom-0 left-0 z-40 flex h-10 items-center border-t"
        style={bottomOffset > 0 ? { bottom: bottomOffset } : undefined}
      >
        {/* Scrollable keys area */}
        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1">
            <AccessoryKey
              label="Esc"
              onTap={() => sendInput(KEYS.ESC)}
              onPreventFocus={preventFocus}
            />
            <AccessoryKey
              label="Shift"
              active={shiftActive}
              onTap={handleShiftToggle}
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
              onTap={sendTab}
              onPreventFocus={preventFocus}
            />
          </div>

          <div className="bg-border mx-1 h-5 w-px shrink-0" />

          <div className="flex gap-1">
            <AccessoryKey
              label="←"
              onTap={() => sendArrow("D")}
              onPreventFocus={preventFocus}
            />
            <AccessoryKey
              label="↑"
              onTap={() => sendArrow("A")}
              onPreventFocus={preventFocus}
            />
            <AccessoryKey
              label="↓"
              onTap={() => sendArrow("B")}
              onPreventFocus={preventFocus}
            />
            <AccessoryKey
              label="→"
              onTap={() => sendArrow("C")}
              onPreventFocus={preventFocus}
            />
          </div>
        </div>

        {/* Pinned action buttons */}
        <div className="border-border flex items-center gap-1 border-l px-2">
          <AccessoryKey
            label="Copy"
            icon={ClipboardCopy}
            onTap={handleCopy}
            onPreventFocus={preventFocus}
          />
          <AccessoryKey
            label="Return"
            icon={CornerDownLeft}
            onTap={() => sendInput(KEYS.RETURN)}
            onPreventFocus={preventFocus}
          />
        </div>
      </div>
    </>
  );
};
