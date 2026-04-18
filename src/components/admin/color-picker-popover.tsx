"use client";

import { useState, useCallback, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPickerPopover({ color, onChange }: ColorPickerPopoverProps) {
  const [localHex, setLocalHex] = useState(color.replace("#", ""));

  useEffect(() => {
    setLocalHex(color.replace("#", ""));
  }, [color]);

  const handleHexInput = useCallback(
    (value: string) => {
      const clean = value.replace("#", "").slice(0, 6);
      setLocalHex(clean);
      if (/^[0-9a-fA-F]{6}$/.test(clean)) {
        onChange(`#${clean}`);
      }
    },
    [onChange]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="size-9 shrink-0 rounded-lg border border-zinc-700 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-zinc-600"
        style={{ backgroundColor: color }}
      />
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[232px] border-zinc-700 bg-zinc-900 p-0 shadow-xl"
      >
        {/* Canvas + Hue slider */}
        <div className="p-2 pb-0 [&_.react-colorful]:!h-[160px] [&_.react-colorful]:!w-full [&_.react-colorful]:rounded-lg [&_.react-colorful\_\_saturation]:!rounded-t-lg [&_.react-colorful\_\_hue]:!rounded-b-lg [&_.react-colorful\_\_pointer]:!h-4 [&_.react-colorful\_\_pointer]:!w-4">
          <HexColorPicker color={color} onChange={onChange} />
        </div>

        {/* Hex input row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="text-[11px] font-medium text-zinc-500">Hex</span>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">#</span>
            <Input
              value={localHex}
              onChange={(e) => handleHexInput(e.target.value)}
              className="h-8 pl-6 font-mono text-xs uppercase"
              maxLength={7}
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
