<template>
  <div class="cmd-line">
    <span class="cmd-line__prompt">
      <span class="green--text">taso-cli</span>
      <span class="blue--text">:~</span>
      <span>$ </span>
    </span>
    <span
      v-if="inputResolve"
      ref="inputRef"
      @input="syncInput"
      @keydown.enter.prevent="submitCmd"
      contenteditable
      class="cmd-line__input"
      :style="!inputCmd && {
        display: 'inline-block'
      }"
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
  .cmd-line__input {
    outline: none;
    word-break: break-all;
  }
  .cmd-line__cmd {
    word-break: break-all;
  }
}
</style>

<script>
import { defineComponent, ref, computed } from 'vue';

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
    const inputCmd = ref('');

    const input = () => {
      return new Promise(resolve => {
        inputResolve.value = resolve;
      });
    };

    const syncInput = e => {
      inputCmd.value = e.target.innerText;
    };

    const submitCmd = () => {
      inputResolve.value(inputCmd.value);
      inputCmd.value = '';
      inputRef.value.innerText = '';
      inputResolve.value = null;
    };

    return {
      inputRef,
      inputResolve,
      inputCmd,
      input,
      syncInput,
      submitCmd
    };
  }
});
</script>
