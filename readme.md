# Calculator

Basically this as a component https://codepen.io/anthonykoch/pen/xVQOwb

This isn't on NPM for a reason, it's a calculator I built very early on in my programming career. It's likely broken in some area, but someone asked to make it a standalone component, so here it is.

## Font

The font used default font is Source Sans Pro, but you have to include it yourself. If I remember correctly, overriding styles would be something like this (in a non-scoped style tag):

```
<template>
  <div class="wrapper">
    <vue-calc></vue-calc>
  </div>
</template>
<style scoped>
  .main {
    color: red;
  }
</style>
<style>
.wrapper .Calculator {
  font-family: 'your-preferred-font';
}
</style>
```


## Polyfills

Uses:

- Object.assign


## Props

These props are experimental and will probably break.

- **default-formula**

Type: `Array`

Example:

`:default-formula="['23', '+', '2']"`


- **default-operand**

Type: `String|Number`
Example:

`:default-operand="147"`


## Events

#### backspace

When the user backspaces.

#### clear

When the user clears the formula.

#### clear-entry

When the user presses clear entry.

#### negate

When the user presses the negate operand button.

#### operator-update

When an operator is updated or added.

#### operand-append

When an operand is added.

#### paren-add

When a paren is added.

#### update:total-explicit

When the total button is explicitly pressed by the user.

#### update:total

When the total is done implicitly, which is caused by the user inputting an operator after a binary expression.

#### formula-error

When the total is implicitly or explicitly done, and the formula results in an error

#### key

When a key is pressed. The $event will be have a key property of which key was pressed. See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key


`@key="onKeyDown($event)"`

```
onKeyDown({ key ) {
  if (key === '*') {
    console.log('twas multiplication')
  }
},
```

## Building

For some reason, it only builds properly through unix based terminals

```
npm run build
```

## Running locally

*note*: Need vue cli installed to run

```
vue serve src/calculator.vue
```

## Running tests

```
npx cypress run --spec cypress/*.spec.js

# or through the UI
npx cypress open
```

