module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Disable some strict rules that are causing issues
    '@next/next/no-html-link-for-pages': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-img-element': 'warn',
  },
}
