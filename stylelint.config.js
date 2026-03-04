/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-standard'
  ],
  rules: {
    // Naming conventions
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      {
        message: 'Expected class selector to be kebab-case'
      }
    ],
    'custom-property-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      {
        message: 'Expected custom property to be kebab-case'
      }
    ],

    // Value constraints
    'color-no-hex': null, // Allow hex colors
    'color-named': 'never',
    'length-zero-no-unit': true,
    'number-max-precision': 4,

    // Font handling
    'font-family-name-quotes': 'always-where-recommended',
    'font-weight-notation': 'numeric',

    // Selector constraints
    'selector-max-id': 1,
    'selector-max-compound-selectors': 4,
    'selector-no-qualifying-type': [
      true,
      {
        ignore: ['attribute', 'class']
      }
    ],

    // Property order (alphabetical by default)
    'order/properties-alphabetical-order': null,

    // Avoid duplicates
    'declaration-block-no-duplicate-properties': [
      true,
      {
        ignore: ['consecutive-duplicates-with-different-values']
      }
    ],

    // Allow empty blocks for placeholder styles
    'block-no-empty': null,

    // Allow !important for utility classes
    'declaration-no-important': null,

    // Enforce consistent units
    'unit-allowed-list': [
      'px', 'em', 'rem', '%', 'vh', 'vw', 'vmin', 'vmax',
      'deg', 'rad', 'ms', 's', 'fr'
    ],

    // Vendor prefixes (handled by autoprefixer, so disallow manual ones)
    'property-no-vendor-prefix': true,
    'value-no-vendor-prefix': true,

    // Modern CSS features
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'config']
      }
    ],

    // Import rules
    'import-notation': 'url',

    // Comment rules
    'comment-empty-line-before': [
      'always',
      {
        except: ['first-nested'],
        ignore: ['stylelint-commands']
      }
    ],

    // Shorthand preferences
    'declaration-block-no-redundant-longhand-properties': [
      true,
      {
        ignoreShorthands: ['grid-template']
      }
    ],

    // Alpha values
    'alpha-value-notation': 'number',
    'hue-degree-notation': 'angle',

    // Modern color functions
    'color-function-notation': 'modern',

    // Indentation (match project style)
    'indentation': 2,

    // Max line length
    'max-line-length': [
      120,
      {
        ignore: ['comments'],
        ignorePattern: ['/^@import\\s+/', '/https?:\\/\\//']
      }
    ]
  },
  overrides: [
    {
      files: ['**/*.css'],
      customSyntax: null
    }
  ],
  ignoreFiles: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '*.min.css'
  ]
};
