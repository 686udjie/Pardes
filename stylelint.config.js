module.exports = {
  rules: {
    // Error prevention
    "color-no-invalid-hex": true,
    "font-family-no-duplicate-names": true,
    "function-calc-no-unspaced-operator": true,
    "function-linear-gradient-no-nonstandard-direction": true,
    "string-no-newline": true,
    "unit-no-unknown": true,
    "property-no-unknown": true,
    "selector-type-no-unknown": true,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global"],
      },
    ],
    "selector-pseudo-element-no-unknown": true,

    // Maintainability
    "declaration-block-no-duplicate-properties": true,
    "declaration-block-no-shorthand-property-overrides": true,
    "keyframe-declaration-no-important": true,
    "block-no-empty": true,
    "comment-no-empty": true,
    "length-zero-no-unit": true,
    "no-empty-source": true,
    "no-invalid-double-slash-comments": true,

    // Size limits
    "max-nesting-depth": 4,
    "selector-max-compound-selectors": 5,
  },
};