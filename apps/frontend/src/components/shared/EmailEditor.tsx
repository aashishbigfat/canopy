"use client";

import { useState, useRef, useEffect } from "react";
import { 
    Bold, 
    Italic, 
    Underline, 
    Strikethrough, 
    Type, 
    List, 
    ListOrdered, 
    Link2, 
    Image as ImageIcon,
    Undo2,
    Redo2,
    Minus,
    X,
    Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmailEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function EmailEditor({ value, onChange, placeholder }: EmailEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || "";
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="border rounded-md bg-white overflow-hidden flex flex-col min-h-[300px]">
            {/* Toolbar - Inspired by the screenshot */}
            <div className="flex flex-wrap items-center gap-0.5 p-1 border-b bg-slate-50/50">
                <ToolbarButton icon={<Undo2 className="h-4 w-4" />} onClick={() => execCommand("undo")} title="Undo" />
                <ToolbarButton icon={<Redo2 className="h-4 w-4" />} onClick={() => execCommand("redo")} title="Redo" />
                <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                <ToolbarButton icon={<Bold className="h-4 w-4" />} onClick={() => execCommand("bold")} title="Bold" />
                <ToolbarButton icon={<Italic className="h-4 w-4" />} onClick={() => execCommand("italic")} title="Italic" />
                <ToolbarButton icon={<Underline className="h-4 w-4" />} onClick={() => execCommand("underline")} title="Underline" />
                <ToolbarButton icon={<Strikethrough className="h-4 w-4" />} onClick={() => execCommand("strikeThrough")} title="Strikethrough" />
                <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                <ToolbarButton icon={<Code className="h-4 w-4" />} onClick={() => execCommand("formatBlock", "PRE")} title="Code" />
                <ToolbarButton icon={<Type className="h-4 w-4" />} onClick={() => execCommand("fontSize", "3")} title="Text Size" />
                <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                <ToolbarButton icon={<List className="h-4 w-4" />} onClick={() => execCommand("insertUnorderedList")} title="Bullet List" />
                <ToolbarButton icon={<ListOrdered className="h-4 w-4" />} onClick={() => execCommand("insertOrderedList")} title="Numbered List" />
                <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                <ToolbarButton icon={<Link2 className="h-4 w-4" />} onClick={() => {
                    const url = prompt("Enter link URL:");
                    if (url) execCommand("createLink", url);
                }} title="Link" />
                <ToolbarButton icon={<ImageIcon className="h-4 w-4" />} onClick={() => {
                    const url = prompt("Enter image URL:");
                    if (url) execCommand("insertImage", url);
                }} title="Image" />
                <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                <ToolbarButton icon={<Minus className="h-4 w-4" />} onClick={() => execCommand("insertHorizontalRule")} title="Horizontal Rule" />
                <ToolbarButton icon={<X className="h-4 w-4" />} onClick={() => execCommand("removeFormat")} title="Clear Formatting" />
            </div>

            {/* Content Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="flex-1 p-4 outline-none text-sm min-h-[250px] prose prose-sm max-w-none relative"
            />
            {!value && editorRef.current?.innerHTML === "" && (
                <div className="absolute top-[85px] left-4 text-slate-400 text-sm pointer-events-none">
                    {placeholder}
                </div>
            )}
        </div>
    );
}

function ToolbarButton({ 
    icon, 
    onClick, 
    title, 
    active 
}: { 
    icon: React.ReactNode; 
    onClick: () => void; 
    title: string;
    active?: boolean;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
                "h-7 w-7 rounded-sm hover:bg-slate-200",
                active && "bg-blue-50 text-blue-600"
            )}
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={title}
        >
            {icon}
        </Button>
    );
}
