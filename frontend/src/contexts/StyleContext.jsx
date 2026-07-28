import { createContext, useContext, useState, useCallback } from 'react';

const DEFAULT_STYLE = {
  fontFamily: 'Arial',
  fontUrl: null,
  fontSize: 48,
  fontColor: '#FFFFFF',
  fontBold: false,
  fontItalic: false,
  backgroundType: 'semi-transparent',
  backgroundColor: '#000000',
  animationStyle: 'word-highlight',
  position: 'bottom',
  customPosition: { x: 50, y: 50 },
};

const StyleContext = createContext(null);

export function StyleProvider({ children }) {
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const updateStyle = useCallback((key, value) => {
    setStyle(prev => ({ ...prev, [key]: value }));
    setActiveTemplate(null);
  }, []);

  const updateStyles = useCallback((newStyles) => {
    setStyle(prev => ({ ...prev, ...newStyles }));
    setActiveTemplate(null);
  }, []);

  const resetStyle = useCallback(() => {
    setStyle(DEFAULT_STYLE);
    setActiveTemplate(null);
  }, []);

  const applyTemplate = useCallback((template) => {
    if (template.style) {
      setStyle(prev => ({
        ...prev,
        ...template.style,
        fontFamily: template.style.font_family || prev.fontFamily,
        fontSize: template.style.font_size || prev.fontSize,
        fontColor: template.style.font_color || prev.fontColor,
        fontBold: template.style.font_bold ?? prev.fontBold,
        fontItalic: template.style.font_italic ?? prev.fontItalic,
        backgroundType: template.style.background_type || prev.backgroundType,
        backgroundColor: template.style.background_color || prev.backgroundColor,
        animationStyle: template.style.animation_style || prev.animationStyle,
        position: template.style.position || prev.position,
      }));
      setActiveTemplate(template.name);
    }
  }, []);

  const getStylePayload = useCallback(() => ({
    font_family: style.fontFamily,
    font_url: style.fontUrl,
    font_size: style.fontSize,
    font_color: style.fontColor,
    font_bold: style.fontBold,
    font_italic: style.fontItalic,
    background_type: style.backgroundType,
    background_color: style.backgroundColor,
    animation_style: style.animationStyle,
    position: style.position,
    custom_position_x: style.customPosition.x,
    custom_position_y: style.customPosition.y,
  }), [style]);

  return (
    <StyleContext.Provider value={{
      style,
      activeTemplate,
      updateStyle,
      updateStyles,
      resetStyle,
      applyTemplate,
      getStylePayload,
    }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle() {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error('useStyle must be used within StyleProvider');
  return ctx;
}
