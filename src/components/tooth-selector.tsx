
'use client';

import React, { useState, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ToothProps {
  number: number;
  isSelected: boolean;
  onClick: (number: number) => void;
}

const Tooth: React.FC<ToothProps> = ({ number, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(number)}
    className={cn(
      'h-10 w-10 rounded-full border flex items-center justify-center transition-colors flex-shrink-0',
      isSelected
        ? 'bg-primary text-primary-foreground'
        : 'bg-card hover:bg-accent'
    )}
  >
    {number}
  </button>
);

// FDI World Dental Federation notation
const upperRightQuadrant = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeftQuadrant = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerLeftQuadrant = [31, 32, 33, 34, 35, 36, 37, 38];
const lowerRightQuadrant = [48, 47, 46, 45, 44, 43, 42, 41];


interface ToothSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ToothSelector = forwardRef<HTMLInputElement, ToothSelectorProps>(({ value, onChange }, ref) => {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setSelectedTeeth(value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)));
    } else {
      setSelectedTeeth([]);
    }
  }, [value]);

  const handleToothClick = (toothNumber: number) => {
    const newSelectedTeeth = selectedTeeth.includes(toothNumber)
      ? selectedTeeth.filter(n => n !== toothNumber)
      : [...selectedTeeth, toothNumber];
    
    newSelectedTeeth.sort((a,b) => a-b);
    setSelectedTeeth(newSelectedTeeth);
    onChange(newSelectedTeeth.join(', '));
  };
  
  const handleClear = () => {
    setSelectedTeeth([]);
    onChange('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={ref}
          placeholder="Select tooth/teeth"
          value={value}
          readOnly
          className="cursor-pointer"
        />
      </PopoverTrigger>
      <PopoverContent className="w-[380px] sm:w-[710px] p-4">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="space-y-4 inline-block">
                <div className="flex justify-between gap-2">
                    <div className="flex gap-1">{upperRightQuadrant.map(num => <Tooth key={num} number={num} isSelected={selectedTeeth.includes(num)} onClick={handleToothClick} />)}</div>
                    <div className="flex gap-1">{upperLeftQuadrant.map(num => <Tooth key={num} number={num} isSelected={selectedTeeth.includes(num)} onClick={handleToothClick} />)}</div>
                </div>
                <div className="flex justify-between gap-2">
                    <div className="flex gap-1">{lowerRightQuadrant.map(num => <Tooth key={num} number={num} isSelected={selectedTeeth.includes(num)} onClick={handleToothClick} />)}</div>
                    <div className="flex gap-1">{lowerLeftQuadrant.map(num => <Tooth key={num} number={num} isSelected={selectedTeeth.includes(num)} onClick={handleToothClick} />)}</div>
                </div>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
            <Button size="sm" onClick={() => setIsOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

ToothSelector.displayName = "ToothSelector";

export default ToothSelector;
