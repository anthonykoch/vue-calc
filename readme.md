# Calculator

## Polyfills

Uses:

- Object.assign


## Props

- **default-formula**

Type: `Array`

`:default-formula="['23', '+', '2']"`


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
npm test
```

