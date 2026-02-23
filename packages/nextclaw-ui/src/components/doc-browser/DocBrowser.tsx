import { useState, useRef, useCallback, useEffect } from 'react';
import { DOCS_DEFAULT_BASE_URL, useDocBrowser } from './DocBrowserContext';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    ArrowRight,
    X,
    ExternalLink,
    PanelRightOpen,
    Maximize2,
    GripVertical,
    Search,
    BookOpen,
} from 'lucide-react';

/**
 * DocBrowser — An in-app micro-browser for documentation.
 * 
 * Supports two modes:
 * - `docked`: Renders as a right sidebar panel
 * - `floating`: Renders as a draggable, resizable overlay
 */
export function DocBrowser() {
    const {
        isOpen, mode, currentUrl,
        close, toggleMode,
        goBack, goForward, canGoBack, canGoForward,
        navigate,
    } = useDocBrowser();

    const [urlInput, setUrlInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [floatPos, setFloatPos] = useState({ x: 120, y: 80 });
    const [floatSize, setFloatSize] = useState({ w: 480, h: 600 });
    const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
    const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

    // Sync URL input with current URL
    useEffect(() => {
        try {
            const parsed = new URL(currentUrl);
            setUrlInput(parsed.pathname);
        } catch {
            setUrlInput(currentUrl);
        }
    }, [currentUrl]);

    const handleUrlSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const input = urlInput.trim();
        if (!input) return;
        // If it's a path, prepend the docs base URL
        if (input.startsWith('/')) {
            navigate(`${DOCS_DEFAULT_BASE_URL}${input}`);
        } else if (input.startsWith('http')) {
            navigate(input);
        } else {
            navigate(`${DOCS_DEFAULT_BASE_URL}/${input}`);
        }
    }, [urlInput, navigate]);

    // --- Dragging logic (floating mode) ---
    const onDragStart = useCallback((e: React.MouseEvent) => {
        if (mode !== 'floating') return;
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: floatPos.x,
            startPosY: floatPos.y,
        };
    }, [mode, floatPos]);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            setFloatPos({
                x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
                y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
            });
        };
        const onUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging]);

    // --- Resize logic (floating mode) ---
    const onResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizeRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startW: floatSize.w,
            startH: floatSize.h,
        };
        const onMove = (ev: MouseEvent) => {
            if (!resizeRef.current) return;
            setFloatSize({
                w: Math.max(360, resizeRef.current.startW + (ev.clientX - resizeRef.current.startX)),
                h: Math.max(400, resizeRef.current.startH + (ev.clientY - resizeRef.current.startY)),
            });
        };
        const onUp = () => {
            resizeRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [floatSize]);

    if (!isOpen) return null;

    const isDocked = mode === 'docked';

    const panel = (
        <div
            className={cn(
                'flex flex-col bg-white overflow-hidden',
                isDocked
                    ? 'h-full w-[420px] border-l border-gray-200 shrink-0'
                    : 'rounded-2xl shadow-2xl border border-gray-200',
            )}
            style={
                !isDocked
                    ? {
                        position: 'fixed',
                        left: floatPos.x,
                        top: floatPos.y,
                        width: floatSize.w,
                        height: floatSize.h,
                        zIndex: 9999,
                    }
                    : undefined
            }
        >
            {/* Title Bar */}
            <div
                className={cn(
                    'flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 shrink-0 select-none',
                    !isDocked && 'cursor-grab active:cursor-grabbing',
                )}
                onMouseDown={!isDocked ? onDragStart : undefined}
            >
                <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-gray-900">帮助文档</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleMode}
                        className="hover:bg-gray-200 rounded-md p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        title={isDocked ? '悬浮窗口' : '固定到侧栏'}
                    >
                        {isDocked ? <Maximize2 className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        onClick={close}
                        className="hover:bg-gray-200 rounded-md p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        title="关闭"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Navigation Bar */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white border-b border-gray-100 shrink-0">
                <button
                    onClick={goBack}
                    disabled={!canGoBack}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={goForward}
                    disabled={!canGoForward}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
                >
                    <ArrowRight className="w-4 h-4" />
                </button>

                <form onSubmit={handleUrlSubmit} className="flex-1 relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="搜索，也可以输入文档地址直接打开"
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors placeholder:text-gray-400"
                    />
                </form>
            </div>

            {/* Iframe Content */}
            <div className="flex-1 relative overflow-hidden">
                <iframe
                    src={currentUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    title="NextClaw Documentation"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    allow="clipboard-read; clipboard-write"
                />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200 shrink-0">
                <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                >
                    文档中心打开
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Resize Handle (floating only) */}
            {!isDocked && (
                <div
                    className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
                    onMouseDown={onResizeStart}
                >
                    <GripVertical className="w-3 h-3 rotate-[-45deg]" />
                </div>
            )}
        </div>
    );

    return panel;
}
