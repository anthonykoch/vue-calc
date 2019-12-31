<template>
  <div class="App js-app" v-bind:style="{ opacity: appLoaded ? 1 : 0 }">
    <div class="Calculator">
      <header class="Calculator-header">
        <div class="Calculator-expressions"><span class="Calculator-expressionsOverflow"></span><span class="Calculator-expressionsList">{{ expressionList }}</span></div>
        <div class="Calculator-operands"><span class="Calculator-currentOperand" v-bind:class="{ 'has-error': error }" v-bind:style="{ 'font-size': font.size, 'font-weight': font.weight }">{{ operand }}</span></div>
      </header>
      <div class="Calculator-body">
        <div class="Calculator-buttonsContainer">
          <!-- <div v-for="button in buttons" is="calculatorbutton" v-bind:button="button">{{ button.children }}</div> -->
        </div>
          <!-- <div class="Calculator-button" v-bind:class="className"><span v-bind:class="['btest', button.icon ? button.icon : '']" v-if="button.children == null" v-text="button.text" @click.stop="emitAction($event, button)"></span><span v-for="childButton in button.children" v-bind:class="[childButton.className || ' btest ', 'btest']" v-text="childButton.text" @click.stop="emitAction($event, childButton)"></span></div> -->
        </div>
        <div class="Calculator-equals" @click.stop="$store.dispatch('showTotal', { explicit: true })">
          <div class="Calculator-equalsLine"></div>
          <div class="Calculator-equalsLine"></div>
        </div>
    </div>
  </div>
</template>

<style>
/* // */
/* // -> Design credit goes to Jaroslav Getman */
/* // -> https://dribbble.com/shots/2334270-004-Calculator */
/* // */

/* @import url('https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css') */
/* @import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,300,400italic,600,700,900,200') */

/* @import 'bourbon' */

html {
  --foreground--dark: #151515;

  --background-gradient-1: #B6B2AB;
  --background-gradient-2: #B3AFA7;

  --background-gradient-3: #B8B5AF;
  --background-gradient-4: #78736B;

  --background-gradient-5: #6F6862;
  --background-gradient-6: #58504B;

  --background-gradient-7: #5F574E;
  --background-gradient-8: #625A51;

  /* // I don't know how to get the colors closer here, would need the actual hsla */
  --gradient-blue-1: hsla(226, 12%, 40%, 0.76);
  --gradient-blue-2: hsla(222, 12%, 13%, 0.80);

  --gradient-orange-1: #FF8D4B;
  --gradient-orange-2: #FF542E;

  --calculator-width: 260px;
  --header-padding-left: 20px;
  --something-height: 22px;
}

.meme {
		cursor: pointer;
		transition: box-shadow 0.2s, background-color 0.15s;
		text-shadow: 1px 1px 2px rgba(black, 0.15);
}

.meme:hover {
  background: rgba(black, 0.08);
}

.meme.is-active {
	box-shadow: inset 0 3px 15px 0 rgba(black, 0.3);
}

.meme.has-children:hover,
.meme.has-children:active {
  background: initial;
  box-shadow: none;
  cursor: default;
}

html {
	box-sizing: border-box;
	color: #222;
	font-size: 1rem;
	font-family: Source Sans Pro;
	line-height: 1.5;
	text-rendering: optimizeLegibility;
}

*,
*:before,
*:after {
	box-sizing: inherit;
}

body {
	background-size: cover;
  background-repeat: no-repeat;
	/* +linear-gradient(135deg, $background-gradient-1 0%, $background-gradient-2 25%, $background-gradient-3 25%, $background-gradient-4 50%, $background-gradient-5 50%, $background-gradient-6 75%, $background-gradient-7 75%, $background-gradient-8 100%) */
	min-height: 100vh;
}

.App {
	opacity: 0;
	transition: opacity 0.3s;
}

.Calculator {
	box-shadow: 12px 18px 45px 0 rgba(black, 0.25);
	cursor: default;
	margin: 0 auto;
	transform: translate(-50%, -50%);
	user-select: none;
	position: absolute;
  top: 50%;
  right: 50%;
  /* , 50% null null 50%) */
	width: var(--calculator-width);
}

.Calculator-header {
	background: white;
	overflow: hidden;
	padding: 20px var(--header-padding-left);
	position: relative;
	text-align: right;
}


.Calculator-expressions {
  /* color: adjust-color($gradient-blue-1, $saturation: -20, $lightness: 22); */
  display: block;
  float: right;
  font-size: 15px;
  line-height: var(--something-height);
  min-height: var(--something-height);
  position: relative;
  white-space: nowrap;
  width: 100%;
  word-wrap: normal;
}

.Calculator-expressionsList {
  display: block;
  float: right;
}

/* // 	Not sure how to represent that there are more expressions to the left */
.Calculator__expressionsOverflow {
  /* $width: 2px */
  color: #333;
  box-shadow: 5px 0 20px 4px rgba(black, 0.3);
  font-weight: 700;
  opacity: 0;
  padding-right: 0px;
  text-align: center;
  transition: opacity 0.5s;
  transform: translate(0, -50%);
  /* +position(absolute, 50% null null negative($header-padding-left) - $width - 2) */
  /* +size($width $height - 5) */
}

.Calculator__expressionsOverflow:before {
  content: '';
}

.Calculator__expressionsOverflow.is-showing {
  opacity: 1
}

.Calculator-operands {
	color: var(--foreground--dark);
	font-size: 60px;
	font-weight: 200;
	line-height: 1.1;
	clear: both;
}

.Calculator-currentOperand {
	display: block;
	overflow: visible;
	min-height: 60px;
	line-height: 60px;
	float: right;
	transition-duration: 0.2s;
	transition-property: font-size;
}

.Calculator-currentOperand.has-error {
  color: hsla(10,85%,57%,1);
}

.Calculator-body {
	background: white;
}

.Calculator-buttonsContainer {
	display: flex;
	flex-wrap: wrap;
	overflow: visible;
	position: relative;
}

.Calculator-buttonsContainer:before {
  /* +linear-gradient(top, darken($gradient-blue-1, 0), darken($gradient-blue-2, 0)) */
  box-shadow: 17px 27px 72px 1px rgba(black, 0.3);
  filter: drop-shadow(0px 0px 7px rgba(black, 0.2));
  content: '';
  /* +position(absolute, 0 -18px 0 -18px) */
}

.Calculator-button {
	color: rgba(white, 0.8);
	cursor: pointer;
	font-size: 24px;
	font-weight: 300;
	flex: 25%;
	line-height: 70px;
	text-align: center;
	position: relative;
	z-index: 1;
	/* +calcbutton; */
}

.Calculator-button > span {
  display: block;
}

.Calculator-button--negation,
.Calculator-button--modulo {
	font-size: 18px;
}

.Calculator-button--square {
	font-size: 16px;
}

.Calculator-button--division {
	font-size: 20px;
}

.Calculator-button--multiplication {
	font-size: 30px;
}

.Calculator-button--addition {
	font-size: 26px;
}

.Calculator-button--subtraction {
	font-size: 25px;
}

.Calculator-button--paren {
	display: flex;
	font-size: 18px;
}

.Calculator-button--paren:hover,
.Calculator-button--paren:active {
  background: initial !important;
  box-shadow: none !important;
  cursor: default !important;
}

.Calculator-button--paren > span {
  flex: 50%
  /* +calcbutton */
}

.Calculator-equals {
	/* +linear-gradient(left, $gradient-orange-1, $gradient-orange-2) */
  background-image: linear-gradient(to right,#FF8D4B, #FF542E);
	cursor: pointer;
	padding: 26px 0;
	position: relative;
	z-index: -1;
}

.Calculator-equalsLine {
	background: white;
	display: block;
	margin: 0 auto 6px;
	box-shadow: 0px 0px 2px rgba(black, 0.4);
	width: 20px;
  height: 1px;
}

.Calculator-equalsLine:last-child {
	margin-bottom: 0;
}

</style>
