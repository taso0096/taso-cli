<template>
  <div class="cmd-result">
    <span
      v-if="result.type === 'text'"
      class="cmd-line__data"
    >{{ result.data }}</span>
  </div>
</template>

<style lang="scss" scoped>
.cmd-result {
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
  .cmd-line__data {
    word-break: break-word;
    white-space: pre-line;
  }
}
</style>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CmdResult',
  props: {
    result: {
      type: Object
    }
  }
});
</script>
