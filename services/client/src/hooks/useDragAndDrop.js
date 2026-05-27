import { useCallback, useState } from 'react';

export function useDragAndDrop(onDropFiles) {
    const [dragDepth, setDragDepth] = useState(0);

    const onDragEnter = useCallback((e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragDepth((d) => d + 1);
    }, []);

    const onDragLeave = useCallback(() => {
        setDragDepth((d) => Math.max(0, d - 1));
    }, []);

    const onDragOver = useCallback((e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
    }, []);

    const onDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDragDepth(0);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) onDropFiles(files);
        },
        [onDropFiles]
    );

    return {
        isDragging: dragDepth > 0,
        dragHandlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
    };
}