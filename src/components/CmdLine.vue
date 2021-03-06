<template>
  <div class="cmd-line">
    <span class="cmd-line__prompt">
      <span class="green--text">taso-cli</span>
      <span class="purple--text">:{{ cd }}</span>
      <span>$ </span>
    </span>
    <span
      v-if="inputResolve"
      ref="inputRef"
      contenteditable
      spellcheck="false"
      class="cmd-line__input"
      :style="!inputRef?.innerText && {
        display: 'inline-block'
      }"
      @input="keyInput"
      @keydown.enter.prevent="submitCmd.text"
      @keydown.up.prevent="submitCmd.key"
      @keydown.down.prevent="submitCmd.key"
      @keydown.tab.prevent="submitCmd.key"
      @keydown.ctrl.l.prevent="submitCmd.key"
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
  white-space: pre-wrap;

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
import { CmdData } from '@/tasoCli/shell';

type Resolve = (value: CmdData | PromiseLike<CmdData>) => void;

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

    const input = (): Promise<CmdData> => {
      return new Promise(resolve => {
        inputResolve.value = resolve;
      });
    };

    const submitCmd = {
      text: (): void => {
        if (!(inputRef.value && inputResolve.value)) {
          return;
        }
        inputResolve.value({
          type: 'text',
          data: inputRef.value.innerText
        } as CmdData);
        inputRef.value.innerText = '';
        inputResolve.value = undefined;
      },
      key: (e: KeyboardEvent) => {
        if (inputResolve.value) {
          inputResolve.value({
            type: 'key',
            data: e.key
          } as CmdData);
        }
      }
    };

    const keyInput = () => {
      if (inputResolve.value) {
        inputResolve.value({
          type: 'key',
          data: 'KEY_INPUT'
        } as CmdData);
      }
    };

    return {
      inputRef,
      inputResolve,
      input,
      submitCmd,
      keyInput
    };
  }
});
</script>
