/**
 * Theme Context for Dark/Light Mode
 */
import React from 'react';
interface ThemeContextType {
    isDarkMode: boolean;
    toggleTheme: () => void;
}
export declare const ThemeProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useTheme: () => ThemeContextType;
export {};
//# sourceMappingURL=ThemeContext.d.ts.map