<template>
  <div class="cmd-line">
    <span class="cmd-line__prompt">
      <span>taso-cli</span>
      <span>$</span>
    </span>
    <span
      v-if="inputResolve"
      ref="inputRef"
      @keydown.enter.prevent="submitCmd"
      contenteditable
      class="cmd-line__input"
    ></span>
    <span
      v-else
      class="cmd-line__cmd"
    >{{ cmd }}</span>
  </div>
</template>

<style lang="scss" scoped>
.cmd-line {
  padding: 1px 6px;
  line-height: 1.5;
  font-size: 16px;
  font-family: 'Courier Prime', sans-serif;

  ::selection {
    background: #fce300 !important;
  }
  span {
    vertical-align: middle;
  }
  .cmd-line__prompt {
    margin-right: 4px;

    span {
      margin-right: 4px;
    }
  }
  .cmd-line__input {
    display: inline-block;
    outline: none;
    word-break: break-all;
  }
  .cmd-line__cmd {
    word-break: break-all;
  }
}
</style>

<script>
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'CmdLine',
  props: {
    cmd: {
      type: String
    }
  },
  setup() {
    const inputRef = ref();
    const inputResolve = ref(null);

    const input = () => {
      return new Promise(resolve => {
        inputResolve.value = resolve;
      });
    };

    const submitCmd = () => {
      inputResolve.value(inputRef.value.innerText);
      inputRef.value.innerText = '';
      inputResolve.value = null;
    };

    return {
      inputRef,
      inputResolve,
      input,
      submitCmd
    };
  }
});
</script>
