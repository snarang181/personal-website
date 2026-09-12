// Shiki theme built from the site's design tokens, so highlighted code in blog
// posts uses the same palette as the lowering card on the homepage.
export const tiledDark = {
  name: 'tiled-dark',
  type: 'dark',
  colors: {
    'editor.background': '#0d0f13',
    'editor.foreground': '#a8b0be',
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5d6675', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new'], settings: { foreground: '#b79cf0' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'entity.name.tag'], settings: { foreground: '#7fa8d9' } },
    { scope: ['entity.name.type', 'support.type', 'support.class', 'entity.name.class', 'storage.type.primitive'], settings: { foreground: '#8fd0a0' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character', 'support.constant'], settings: { foreground: '#e3b778' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: '#e3b778' } },
    { scope: ['variable', 'variable.other', 'meta.definition.variable'], settings: { foreground: '#e9ecf1' } },
    { scope: ['variable.parameter'], settings: { foreground: '#a8b0be' } },
    { scope: ['keyword.operator', 'punctuation'], settings: { foreground: '#767f8e' } },
    { scope: ['entity.name.label', 'meta.preprocessor', 'keyword.control.directive'], settings: { foreground: '#ff9e5e' } },
  ],
};
