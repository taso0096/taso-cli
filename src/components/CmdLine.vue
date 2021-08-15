<template>
  <div class="cmd-line">
    <span class="cmd-line__prompt">
      <span class="green--text">taso-cli</span>
      <span class="blue--text">:{{ cd }}</span>
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

<script lang="ts">
import { defineComponent, ref } from 'vue';

type Resolve = (value: string | PromiseLike<string>) => void;

export default defineComponent({
  name: 'CmdLine',
  props: {
    cd: {
      type: String
    },
    cmd: {
      type: String
    }
  },
  setup() {
    const inputRef = ref<HTMLSpanElement>();
    const inputResolve = ref<Resolve>();
    const inputCmd = ref<string>('');

    const input = (): Promise<string> => {
      return new Promise(resolve => {
        inputResolve.value = resolve;
      });
    };

    const syncInput = (e: InputEvent): void => {
      const input = e.target as HTMLInputElement;
      inputCmd.value = input.innerText;
    };

    const submitCmd = (): void => {
      if (!(inputRef.value && inputResolve.value)) {
        return;
      }
      inputResolve.value(inputRef.value.innerText);
      inputCmd.value = '';
      inputRef.value.innerText = '';
      inputResolve.value = undefined;
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
