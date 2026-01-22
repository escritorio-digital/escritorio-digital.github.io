import React from 'react';

type WidgetToolbarContextValue = {
    setToolbarContent: (content: React.ReactNode | null) => void;
};

const WidgetToolbarContext = React.createContext<WidgetToolbarContextValue | null>(null);

export const WidgetToolbarProvider: React.FC<{
    onChange: (content: React.ReactNode | null) => void;
    children: React.ReactNode;
}> = ({ onChange, children }) => {
    const setToolbarContent = React.useCallback(
        (content: React.ReactNode | null) => {
            onChange(content ?? null);
        },
        [onChange]
    );

    const value = React.useMemo(() => ({ setToolbarContent }), [setToolbarContent]);

    return (
        <WidgetToolbarContext.Provider value={value}>
            {children}
        </WidgetToolbarContext.Provider>
    );
};

export const WidgetToolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const context = React.useContext(WidgetToolbarContext);

    React.useEffect(() => {
        if (!context) return undefined;
        context.setToolbarContent(children);
        return () => {
            context.setToolbarContent(null);
        };
    }, [children, context]);

    return null;
};
